# Multi-stage Dockerfile for AI Model Serving with GPU Support

# Base stage with CUDA support
FROM nvidia/cuda:12.2-devel-ubuntu22.04 as base

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV CUDA_VISIBLE_DEVICES=0
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3.11 \
    python3.11-dev \
    python3-pip \
    curl \
    wget \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    libbz2-dev \
    libreadline-dev \
    libsqlite3-dev \
    libncurses5-dev \
    libncursesw5-dev \
    xz-utils \
    tk-dev \
    libxml2-dev \
    libxmlsec1-dev \
    liblzma-dev \
    && rm -rf /var/lib/apt/lists/*

# Create symbolic link for python
RUN ln -s /usr/bin/python3.11 /usr/bin/python

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

# Expose ports
EXPOSE 8000 8888

# Development command
CMD ["python", "-m", "uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

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
    CMD curl -f http://localhost:8000/api/v1/ai/system/health || exit 1

# Production command
CMD ["gunicorn", "api.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]

# TensorRT optimized stage (optional)
FROM production as tensorrt

USER root

# Install TensorRT
RUN apt-get update && \
    apt-get install -y libnvinfer8 libnvinfer-plugin8 libnvinfer-dev libnvinfer-plugin-dev && \
    rm -rf /var/lib/apt/lists/*

# Install TensorRT Python bindings
RUN pip install --no-cache-dir nvidia-tensorrt

USER appuser

# TensorRT optimized command
CMD ["gunicorn", "api.main:app", "-w", "2", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "--timeout", "120"]
