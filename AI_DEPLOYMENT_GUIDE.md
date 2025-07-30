# 🚀 Frontier AI Model Infrastructure - Quick Start Guide

## Overview

You have successfully deployed a comprehensive AI model serving infrastructure with the following components:

- **Model Serving**: Multi-backend support (HuggingFace Transformers, ONNX, TensorRT, PyTorch)
- **Model Versioning**: A/B testing framework with traffic routing
- **Monitoring**: Real-time performance tracking and drift detection
- **GPU Acceleration**: CUDA and TensorRT support for high-performance inference
- **Caching**: Redis-based model and result caching
- **API Endpoints**: FastAPI-based REST API with authentication

## Quick Start

### Option 1: Docker Deployment (Recommended)

```bash
# Development deployment
./deploy.bat

# Production deployment with GPU
set GPU_ENABLED=true
set PROFILE=prod
./deploy.bat

# Check status
./deploy.bat status
```

### Option 2: Manual Setup

1. **Install Dependencies**
```bash
pip install -r requirements.txt
```

2. **Start Redis**
```bash
docker run -d -p 6379:6379 redis:alpine
```

3. **Set Environment Variables**
```bash
set REDIS_URL=redis://localhost:6379
set MODEL_CACHE_DIR=./models
set GPU_ENABLED=true
```

4. **Initialize Models**
```bash
python api/models/initialize_models.py
```

5. **Start API Server**
```bash
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

## Available AI Models

### Pre-configured Models

- **financial-bert-v1**: FinBERT for financial text classification
- **sentiment-bert-v1**: RoBERTa for sentiment analysis  
- **classifier-bert-v1**: DistilBERT for general text classification
- **risk-assessment-v1**: Multilingual BERT for risk assessment
- **market-lstm-v1**: LSTM model for market prediction

### Model Capabilities

- Text classification and sentiment analysis
- Named entity recognition (NER)
- Financial text analysis and risk assessment
- Market prediction and forecasting
- Custom model deployment

## API Endpoints

### Core AI Endpoints

- `POST /api/v1/ai/predict` - Single prediction
- `POST /api/v1/ai/batch` - Batch predictions
- `POST /api/v1/ai/analyze/sentiment` - Sentiment analysis
- `POST /api/v1/ai/analyze/financial` - Financial text analysis

### Model Management

- `GET /api/v1/ai/models` - List available models
- `POST /api/v1/ai/models/deploy` - Deploy new model
- `GET /api/v1/ai/models/{model_id}/status` - Model status

### Monitoring & Health

- `GET /api/v1/ai/system/health` - Health check
- `GET /api/v1/ai/system/metrics` - Performance metrics
- `GET /api/v1/ai/system/models/performance` - Model performance

### A/B Testing

- `POST /api/v1/ai/experiments` - Create experiment
- `GET /api/v1/ai/experiments/{id}` - Get experiment
- `POST /api/v1/ai/experiments/{id}/start` - Start experiment

## Example Usage

### Sentiment Analysis

```python
import requests

response = requests.post("http://localhost:8000/api/v1/ai/analyze/sentiment", json={
    "text": "The market is performing exceptionally well today!",
    "model_id": "sentiment-bert-v1"
})

print(response.json())
```

### Financial Analysis

```python
response = requests.post("http://localhost:8000/api/v1/ai/analyze/financial", json={
    "text": "Company X reported strong quarterly earnings with revenue growth of 15%.",
    "model_id": "financial-bert-v1"
})

print(response.json())
```

### Batch Processing

```python
response = requests.post("http://localhost:8000/api/v1/ai/batch", json={
    "requests": [
        {
            "task_type": "sentiment_analysis",
            "input_data": {"text": "Great product!"},
            "model_id": "sentiment-bert-v1"
        },
        {
            "task_type": "financial_analysis", 
            "input_data": {"text": "Stock prices are rising"},
            "model_id": "financial-bert-v1"
        }
    ]
})

print(response.json())
```

## Configuration

### Environment Variables

- `REDIS_URL`: Redis connection URL
- `MODEL_CACHE_DIR`: Model storage directory
- `GPU_ENABLED`: Enable GPU acceleration
- `TENSORRT_ENABLED`: Enable TensorRT optimization
- `LOG_LEVEL`: Logging level (INFO, DEBUG, WARNING)

### Model Configuration

Models can be configured in `api/models/config.py`:

```python
ModelConfig(
    model_id="your-model",
    model_type="huggingface",
    model_path="your/model/path",
    backend="cuda",  # cpu, cuda, tensorrt
    max_batch_size=32,
    max_sequence_length=512
)
```

## Monitoring Dashboard

Access the monitoring interface at:
- API Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/api/v1/ai/system/health
- Metrics: http://localhost:8000/api/v1/ai/system/metrics

## Performance Optimization

### GPU Acceleration

For GPU-enabled inference:
```bash
set GPU_ENABLED=true
set CUDA_VISIBLE_DEVICES=0
```

### TensorRT Optimization

For maximum performance with NVIDIA GPUs:
```bash
set TENSORRT_ENABLED=true
```

### Caching

Redis caching is enabled by default for:
- Model loading and inference results
- User sessions and API rate limiting
- A/B testing experiment state

## Production Deployment

### Docker with GPU Support

```bash
# Install nvidia-docker2
# Start with GPU support
set GPU_ENABLED=true
set PROFILE=gpu
./deploy.bat
```

### Load Balancing

The infrastructure supports horizontal scaling:
- Multiple API server instances
- Model server clustering
- Redis cluster for caching

### Monitoring & Alerts

Production monitoring includes:
- Real-time performance metrics
- Model drift detection
- Resource utilization alerts
- Error rate monitoring

## Troubleshooting

### Common Issues

1. **GPU not detected**: Install CUDA drivers and nvidia-docker2
2. **Redis connection failed**: Start Redis server
3. **Model loading errors**: Check model paths and permissions
4. **Memory issues**: Reduce batch size or enable model quantization

### Debug Mode

```bash
set LOG_LEVEL=DEBUG
python api/models/initialize_models.py
```

### Health Check

```bash
curl http://localhost:8000/api/v1/ai/system/health
```

## Next Steps

1. **Add Custom Models**: Deploy your own trained models
2. **Scale Infrastructure**: Add more model servers and Redis clustering  
3. **Advanced Features**: Enable A/B testing and model versioning
4. **Monitoring**: Set up production monitoring and alerting
5. **Security**: Configure authentication and API rate limiting

## Support

For issues or questions:
- Check the API documentation at `/docs`
- Review logs in the `./logs` directory
- Monitor system health via API endpoints

---

🎉 **Congratulations!** Your AI model infrastructure is ready for production use!
