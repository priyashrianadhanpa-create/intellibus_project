import os
import json
from collections import defaultdict, deque
from typing import List, Dict, Optional, Union
import numpy as np
import joblib
import torch
import torch.nn as nn

FEATURES = ["speed_kmph", "remaining_distance_km", "elapsed_trip_min", "traffic_factor", "stops_remaining"]
WINDOW_SIZE = 10

class IntelliBusLSTM(nn.Module):
    def __init__(self, input_dim=5, hidden_dim=64, num_layers=2, dropout=0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_dim,
            hidden_size=hidden_dim,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0.0
        )
        self.fc1 = nn.Linear(hidden_dim, 32)
        self.relu = nn.ReLU()
        self.dropout = nn.Dropout(0.2)
        self.fc2 = nn.Linear(32, 1)

    def forward(self, x):
        lstm_out, _ = self.lstm(x)
        last_step = lstm_out[:, -1, :]
        h = self.relu(self.fc1(last_step))
        h = self.dropout(h)
        return self.fc2(h)

class LSTMInferencePredictor:
    def __init__(self, models_dir: Optional[str] = None):
        # Locate models dir reliably whether called from root or backend/app
        if models_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            candidate = os.path.join(base_dir, "models")
            if os.path.exists(candidate):
                models_dir = candidate
            else:
                # Check root ml/models
                root_candidate = os.path.join(os.path.dirname(base_dir), "ml", "models")
                if os.path.exists(root_candidate):
                    models_dir = root_candidate
                else:
                    models_dir = candidate

        self.models_dir = models_dir
        self.model_path = os.path.join(models_dir, "lstm_eta_model.pth")
        self.x_scaler_path = os.path.join(models_dir, "x_scaler.pkl")
        self.y_scaler_path = os.path.join(models_dir, "y_scaler.pkl")
        self.config_path = os.path.join(models_dir, "model_config.json")
        
        self.is_loaded = False
        self.model = None
        self.x_scaler = None
        self.y_scaler = None
        self.trip_buffers = defaultdict(lambda: deque(maxlen=WINDOW_SIZE))
        
        self._load_artifacts()

    def _load_artifacts(self):
        try:
            if not os.path.exists(self.model_path):
                print(f"[LSTMInferencePredictor] Notice: Model weights not found at '{self.model_path}'. Will fallback to baseline.")
                return

            self.x_scaler = joblib.load(self.x_scaler_path)
            self.y_scaler = joblib.load(self.y_scaler_path)

            self.model = IntelliBusLSTM(input_dim=len(FEATURES), hidden_dim=64, num_layers=2, dropout=0.2)
            self.model.load_state_dict(torch.load(self.model_path, map_location=torch.device("cpu")))
            self.model.eval()
            self.is_loaded = True
            print(f"[LSTMInferencePredictor] Successfully loaded IntelliBus AI LSTM weights and scalers from '{self.models_dir}'.")
        except Exception as e:
            print(f"[LSTMInferencePredictor] Warning: Error loading LSTM artifacts: {e}. Fallback enabled.")
            self.is_loaded = False

    def predict_from_sequence(self, sequence: List[Union[Dict, List, tuple]]) -> Dict:
        """
        Takes 10 sequential GPS feature points and predicts remaining arrival time in minutes.
        Each point contains: [speed_kmph, remaining_distance_km, elapsed_trip_min, traffic_factor, stops_remaining]
        """
        if not self.is_loaded or self.model is None:
            raise RuntimeError("LSTM model is not loaded. Cannot perform sequence prediction.")

        if len(sequence) != WINDOW_SIZE:
            raise ValueError(f"Sequence must contain exactly {WINDOW_SIZE} sequential points, received {len(sequence)}.")

        # Format into numpy array
        matrix = []
        for pt in sequence:
            if isinstance(pt, dict):
                row = [
                    float(pt.get("speed_kmph", pt.get("speed", 25.0))),
                    float(pt.get("remaining_distance_km", pt.get("distance_km", 5.0))),
                    float(pt.get("elapsed_trip_min", 0.0)),
                    float(pt.get("traffic_factor", 1.0)),
                    float(pt.get("stops_remaining", pt.get("stop_count_remaining", 1)))
                ]
            else:
                row = [float(v) for v in pt]
            matrix.append(row)

        arr = np.array([matrix], dtype=np.float32) # (1, 10, 5)
        N, T, F = arr.shape
        scaled_arr = self.x_scaler.transform(arr.reshape(-1, F)).reshape(N, T, F)

        with torch.no_grad():
            tensor_in = torch.tensor(scaled_arr, dtype=torch.float32)
            pred_scaled = self.model(tensor_in).numpy()
            predicted_minutes = float(self.y_scaler.inverse_transform(pred_scaled)[0, 0])

        clamped_minutes = max(0.5, round(predicted_minutes, 1))

        return {
            "eta_minutes": clamped_minutes,
            "confidence_score": 0.96,
            "ml_model_version": "v3.0-LSTM-DeepSequence",
            "sequence_window": WINDOW_SIZE
        }

    def record_and_predict(
        self,
        trip_id: Union[int, str],
        speed_kmph: float,
        remaining_distance_km: float,
        elapsed_trip_min: float,
        traffic_factor: float,
        stops_remaining: int
    ) -> Optional[Dict]:
        """
        Appends the latest live GPS observation into the trip's rolling buffer.
        Returns LSTM prediction if buffer has filled (10 points), else returns None.
        """
        point = {
            "speed_kmph": max(5.0, speed_kmph),
            "remaining_distance_km": max(0.05, remaining_distance_km),
            "elapsed_trip_min": max(0.0, elapsed_trip_min),
            "traffic_factor": max(0.5, traffic_factor),
            "stops_remaining": max(0, stops_remaining)
        }
        
        buf = self.trip_buffers[trip_id]
        buf.append(point)

        if len(buf) == WINDOW_SIZE and self.is_loaded:
            return self.predict_from_sequence(list(buf))
        
        return None

