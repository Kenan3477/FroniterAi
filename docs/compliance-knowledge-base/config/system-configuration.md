# Search and Version Control Configuration

## System Configuration Files

### Elasticsearch Configuration
```yaml
# config/elasticsearch/elasticsearch.yml
cluster.name: compliance-knowledge-base
node.name: compliance-node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node

# Index settings
index:
  number_of_shards: 1
  number_of_replicas: 1
  refresh_interval: 1s
  
# Analysis settings
analysis:
  analyzer:
    compliance_analyzer:
      type: custom
      tokenizer: standard
      filter:
        - lowercase
        - stop
        - snowball
        - compliance_synonyms
  
  filter:
    compliance_synonyms:
      type: synonym
      synonyms_path: analysis/compliance_synonyms.txt
```

### Application Configuration
```yaml
# config/application.yml
application:
  name: compliance-knowledge-base
  version: 1.0.0
  environment: production

database:
  host: localhost
  port: 5432
  name: compliance_kb
  username: ${DB_USERNAME}
  password: ${DB_PASSWORD}

elasticsearch:
  hosts:
    - localhost:9200
  timeout: 30s
  max_retries: 3

search:
  default_size: 20
  max_size: 100
  highlight:
    fragment_size: 150
    number_of_fragments: 3
  
  indexing:
    batch_size: 1000
    refresh_interval: 1s
    embedding_model: all-MiniLM-L6-v2

version_control:
  storage:
    type: postgresql
    backup_enabled: true
    backup_interval: 24h
  
  approval_workflow:
    required_approvers: 2
    auto_approve_threshold: minor
    notification_enabled: true

notifications:
  email:
    enabled: true
    smtp_host: ${SMTP_HOST}
    smtp_port: 587
    username: ${SMTP_USERNAME}
    password: ${SMTP_PASSWORD}
  
  slack:
    enabled: true
    webhook_url: ${SLACK_WEBHOOK_URL}

logging:
  level: INFO
  format: json
  output: 
    - console
    - file
  file:
    path: /var/log/compliance-kb/app.log
    max_size: 100MB
    max_files: 10

security:
  authentication:
    method: oauth2
    provider: azure_ad
    client_id: ${OAUTH_CLIENT_ID}
    client_secret: ${OAUTH_CLIENT_SECRET}
  
  authorization:
    rbac_enabled: true
    default_role: viewer
    admin_users:
      - admin@company.com
      - compliance@company.com

monitoring:
  metrics:
    enabled: true
    port: 9090
    path: /metrics
  
  health_check:
    enabled: true
    path: /health
    interval: 30s

cache:
  redis:
    host: localhost
    port: 6379
    password: ${REDIS_PASSWORD}
    ttl: 3600
```

### Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.8.0
    container_name: compliance-elasticsearch
    environment:
      - node.name=compliance-node-1
      - cluster.name=compliance-knowledge-base
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
      - ./config/elasticsearch/elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml
    ports:
      - "9200:9200"
      - "9300:9300"
    networks:
      - compliance-network

  kibana:
    image: docker.elastic.co/kibana/kibana:8.8.0
    container_name: compliance-kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - compliance-network

  postgresql:
    image: postgres:15
    container_name: compliance-postgres
    environment:
      - POSTGRES_DB=compliance_kb
      - POSTGRES_USER=compliance
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./config/database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - compliance-network

  redis:
    image: redis:7-alpine
    container_name: compliance-redis
    command: redis-server --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - compliance-network

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: compliance-app
    environment:
      - DATABASE_URL=postgresql://compliance:${DB_PASSWORD}@postgresql:5432/compliance_kb
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
    ports:
      - "8080:8080"
    depends_on:
      - elasticsearch
      - postgresql
      - redis
    volumes:
      - ./config/application.yml:/app/config/application.yml
      - app_logs:/var/log/compliance-kb
    networks:
      - compliance-network

  nginx:
    image: nginx:alpine
    container_name: compliance-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./config/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./config/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - app
    networks:
      - compliance-network

volumes:
  elasticsearch_data:
  postgres_data:
  redis_data:
  app_logs:

networks:
  compliance-network:
    driver: bridge
```

### Database Schema
```sql
-- config/database/init.sql
CREATE DATABASE compliance_kb;

\c compliance_kb;

-- Users and authentication
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    created_by VARCHAR(255) REFERENCES users(email),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_version VARCHAR(20) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    metadata JSONB
);

-- Document versions
CREATE TABLE document_versions (
    id VARCHAR(255) PRIMARY KEY,
    document_id VARCHAR(255) REFERENCES documents(id),
    version_number VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    created_by VARCHAR(255) REFERENCES users(email),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'draft',
    change_summary TEXT,
    change_details TEXT,
    parent_version VARCHAR(20),
    metadata JSONB
);

