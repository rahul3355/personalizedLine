# Multi-stage build for smaller, faster images
FROM python:3.10-slim as builder

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

# Build dependencies in virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Final stage - minimal runtime image
FROM python:3.10-slim

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY backend/ ./backend/

# Run as non-root user for security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Default command (worker by default, overridden in docker-compose)
CMD ["python", "-m", "backend.app.worker"]
