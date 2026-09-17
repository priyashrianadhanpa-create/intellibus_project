FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including spatial libraries for PostGIS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt-get/lists/*

# Copy requirements / pyproject.toml
COPY pyproject.toml /app/

# Install python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir uvicorn fastapi sqlalchemy psycopg2-binary python-jose[cryptography] passlib[bcrypt] pydantic requests paho-mqtt pytest

# Copy application source code
COPY . /app/

# Expose FastAPI port
EXPOSE 8000

# Health check endpoint verification
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start Uvicorn ASGI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
