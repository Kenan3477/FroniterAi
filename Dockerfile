# Railway-compatible Dockerfile for Frontier AI Evolution System

# Use official Python image compatible with Railway
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PIP_NO_CACHE_DIR=1
ENV PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN python -m pip install --upgrade pip

# Development stage
FROM base as development

WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install additional development tools
RUN pip install --no-cache-dir \
    jupyter \
    ipython \
    matplotlib \
    seaborn \
    plotly

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/models /app/logs /app/cache /app/data

# Set permissions
RUN chmod +x /app/api/models/initialize_models.py

# Expose port (Railway will assign the PORT dynamically)
EXPOSE $PORT

# Development command
CMD ["python", "comprehensive_evolution_system.py"]

# Production stage
FROM base as production

WORKDIR /app

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Copy requirements
COPY requirements.txt .

# Install production dependencies only
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=appuser:appuser . .

# Create directories with proper permissions
RUN mkdir -p /app/models /app/logs /app/cache /app/data && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:$PORT/ || exit 1

# Production command - Use PORT environment variable from Railway
CMD ["python", "comprehensive_evolution_system.py"]
