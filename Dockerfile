# Ultra simple Dockerfile for Railway
FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the emergency working system
COPY railway_main.py .

# Railway will set PORT, expose standard port
EXPOSE 8080

# Simple startup
# Run the WORKING SMART MAIN SYSTEM - restore functionality
CMD ["python", "railway_main.py"]