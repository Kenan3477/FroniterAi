# Ultra simple Dockerfile for Railway
FROM python:3.11-slim

WORKDIR /app

# Install git for GitHub repository cloning
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all necessary files for the code analyzer
COPY code_analyzer.py .
COPY app.py .
COPY railway_main.py .

# Create directory for analysis results
RUN mkdir -p /tmp/frontier_analysis

# Set environment variables for Railway
ENV RAILWAY_ENVIRONMENT=production
ENV PORT=8080

# Railway will set PORT, expose standard port
EXPOSE 8080

# Simple startup
# Run the WORKING SMART MAIN SYSTEM - restore functionality
CMD ["python", "railway_main.py"]