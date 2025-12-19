# Kennex AI Backend - Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Production Deployment](#production-deployment)
5. [Docker Deployment](#docker-deployment)
6. [Cloud Deployments](#cloud-deployments)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

## Overview

This guide covers deploying the Kennex AI Backend API to various environments including development, staging, and production. The backend is built with Node.js, TypeScript, Express, and Prisma.

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB
- Node.js: 16.x or later
- PostgreSQL: 13.x or later

**Recommended (Production):**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- Node.js: 18.x (LTS)
- PostgreSQL: 15.x
- Redis: 6.x+ (for caching)

## Environment Setup

### 1. Prerequisites

```bash
# Install Node.js (using nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install pnpm (recommended) or npm
npm install -g pnpm

# Install PostgreSQL
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Install Redis (optional, for caching)
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis
```

### 2. Application Setup

```bash
# Clone repository
git clone https://github.com/kennex-ai/backend.git
cd backend

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Environment Variables

Create a `.env` file with the following variables:

```bash
# Application
NODE_ENV=production
PORT=3000
APP_NAME="Kennex AI Backend"
APP_VERSION="1.0.0"

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/kennex_db"
DATABASE_POOL_SIZE=10
DATABASE_TIMEOUT=30000

# Authentication
JWT_SECRET="your-super-secure-jwt-secret-key-here"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"
REFRESH_TOKEN_EXPIRES_IN="30d"

# Encryption
ENCRYPTION_KEY="your-32-character-encryption-key"

# Redis (optional)
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
REDIS_DB=0

# Twilio Integration
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Email (optional)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Monitoring
MONITORING_ENABLED=true
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true

# Security
CORS_ORIGIN="https://yourdomain.com"
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=3600

# Logging
LOG_LEVEL="info"
LOG_FORMAT="json"
LOG_FILE="logs/app.log"

# External APIs
OPENAI_API_KEY="your-openai-api-key"

# File Storage
STORAGE_TYPE="local" # or "s3"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_BUCKET_NAME=""
AWS_REGION="us-east-1"
```

## Database Setup

### 1. PostgreSQL Installation & Configuration

```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

```sql
-- Create database
CREATE DATABASE kennex_db;

-- Create user
CREATE USER kennex_user WITH PASSWORD 'secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE kennex_db TO kennex_user;
ALTER USER kennex_user CREATEDB;

-- Exit psql
\q
```

### 2. Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npm run db:seed
```

### 3. Database Optimization

```sql
-- Performance tuning (run as postgres user)
-- Increase shared_buffers (25% of RAM)
ALTER SYSTEM SET shared_buffers = '2GB';

-- Increase work_mem for complex queries
ALTER SYSTEM SET work_mem = '16MB';

-- Enable query planning improvements
ALTER SYSTEM SET random_page_cost = 1.1;

-- Reload configuration
SELECT pg_reload_conf();
```

## Production Deployment

### 1. Build Application

```bash
# Install production dependencies
pnpm install --prod

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

### 2. Process Manager (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'kennex-backend',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=4096'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup auto-restart on boot
pm2 startup
```

### 3. Reverse Proxy (Nginx)

```bash
# Install Nginx
sudo apt-get install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/kennex-backend
```

```nginx
upstream backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}

server {
    listen 80;
    server_name api.kennex.ai;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.kennex.ai;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.kennex.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.kennex.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types application/json application/javascript text/css text/javascript text/xml application/xml application/rss+xml application/atom+xml image/svg+xml;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://backend;
        access_log off;
    }
    
    # Static files (if any)
    location /static/ {
        alias /var/www/kennex/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/kennex-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d api.kennex.ai

# Test automatic renewal
sudo certbot renew --dry-run
```

## Docker Deployment

### 1. Dockerfile

Create a `Dockerfile`:

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Production image
FROM node:18-alpine AS runner

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### 2. Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://kennex:password@postgres:5432/kennex_db
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    networks:
      - kennex-network

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: kennex
      POSTGRES_PASSWORD: password
      POSTGRES_DB: kennex_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kennex -d kennex_db"]
      interval: 30s
      timeout: 10s
      retries: 5
    restart: unless-stopped
    networks:
      - kennex-network

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    networks:
      - kennex-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - kennex-network

volumes:
  postgres_data:
  redis_data:

networks:
  kennex-network:
    driver: bridge
```

### 3. Docker Commands

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale application
docker-compose up -d --scale app=3

# Update application
docker-compose build app
docker-compose up -d app

# Backup database
docker-compose exec postgres pg_dump -U kennex kennex_db > backup.sql
```

## Cloud Deployments

### 1. AWS ECS Deployment

```json
{
  "family": "kennex-backend",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "kennex-backend",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/kennex-backend:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql://user:pass@rds-endpoint:5432/kennex_db"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/kennex/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/kennex-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### 2. Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and initialize
railway login
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set DATABASE_URL=${{DATABASE_URL}}
railway variables set JWT_SECRET=${{JWT_SECRET}}

# Deploy
railway up
```

### 3. Heroku Deployment

```bash
# Install Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login and create app
heroku login
heroku create kennex-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET="your-secret-key"

# Deploy
git push heroku main

# Run migrations
heroku run npx prisma migrate deploy
```

## Monitoring & Maintenance

### 1. Application Monitoring

```bash
# Install monitoring tools
npm install -g @datadog/datadog-ci
npm install -g newrelic

# PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# System monitoring with htop
sudo apt-get install htop
htop
```

### 2. Log Management

```bash
# Setup log rotation
sudo nano /etc/logrotate.d/kennex-backend
```

```
/var/www/kennex/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 nodejs nodejs
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3. Database Maintenance

```sql
-- Regular maintenance (run weekly)
VACUUM ANALYZE;

-- Reindex for performance
REINDEX DATABASE kennex_db;

-- Check database size
SELECT pg_size_pretty(pg_database_size('kennex_db'));

-- Monitor slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;
```

### 4. Backup Strategy

```bash
#!/bin/bash
# backup.sh - Daily backup script

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/kennex"
DB_NAME="kennex_db"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -U kennex -h localhost $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# Application backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /var/www/kennex --exclude=node_modules

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/db_backup_$DATE.sql.gz s3://kennex-backups/

# Clean old backups (keep 30 days)
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable and add to cron
chmod +x backup.sh
crontab -e
# Add: 0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

## Security Considerations

### 1. Firewall Configuration

```bash
# UFW setup
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow specific ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow from 10.0.0.0/8 to any port 5432  # Database (internal)

# Check status
sudo ufw status verbose
```

### 2. Security Hardening

```bash
# Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no
# Set: AllowUsers your-username

sudo systemctl restart ssh

# Setup fail2ban
sudo apt-get install fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Configure for nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
```

### 3. Application Security

```javascript
// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
}));
```

## Troubleshooting

### 1. Common Issues

#### Application Won't Start

```bash
# Check logs
pm2 logs kennex-backend

