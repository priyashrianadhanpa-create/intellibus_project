import heapq
from typing import List, Dict, Tuple
try:
    from app.ml.eta_model import haversine_distance_km
except ImportError:
    try:
        from ml.eta_model import haversine_distance_km
    except ImportError:
        from .eta_model import haversine_distance_km

class RouteOptimizer:
    def __init__(self):
        # Default campus stops nodes
        self.stops = {
            1: {"name": "North Campus Hub", "lat": 40.7128, "lng": -74.0060},
            2: {"name": "Science & Tech Building", "lat": 40.7150, "lng": -74.0020},
            3: {"name": "Central Library", "lat": 40.7180, "lng": -73.9980},
            4: {"name": "Student Recreation Center", "lat": 40.7210, "lng": -73.9940},
            5: {"name": "South Residence Quad", "lat": 40.7240, "lng": -73.9900},
        }
        
    def optimize_route(self, origin_stop_id: int, dest_stop_id: int) -> Dict:
        """
        Calculates the optimal stop path and estimated travel time using Dijkstra's algorithm.
        """
        if origin_stop_id not in self.stops or dest_stop_id not in self.stops:
            return {"error": "Invalid stop IDs"}

        # Build graph edges based on Haversine distance
        graph = {}
        for id1, stop1 in self.stops.items():
            graph[id1] = []
            for id2, stop2 in self.stops.items():
                if id1 != id2:
                    dist = haversine_distance_km(stop1["lat"], stop1["lng"], stop2["lat"], stop2["lng"])
                    graph[id1].append((id2, dist))

        # Dijkstra algorithm
        distances = {node: float('inf') for node in self.stops}
        previous = {node: None for node in self.stops}
        distances[origin_stop_id] = 0
        
        pq = [(0, origin_stop_id)]
        
        while pq:
            current_dist, current_node = heapq.heappop(pq)
            
            if current_node == dest_stop_id:
                break
                
            if current_dist > distances[current_node]:
                continue
                
            for neighbor, weight in graph[current_node]:
                distance = current_dist + weight
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    previous[neighbor] = current_node
                    heapq.heappush(pq, (distance, neighbor))

        # Reconstruct path
        path = []
        curr = dest_stop_id
        while curr is not None:
            path.append(curr)
            curr = previous[curr]
        path.reverse()

        path_details = [self.stops[node] for node in path]
        total_dist_km = round(distances[dest_stop_id], 2)
        total_est_mins = round((total_dist_km / 25.0) * 60.0 + (len(path) - 1) * 1.5, 1)

        return {
            "origin": self.stops[origin_stop_id]["name"],
            "destination": self.stops[dest_stop_id]["name"],
            "optimal_stop_path": path_details,
            "total_distance_km": total_dist_km,
            "estimated_travel_time_mins": total_est_mins,
            "recommended_bus": "BUS-101 (Blue Express Loop)"
        }

optimizer = RouteOptimizer()
