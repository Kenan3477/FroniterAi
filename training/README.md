# Frontier-1 Business Operations Training Pipeline

A comprehensive machine learning training pipeline for fine-tuning the Frontier-1 model on business operations, financial analysis, and regulatory compliance tasks.

## Overview

This training pipeline provides end-to-end functionality for:

- **Data Preprocessing**: Multi-format document processing (PDF, Word, Excel) with quality scoring and chunking
- **Model Training**: Fine-tuning with LoRA adaptation, distributed training support, and mixed precision
- **Evaluation**: Business-specific metrics for financial accuracy, regulatory compliance, and strategic insights
- **Hyperparameter Optimization**: Bayesian and grid search optimization with Optuna integration
- **Monitoring**: WandB and TensorBoard integration for experiment tracking
- **Incremental Learning**: Support for continuous learning with new data

## Directory Structure

```
training/
├── data_preprocessing/          # Document processing and data preparation
│   └── business_document_processor.py
├── models/                      # Training pipeline and model configurations
│   └── frontier_trainer.py
├── evaluation/                  # Business-specific evaluation metrics
│   └── business_metrics.py
├── optimization/                # Hyperparameter optimization
│   └── hyperparameter_optimizer.py
├── scripts/                     # Training execution scripts
│   ├── train_model.py
│   └── quick_start.py
├── configs/                     # Configuration templates
│   └── training_config.yaml
├── requirements.txt             # Python dependencies
└── README.md                   # This file
```

## Quick Start

### 1. Environment Setup

```bash
# Setup training environment
python training/scripts/quick_start.py setup
```

### 2. Create Sample Data (for testing)

```bash
# Create sample business documents
python training/scripts/quick_start.py create-sample --output-dir ./data/sample --num-samples 100
```

### 3. Quick Training (for development)

```bash
# Run quick training for testing
python training/scripts/quick_start.py quick-train --data-dir ./data/sample --output-dir ./outputs/quick_test
```

### 4. Production Training

```bash
# Run full production training
python training/scripts/quick_start.py prod-train --config ./training/configs/training_config.yaml --output-dir ./outputs/production
```

## Detailed Usage

### Data Preprocessing

The `BusinessDocumentPreprocessor` handles multiple document formats:

```python
from training.data_preprocessing.business_document_processor import BusinessDocumentPreprocessor

# Initialize preprocessor
preprocessor = BusinessDocumentPreprocessor(
    output_dir="./processed_data",
    chunk_size=512,
    overlap_size=50,
    quality_threshold=0.7
)

# Process documents
processed_files = preprocessor.process_directory("./raw_data")
```

**Supported formats:**
- PDF documents (with table extraction)
- Word documents (.docx)
- Excel spreadsheets (.xlsx, .xls)
- Plain text files

**Features:**
- Automatic text cleaning and normalization
- Financial number extraction and standardization
- Quality scoring based on content analysis
- Intelligent chunking with overlap
- Metadata extraction

### Model Training

The training pipeline supports multiple training modes:

#### Full Training

```bash
python training/scripts/train_model.py train \
  --config ./training/configs/training_config.yaml \
  --output-dir ./outputs/full_training
```

#### Incremental Training

```bash
python training/scripts/train_model.py incremental \
  --base-model ./models/existing_model \
  --new-data ./data/new_documents \
  --output-dir ./outputs/incremental_training
```

#### Evaluation Only

```bash
python training/scripts/train_model.py evaluate \
  --model ./models/trained_model \
  --test-data ./data/test.json \
  --output-dir ./outputs/evaluation
```

### Configuration

The training pipeline uses YAML configuration files. Key sections:

```yaml
# Model and data settings
model_name: "microsoft/DialoGPT-large"
data:
  raw_data_dir: "./data/raw"
  preprocessing:
    chunk_size: 512
    quality_threshold: 0.7

# Training parameters
training_config:
  learning_rate: 5e-5
  batch_size: 16
  num_epochs: 5
  use_lora: true
  lora_r: 16
  lora_alpha: 32

# Hyperparameter optimization
hyperparameter_optimization:
  enabled: true
  method: "bayesian"
  n_trials: 50
```

### Hyperparameter Optimization

Run automated hyperparameter optimization:

```bash
python training/scripts/quick_start.py hyperopt \
  --data-dir ./data/processed \
  --n-trials 50 \
  --output-dir ./outputs/hyperopt
```

