FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (including spatial libraries for PostGIS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt-get/lists/*

# Copy requirements and install python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . /app/

# Set executable permission on entrypoint script
RUN chmod +x /app/entrypoint.sh

# Expose FastAPI port
EXPOSE 8000

# Health check endpoint verification
HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start container through initialization entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]