# Check ports
sudo netstat -tulpn | grep :3000

# Check environment
node -e "console.log(process.env)"

# Verify database connection
npx prisma db pull
```

#### Database Connection Issues

```bash
# Test database connection
psql "postgresql://user:pass@localhost:5432/kennex_db"

# Check PostgreSQL status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

#### High Memory Usage

```bash
# Monitor memory
free -h
ps aux | grep node

# Restart with memory limit
pm2 restart kennex-backend --node-args="--max-old-space-size=4096"
```

### 2. Performance Issues

```bash
# Monitor application performance
pm2 monit

# Check system resources
htop
iotop

# Database performance
sudo -u postgres psql kennex_db -c "
  SELECT query, mean_exec_time, calls, total_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"
```

### 3. Debug Mode

Enable debug logging in production for troubleshooting:

```bash
# Temporary debug mode
pm2 restart kennex-backend --env debug

# Check specific logs
tail -f logs/app.log | grep ERROR
```

### 4. Health Checks

```bash
# Application health
curl -f http://localhost:3000/health

# Database health
curl -f http://localhost:3000/api/v1/monitoring/health

# Full system check
curl -f http://localhost:3000/api/v1/monitoring/metrics
```

### 5. Emergency Procedures

#### Quick Rollback

```bash
# Rollback with PM2
pm2 deploy production revert 1

# Rollback database migration
npx prisma migrate rollback
```

#### Service Recovery

```bash
# Restart all services
sudo systemctl restart postgresql
sudo systemctl restart redis-server
sudo systemctl restart nginx
pm2 restart all
```

#### Emergency Maintenance Mode

```nginx
# Add to nginx config temporarily
location / {
    return 503 "Service temporarily unavailable for maintenance";
}
```

For additional support, contact: devops@kennex.ai