-- Version approval history
CREATE TABLE version_approvals (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255) REFERENCES documents(id),
    version_number VARCHAR(20) NOT NULL,
    approved_by VARCHAR(255) REFERENCES users(email),
    approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    approval_status VARCHAR(50) DEFAULT 'approved'
);

-- Regulatory changes tracking
CREATE TABLE regulatory_changes (
    id VARCHAR(255) PRIMARY KEY,
    regulation_id VARCHAR(255) NOT NULL,
    change_description TEXT NOT NULL,
    effective_date DATE NOT NULL,
    detected_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    impact_assessment JSONB,
    implementation_status VARCHAR(50) DEFAULT 'pending',
    assigned_to VARCHAR(255) REFERENCES users(email),
    created_by VARCHAR(255) REFERENCES users(email)
);

-- Change log for audit trail
CREATE TABLE change_log (
    id SERIAL PRIMARY KEY,
    document_id VARCHAR(255),
    version_number VARCHAR(20),
    change_type VARCHAR(50) NOT NULL,
    user_email VARCHAR(255) REFERENCES users(email),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details JSONB
);

-- Search analytics
CREATE TABLE search_analytics (
    id SERIAL PRIMARY KEY,
    user_email VARCHAR(255) REFERENCES users(email),
    query TEXT NOT NULL,
    results_count INTEGER,
    clicked_result_id VARCHAR(255),
    search_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_time_ms INTEGER,
    filters_applied JSONB
);

-- Create indexes for performance
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_versions_created_at ON document_versions(created_at);
CREATE INDEX idx_change_log_document_id ON change_log(document_id);
CREATE INDEX idx_change_log_timestamp ON change_log(timestamp);
CREATE INDEX idx_regulatory_changes_regulation_id ON regulatory_changes(regulation_id);
CREATE INDEX idx_regulatory_changes_effective_date ON regulatory_changes(effective_date);
CREATE INDEX idx_search_analytics_timestamp ON search_analytics(search_timestamp);
CREATE INDEX idx_search_analytics_user ON search_analytics(user_email);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Environment Variables Template
```bash
# .env.template
# Database Configuration
DB_USERNAME=compliance
DB_PASSWORD=your_secure_password_here
DB_HOST=localhost
DB_PORT=5432
DB_NAME=compliance_kb

# Redis Configuration
REDIS_PASSWORD=your_redis_password_here

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=your_elasticsearch_password

# OAuth2 Configuration
OAUTH_CLIENT_ID=your_azure_ad_client_id
OAUTH_CLIENT_SECRET=your_azure_ad_client_secret
OAUTH_TENANT_ID=your_azure_ad_tenant_id

# Email Configuration
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USERNAME=noreply@company.com
SMTP_PASSWORD=your_smtp_password

# Slack Configuration
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/your/webhook/url

# Security
JWT_SECRET=your_jwt_secret_key_here
ENCRYPTION_KEY=your_encryption_key_here

# Application
APP_ENV=production
APP_DEBUG=false
APP_URL=https://compliance.company.com
API_VERSION=v1

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
NEW_RELIC_LICENSE_KEY=your_newrelic_key_here
```

### Nginx Configuration
```nginx
# config/nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream compliance_app {
        server app:8080;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=search:10m rate=50r/s;

    server {
        listen 80;
        server_name compliance.company.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name compliance.company.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # API endpoints
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://compliance_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Search endpoints
        location /api/search/ {
            limit_req zone=search burst=100 nodelay;
            proxy_pass http://compliance_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Static files
        location /static/ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            alias /var/www/static/;
        }

        # Health check
        location /health {
            proxy_pass http://compliance_app;
            access_log off;
        }

        # Main application
        location / {
            proxy_pass http://compliance_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Dockerfile
```dockerfile
# Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /var/log/compliance-kb

# Set environment variables
ENV PYTHONPATH=/app
ENV FLASK_APP=app.py
ENV FLASK_ENV=production

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start application
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "4", "--timeout", "120", "app:app"]
```

### Requirements File
```txt
# requirements.txt
Flask==2.3.2
Flask-SQLAlchemy==3.0.5
Flask-Migrate==4.0.4
Flask-Login==0.6.2
Flask-CORS==4.0.0
elasticsearch==8.8.0
sentence-transformers==2.2.2
psycopg2-binary==2.9.6
redis==4.5.5
celery==5.2.7
gunicorn==20.1.0
requests==2.31.0
python-dotenv==1.0.0
PyYAML==6.0
click==8.1.3
Werkzeug==2.3.6
numpy==1.24.3
pandas==2.0.2
scikit-learn==1.2.2
nltk==3.8.1
spacy==3.5.3
transformers==4.30.2
torch==2.0.1
difflib2==0.1
hashlib==20081119
python-dateutil==2.8.2
marshmallow==3.19.0
flask-marshmallow==0.15.0
marshmallow-sqlalchemy==0.29.0
```

### Installation Script
```bash
#!/bin/bash
# install.sh

