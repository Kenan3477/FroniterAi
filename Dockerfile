# Frontier AI - Production Docker Image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV RAILWAY_ENVIRONMENT=production

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/frontend \
    /app/logs \
    /app/cache \
    /app/.comprehensive_backups

# Set permissions
RUN chmod +x advanced_dashboard.py emergency_main.py smart_main.py

# Expose port (Railway will set PORT environment variable)
EXPOSE 8080

# Health check (use PORT environment variable)
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Run the ULTRA MINIMAL SYSTEM - absolutely guaranteed to work
CMD ["python", "ultra_minimal_system.py"]