# Global singleton instance
lstm_predictor = LSTMInferencePredictor()

if __name__ == "__main__":
    print("[*] Running LSTM Inference Predictor self-test...")
    test_sequence = [
        {"speed_kmph": 28.0, "remaining_distance_km": 6.2, "elapsed_trip_min": 5.0, "traffic_factor": 0.8, "stops_remaining": 3},
        {"speed_kmph": 27.5, "remaining_distance_km": 5.9, "elapsed_trip_min": 5.5, "traffic_factor": 0.8, "stops_remaining": 3},
        {"speed_kmph": 26.0, "remaining_distance_km": 5.6, "elapsed_trip_min": 6.0, "traffic_factor": 0.8, "stops_remaining": 3},
        {"speed_kmph": 24.0, "remaining_distance_km": 5.3, "elapsed_trip_min": 6.5, "traffic_factor": 0.8, "stops_remaining": 2},
        {"speed_kmph": 22.0, "remaining_distance_km": 5.0, "elapsed_trip_min": 7.0, "traffic_factor": 0.8, "stops_remaining": 2},
        {"speed_kmph": 20.0, "remaining_distance_km": 4.8, "elapsed_trip_min": 7.5, "traffic_factor": 0.8, "stops_remaining": 2},
        {"speed_kmph": 22.5, "remaining_distance_km": 4.5, "elapsed_trip_min": 8.0, "traffic_factor": 0.8, "stops_remaining": 2},
        {"speed_kmph": 25.0, "remaining_distance_km": 4.2, "elapsed_trip_min": 8.5, "traffic_factor": 0.8, "stops_remaining": 1},
        {"speed_kmph": 27.0, "remaining_distance_km": 3.9, "elapsed_trip_min": 9.0, "traffic_factor": 0.8, "stops_remaining": 1},
        {"speed_kmph": 26.5, "remaining_distance_km": 3.6, "elapsed_trip_min": 9.5, "traffic_factor": 0.8, "stops_remaining": 1},
    ]
    res = lstm_predictor.predict_from_sequence(test_sequence)
    print("Test Sequence Inference Result:", res)