set -e

echo "Installing Compliance Knowledge Base..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment file from template
if [ ! -f .env ]; then
    echo "Creating environment file..."
    cp .env.template .env
    echo "Please edit .env file with your configuration values."
    exit 1
fi

# Create necessary directories
mkdir -p config/elasticsearch
mkdir -p config/nginx/ssl
mkdir -p data/elasticsearch
mkdir -p data/postgres
mkdir -p logs

# Generate SSL certificates (self-signed for development)
if [ ! -f config/nginx/ssl/cert.pem ]; then
    echo "Generating SSL certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout config/nginx/ssl/key.pem \
        -out config/nginx/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=compliance.company.com"
fi

# Build and start services
echo "Building and starting services..."
docker-compose up -d --build

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 30

# Check if Elasticsearch is ready
echo "Checking Elasticsearch..."
until curl -s http://localhost:9200/_cluster/health | grep -q '"status":"yellow\|green"'; do
    echo "Waiting for Elasticsearch..."
    sleep 5
done

# Initialize database
echo "Initializing database..."
docker-compose exec app flask db upgrade

# Create initial indices
echo "Creating search indices..."
docker-compose exec app python scripts/init_indices.py

# Import sample data
echo "Importing sample data..."
docker-compose exec app python scripts/import_sample_data.py

echo "Installation complete!"
echo "Access the application at: https://localhost"
echo "Kibana dashboard at: http://localhost:5601"
echo "Elasticsearch at: http://localhost:9200"
```

### Monitoring Configuration
```yaml
# config/monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "compliance_rules.yml"

scrape_configs:
  - job_name: 'compliance-app'
    static_configs:
      - targets: ['app:9090']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'elasticsearch'
    static_configs:
      - targets: ['elasticsearch:9200']
    metrics_path: '/_prometheus/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres_exporter:9187']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### API Documentation Configuration
```yaml
# config/api/openapi.yml
openapi: 3.0.0
info:
  title: Compliance Knowledge Base API
  description: API for managing compliance documentation and search
  version: 1.0.0
  contact:
    name: Compliance Team
    email: compliance@company.com

servers:
  - url: https://compliance.company.com/api/v1
    description: Production server
  - url: http://localhost:8080/api/v1
    description: Development server

paths:
  /search:
    get:
      summary: Search compliance documents
      parameters:
        - name: q
          in: query
          required: true
          schema:
            type: string
          description: Search query
        - name: type
          in: query
          schema:
            type: string
            enum: [regulation, policy, risk_assessment, workflow]
          description: Document type filter
        - name: jurisdiction
          in: query
          schema:
            type: string
          description: Jurisdiction filter
        - name: size
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
          description: Number of results to return
      responses:
        '200':
          description: Search results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SearchResponse'

  /documents:
    post:
      summary: Create new document
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/DocumentRequest'
      responses:
        '201':
          description: Document created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Document'

  /documents/{id}/versions:
    post:
      summary: Create new version of document
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/VersionRequest'
      responses:
        '201':
          description: Version created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/DocumentVersion'

components:
  schemas:
    SearchResponse:
      type: object
      properties:
        total_hits:
          type: integer
        results:
          type: array
          items:
            $ref: '#/components/schemas/SearchResult'
        facets:
          type: object
        suggestions:
          type: array
          items:
            type: string

    SearchResult:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        content_preview:
          type: string
        score:
          type: number
        metadata:
          type: object

    Document:
      type: object
      properties:
        id:
          type: string
        title:
          type: string
        document_type:
          type: string
        category:
          type: string
        current_version:
          type: string
        status:
          type: string
        created_at:
          type: string
          format: date-time

    DocumentRequest:
      type: object
      required:
        - title
        - document_type
        - content
      properties:
        title:
          type: string
        document_type:
          type: string
        category:
          type: string
        content:
          type: string
        metadata:
          type: object

    DocumentVersion:
      type: object
      properties:
        id:
          type: string
        document_id:
          type: string
        version_number:
          type: string
        content:
          type: string
        change_summary:
          type: string
        status:
          type: string
        created_at:
          type: string
          format: date-time

    VersionRequest:
      type: object
      required:
        - content
        - change_summary
      properties:
        content:
          type: string
        change_summary:
          type: string
        change_details:
          type: string

  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - BearerAuth: []
```

---

*This comprehensive configuration provides all the necessary setup files for deploying and running the Compliance Knowledge Base search and version control system in a production environment.*
