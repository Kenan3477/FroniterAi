# Ultra simple Dockerfile for Railway
FROM python:3.11-slim

WORKDIR /app

# Install Flask only
RUN pip install flask==3.0.0

# Copy just the app file
COPY railway_simple.py .

# Railway will set PORT, expose standard port
EXPOSE 8080

# Simple startup
# Run the WORKING SMART MAIN SYSTEM - restore functionality
CMD ["python", "railway_main.py"]