The optimizer supports:
- **Bayesian Optimization**: Efficient search using Optuna
- **Grid Search**: Exhaustive search over parameter combinations
- **Multi-objective optimization**: Balance multiple metrics

### Business Evaluation Metrics

The evaluation suite includes specialized metrics for business tasks:

#### Financial Accuracy Metric
- Evaluates numerical accuracy in financial calculations
- Handles currency, percentages, ratios, and multiples
- Accounts for financial notation (M, B, T suffixes)

#### Business Concept Coherence
- Measures semantic coherence using sentence embeddings
- Evaluates alignment of business concepts
- Categories: financial, strategic, operational, regulatory

#### Regulatory Compliance Metric
- Assesses compliance framework identification
- Evaluates requirement understanding
- Covers SOX, GDPR, IFRS, GAAP, Basel frameworks

#### Strategic Insight Metric
- Measures quality of strategic analysis
- Evaluates depth and actionability
- Covers SWOT analysis, market analysis, recommendations

### Monitoring and Experiment Tracking

The pipeline integrates with multiple monitoring platforms:

#### Weights & Biases (WandB)
```yaml
monitoring:
  wandb:
    enabled: true
    project: "frontier-business-ops"
    entity: "your-team"
```

#### TensorBoard
```yaml
monitoring:
  tensorboard:
    enabled: true
    log_dir: "./logs/tensorboard"
```

### Distributed Training

For multi-GPU training:

```yaml
distributed_training:
  enabled: true
  world_size: 4  # Number of GPUs
  backend: "nccl"
```

## Advanced Features

### LoRA (Low-Rank Adaptation)

Efficient fine-tuning with LoRA:

```yaml
training_config:
  use_lora: true
  lora_r: 16          # Rank
  lora_alpha: 32      # Scaling factor
  lora_dropout: 0.1   # Dropout rate
  lora_target_modules:
    - "c_attn"
    - "c_proj"
    - "c_fc"
```

### Mixed Precision Training

Enable mixed precision for faster training:

```yaml
training_config:
  fp16: true          # For older GPUs
  bf16: false         # For newer GPUs (A100, etc.)
```

### Memory Optimization

For large models:

```yaml
hardware:
  gradient_checkpointing: true
  use_cpu_offload: false
  max_batch_size: null  # Auto-detect
```

## Model Outputs

### Training Results

After training, you'll find:

```
outputs/
├── model/                      # Final trained model
├── checkpoints/               # Training checkpoints
├── logs/                      # Training logs
├── evaluation_report.json     # Comprehensive evaluation
├── training_summary.json      # Training metrics
└── hyperopt/                  # Optimization results (if enabled)
```

### Evaluation Reports

The evaluation report includes:
- Overall performance score
- Business-specific metrics breakdown
- Standard NLP metrics (ROUGE, BLEU, METEOR)
- Performance analysis and recommendations

## Development and Debugging

### Quick Development Mode

For rapid iteration:

```bash
python training/scripts/quick_start.py quick-train \
  --data-dir ./data/sample \
  --output-dir ./outputs/debug
```

### Debug Configuration

Enable debug mode in config:

```yaml
debug:
  dev_mode: true
  small_dataset: true
  fast_dev_run: true
  verbose_logging: true
```

## Requirements

### Core Dependencies
- Python 3.8+
- PyTorch 2.0+
- Transformers 4.21+
- Datasets 2.0+
- PEFT 0.4+ (for LoRA)

### Business-Specific
- Financial data: `yfinance`, `fredapi`
- Document processing: `PyPDF2`, `python-docx`, `openpyxl`
- Evaluation metrics: `rouge-score`, `bert-score`

### Optimization
- `optuna` for hyperparameter optimization
- `wandb` for experiment tracking
- `tensorboard` for visualization

See `requirements.txt` for complete dependency list.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Troubleshooting

### Common Issues

1. **CUDA out of memory**
   - Reduce batch size
   - Enable gradient checkpointing
   - Use CPU offloading

2. **Slow training**
   - Enable mixed precision (fp16/bf16)
   - Increase batch size with gradient accumulation
   - Use distributed training

3. **Poor evaluation scores**
   - Check data quality and preprocessing
   - Adjust learning rate and training epochs
   - Run hyperparameter optimization

### Getting Help

- Check the logs in `outputs/logs/`
- Review the training summary in `training_summary.json`
- Enable verbose logging in debug mode

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- HuggingFace Transformers for the training framework
- Microsoft for the DialoGPT base model
- Optuna for hyperparameter optimization
- The open-source ML community for evaluation metrics
