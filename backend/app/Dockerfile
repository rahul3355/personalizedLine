FROM python:3.10-slim

# Install system dependencies for building Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only requirements first (better cache)
COPY backend/app/requirements.txt ./requirements.txt
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Copy entire backend into container
COPY backend/ ./backend/

# Default command (worker by default, overridden in docker-compose)
CMD ["python", "-m", "backend.app.worker"]
