# Kennex AI Backend - Troubleshooting Guide

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Error Code Reference](#error-code-reference)
4. [Performance Issues](#performance-issues)
5. [Database Issues](#database-issues)
6. [Authentication Problems](#authentication-problems)
7. [Integration Issues](#integration-issues)
8. [Monitoring & Debugging](#monitoring--debugging)
9. [Emergency Procedures](#emergency-procedures)
10. [Getting Help](#getting-help)

## Quick Diagnostics

### Health Check Checklist

Run this quick checklist when experiencing issues:

```bash
# 1. Check application status
curl -f http://localhost:3000/health

# 2. Check system resources
free -m && df -h

# 3. Check running processes
ps aux | grep node
pm2 status

# 4. Check database connectivity
pg_isready -h localhost -p 5432

# 5. Check Redis (if used)
redis-cli ping

# 6. Check recent logs
tail -n 50 logs/app.log | grep -i error

# 7. Check network connectivity
netstat -tulpn | grep :3000
```

### Emergency Status Dashboard

```bash
#!/bin/bash
# save as check-status.sh

echo "=== Kennex Backend Status Check ==="
echo "Timestamp: $(date)"
echo ""

echo "1. Application Health:"
curl -s -f http://localhost:3000/health | jq '.' || echo "❌ Application not responding"
echo ""

echo "2. System Resources:"
echo "Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "Disk: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)% used"
echo ""

echo "3. Database:"
pg_isready -h localhost -p 5432 && echo "✅ PostgreSQL responding" || echo "❌ PostgreSQL not responding"
echo ""

echo "4. Services:"
pm2 status | grep -E "kennex|status" || echo "❌ PM2 not running"
echo ""

echo "5. Recent Errors (last 10):"
tail -n 100 logs/app.log | grep -i error | tail -n 10 || echo "No recent errors found"
```

## Common Issues

### 1. Application Won't Start

#### Symptoms
- `pm2 status` shows app as "errored" or "stopped"
- Port binding errors
- Module not found errors

#### Diagnosis
```bash
# Check detailed PM2 logs
pm2 logs kennex-backend --lines 50

# Check if port is in use
lsof -i :3000
netstat -tulpn | grep :3000

# Verify Node.js version
node --version
npm --version

# Check environment variables
node -e "console.log('NODE_ENV:', process.env.NODE_ENV)"
node -e "console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set')"
```

#### Solutions
```bash
# Kill process using port 3000
kill -9 $(lsof -ti:3000)

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild TypeScript
npm run build

# Check file permissions
chmod +x dist/index.js

# Restart with verbose logging
NODE_ENV=development pm2 start dist/index.js --name kennex-backend
```

### 2. Database Connection Failures

#### Symptoms
- "Connection refused" errors
- "Database does not exist" errors
- Timeout errors during queries

#### Diagnosis
```bash
# Test direct database connection
psql "postgresql://username:password@localhost:5432/kennex_db"

# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Verify database exists
sudo -u postgres psql -l | grep kennex

# Check connection pool
cat logs/app.log | grep -i "pool\|connection"
```

#### Solutions
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Create database if missing
sudo -u postgres createdb kennex_db

# Reset database connections
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='kennex_db';"

# Run migrations
npx prisma migrate deploy
npx prisma generate

# Increase connection pool
# Edit .env: DATABASE_POOL_SIZE=20
```

### 3. Memory Issues

#### Symptoms
- Application crashes with "out of memory" errors
- Slow response times
- High memory usage in monitoring

#### Diagnosis
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Check Node.js heap usage
node -e "console.log(process.memoryUsage())"

# Monitor memory over time
watch -n 5 'free -h && echo "Node processes:" && ps aux | grep node'

# Check for memory leaks
cat logs/app.log | grep -i "memory\|heap"
```

#### Solutions
```bash
# Restart application
pm2 restart kennex-backend

# Increase Node.js memory limit
pm2 delete kennex-backend
pm2 start dist/index.js --name kennex-backend --node-args="--max-old-space-size=4096"

# Enable garbage collection logging
pm2 start dist/index.js --name kennex-backend --node-args="--max-old-space-size=4096 --trace-gc"

# Check for database connection leaks
sudo -u postgres psql kennex_db -c "SELECT count(*), state FROM pg_stat_activity WHERE datname='kennex_db' GROUP BY state;"
```

### 4. High CPU Usage

#### Symptoms
- Slow API responses
- High load average
- CPU usage consistently >80%

#### Diagnosis
```bash
# Check CPU usage by process
top -p $(pgrep -f "node.*kennex")

# Monitor specific Node.js process
pidstat -p $(pgrep -f "node.*kennex") 1

# Check for infinite loops or heavy computations
node --prof dist/index.js &
# Generate load and then:
kill %1
node --prof-process isolate-*.log > processed.txt
```

#### Solutions
```bash
# Restart application
pm2 restart kennex-backend

# Scale application (if using cluster mode)
pm2 scale kennex-backend 4

# Check for slow database queries
sudo -u postgres psql kennex_db -c "
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  WHERE mean_exec_time > 1000
  ORDER BY mean_exec_time DESC;
"

# Enable CPU profiling temporarily
pm2 start dist/index.js --name kennex-debug --node-args="--prof"
```

## Error Code Reference

### Authentication Errors

| Code | Description | Solution |
|------|-------------|----------|
| `AUTH_TOKEN_MISSING` | No authorization header | Include `Authorization: Bearer <token>` |
| `AUTH_TOKEN_INVALID` | Malformed or invalid token | Refresh token or re-authenticate |
| `AUTH_TOKEN_EXPIRED` | Token has expired | Use refresh token to get new access token |
| `AUTH_INSUFFICIENT_PERMISSIONS` | User lacks required permissions | Check user role and permissions |

### Database Errors

| Code | Description | Solution |
|------|-------------|----------|
| `DB_CONNECTION_FAILED` | Cannot connect to database | Check DATABASE_URL, restart PostgreSQL |
| `DB_TRANSACTION_FAILED` | Database transaction error | Check data integrity, retry operation |
| `DB_CONSTRAINT_VIOLATION` | Foreign key or unique constraint error | Validate input data |
| `DB_TIMEOUT` | Query exceeded timeout limit | Optimize query, increase timeout |

### Validation Errors

| Code | Description | Solution |
|------|-------------|----------|
| `VALIDATION_FAILED` | Request data validation failed | Check request format and required fields |
| `INVALID_EMAIL_FORMAT` | Email format is invalid | Use valid email format |
| `INVALID_PHONE_NUMBER` | Phone number format is invalid | Use E.164 format (+1234567890) |
| `INVALID_DATE_FORMAT` | Date format is invalid | Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) |

### Integration Errors

| Code | Description | Solution |
|------|-------------|----------|
| `TWILIO_API_ERROR` | Twilio service error | Check Twilio credentials and service status |
| `OPENAI_API_ERROR` | OpenAI service error | Verify API key and check rate limits |
| `EMAIL_SERVICE_ERROR` | Email sending failed | Check SMTP configuration |
| `REDIS_CONNECTION_ERROR` | Redis connection failed | Check Redis service and configuration |

## Performance Issues

### Slow API Responses

#### Diagnosis
```bash
# Monitor response times
curl -w "Time: %{time_total}s\n" -s -o /dev/null http://localhost:3000/api/v1/users

# Check database query performance
sudo -u postgres psql kennex_db -c "
  SELECT query, mean_exec_time, stddev_exec_time, calls
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 20;
"

# Monitor API endpoints
cat logs/app.log | grep "API response time" | tail -20

# Check for database locks
sudo -u postgres psql kennex_db -c "
  SELECT blocked_locks.pid AS blocked_pid,
         blocked_activity.usename AS blocked_user,
         blocking_locks.pid AS blocking_pid,
         blocking_activity.usename AS blocking_user,
         blocked_activity.query AS blocked_statement,
         blocking_activity.query AS current_statement_in_blocking_process
  FROM pg_catalog.pg_locks blocked_locks
  JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
  JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
  WHERE NOT blocked_locks.granted;
"
```

#### Solutions
```bash
# Enable query caching
# Add to .env: CACHE_ENABLED=true

# Optimize database queries
sudo -u postgres psql kennex_db -c "ANALYZE;"

# Add database indexes (example)
sudo -u postgres psql kennex_db -c "
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_campaigns_status ON campaigns(status);
  CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calls_created_at ON calls(created_at);
"

# Enable compression
# Nginx config: gzip on;

# Scale horizontally
pm2 scale kennex-backend +2
```

### Database Performance Issues

#### Symptoms
- Slow database queries
- High database CPU usage
- Connection pool exhaustion

#### Diagnosis
```sql
-- Check current connections
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Find slow queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY n_distinct DESC;
```

#### Solutions
```sql
-- Vacuum and analyze
VACUUM ANALYZE;

-- Reindex
REINDEX DATABASE kennex_db;

-- Update table statistics
ANALYZE;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY idx_campaigns_user_id ON campaigns(user_id);

-- Optimize PostgreSQL configuration
-- In postgresql.conf:
-- shared_buffers = 256MB
-- work_mem = 4MB
-- maintenance_work_mem = 64MB
-- effective_cache_size = 1GB
```

## Authentication Problems

### Token Issues

#### Invalid Token Format
```javascript
// Correct format
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// Common mistakes
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  // Missing "Bearer"
Authorization: Bearer "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Extra quotes
```

#### Token Expiration
```bash
# Check token expiration
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
try {
  const decoded = jwt.decode(token);
  console.log('Token expires at:', new Date(decoded.exp * 1000));
  console.log('Current time:', new Date());
  console.log('Expired:', Date.now() > decoded.exp * 1000);
} catch(e) {
  console.error('Invalid token:', e.message);
}
"
```

#### Refresh Token Flow
```bash
# Get new access token using refresh token
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

### Permission Issues

#### Diagnosis
```bash
# Check user permissions
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/v1/users/profile

# Decode JWT to see user role
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN';
console.log(jwt.decode(token));
"
```

## Integration Issues

### Twilio Integration

#### Symptoms
- Calls not initiating
- Webhook failures
- Authentication errors

#### Diagnosis
```bash
# Test Twilio credentials
curl -X GET 'https://api.twilio.com/2010-04-01/Accounts.json' \
-u YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN

# Check webhook endpoints
curl -X POST http://localhost:3000/api/v1/twilio/webhook \
-H "Content-Type: application/x-www-form-urlencoded" \
-d "From=+1234567890&To=+0987654321&CallStatus=ringing"

# Monitor Twilio logs
cat logs/app.log | grep -i twilio
```

#### Solutions
```bash
# Verify environment variables
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN

# Test phone number format
node -e "
const phone = '+1234567890';
console.log('Valid format:', /^\+\d{10,15}$/.test(phone));
"

# Update webhook URLs in Twilio Console
# https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
```

### OpenAI Integration

#### Symptoms
- AI responses timing out
- Rate limit errors
- Invalid API responses

#### Diagnosis
```bash
# Test OpenAI API directly
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }'

# Check rate limits
curl -I https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

## Monitoring & Debugging

### Enable Debug Mode

#### Application Debug
```bash
# Enable debug logging
export DEBUG=kennex:*
export LOG_LEVEL=debug
pm2 restart kennex-backend

# View debug logs
tail -f logs/debug.log

# Monitor specific modules
export DEBUG=kennex:auth,kennex:database
```

#### Database Debug
```sql
-- Enable query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 0;
SELECT pg_reload_conf();

-- View query logs
-- Check /var/log/postgresql/postgresql-*.log
```

### Performance Monitoring

#### Setup Application Monitoring
```javascript
// Add to your application
const prometheus = require('prom-client');

// Create metrics
const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

// Monitor endpoint
app.use('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

#### System Monitoring
```bash
# Install monitoring tools
sudo apt-get install htop iotop nethogs

# Monitor in real-time
htop                    # CPU and memory
iotop -o               # Disk I/O
nethogs               # Network usage
```

### Log Analysis

#### Common Log Patterns
```bash
# Find errors in last hour
journalctl --since "1 hour ago" | grep -i error

# API response times
cat logs/app.log | grep "response time" | awk '{print $NF}' | sort -n

# Database query times
grep "query took" logs/app.log | awk '{print $(NF-1)}' | sort -n

# Error frequency
grep -i error logs/app.log | cut -d' ' -f1-3 | uniq -c | sort -nr

# Memory usage over time
grep "memory usage" logs/app.log | tail -20
```

## Emergency Procedures

### Service Recovery

#### Complete System Recovery
```bash
#!/bin/bash
# emergency-recovery.sh

echo "Starting emergency recovery procedure..."

# 1. Stop all services
pm2 stop all
sudo systemctl stop nginx

# 2. Check system resources
echo "System resources:"
free -h
df -h

# 3. Clear temporary files
rm -rf /tmp/kennex-*
find logs/ -name "*.log" -size +100M -delete

# 4. Restart database
sudo systemctl restart postgresql
sleep 10

# 5. Check database
pg_isready -h localhost -p 5432 || exit 1

# 6. Restart application
pm2 start ecosystem.config.js --env production

# 7. Wait for startup
sleep 30

# 8. Restart nginx
sudo systemctl start nginx

# 9. Health check
curl -f http://localhost:3000/health || echo "Health check failed"

echo "Recovery procedure completed"
```

#### Database Recovery
```bash
# Database emergency recovery
sudo -u postgres psql << EOF
-- Kill all connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'kennex_db' AND pid <> pg_backend_pid();

-- Vacuum and analyze
VACUUM FULL ANALYZE;

-- Reindex
REINDEX DATABASE kennex_db;

-- Check integrity
SELECT count(*) FROM users;
SELECT count(*) FROM campaigns;
SELECT count(*) FROM calls;
EOF
```

### Rollback Procedures

#### Application Rollback
```bash
# Rollback to previous version
pm2 delete kennex-backend
git checkout HEAD~1
npm install
npm run build
pm2 start ecosystem.config.js --env production
```

#### Database Rollback
```bash
# Rollback last migration
npx prisma migrate rollback

# Or restore from backup
psql -U kennex -h localhost kennex_db < backup_file.sql
```

### Maintenance Mode

#### Enable Maintenance Mode
```nginx
# Add to nginx config
server {
    listen 80;
    server_name api.kennex.ai;
    
    location / {
        return 503 '{"error": "Service temporarily unavailable for maintenance. Please try again later."}';
        add_header Content-Type application/json;
    }
    
    # Allow health checks
    location /health {
        proxy_pass http://backend;
    }
}
```

## Getting Help

### Information to Collect

When reporting issues, include:

```bash
# System information
uname -a
node --version
npm --version
pm2 --version

# Application status
pm2 status
pm2 logs kennex-backend --lines 50

# System resources
free -h
df -h
top -n 1 -b | head -20

# Network status
netstat -tulpn | grep -E ":3000|:5432|:6379"

# Database status
sudo -u postgres psql -c "SELECT version();"
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Recent logs
tail -100 logs/app.log
journalctl --since "1 hour ago" -u postgresql
```

### Debug Information Script
```bash
#!/bin/bash
# collect-debug-info.sh

echo "=== Kennex Backend Debug Information ==="
echo "Generated: $(date)"
echo "Hostname: $(hostname)"
echo ""

echo "=== System Information ==="
uname -a
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "PM2: $(pm2 --version)"
echo ""

echo "=== Application Status ==="
pm2 status
echo ""

echo "=== System Resources ==="
echo "Memory:"
free -h
echo ""
echo "Disk:"
df -h
echo ""
echo "Load:"
uptime
echo ""

echo "=== Network ==="
netstat -tulpn | grep -E ":3000|:5432|:6379"
echo ""

echo "=== Recent Errors ==="
grep -i error logs/app.log | tail -10
echo ""

echo "=== Database Status ==="
pg_isready -h localhost -p 5432 && echo "PostgreSQL: OK" || echo "PostgreSQL: ERROR"
echo ""

echo "=== Configuration ==="
echo "NODE_ENV: $NODE_ENV"
echo "Database URL: $(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')"
echo ""
```

### Contact Information

- **GitHub Issues**: https://github.com/kennex-ai/backend/issues
- **Documentation**: https://docs.kennex.ai
- **Support Email**: support@kennex.ai
- **Emergency Hotline**: +1-800-KENNEX-AI
- **Status Page**: https://status.kennex.ai

### Escalation Matrix

| Severity | Response Time | Contact |
|----------|---------------|---------|
| P1 (Critical - Service Down) | 15 minutes | Emergency Hotline + Slack #incidents |
| P2 (High - Degraded Performance) | 2 hours | Support Email + Slack #support |
| P3 (Medium - Feature Issue) | 1 business day | GitHub Issues |
| P4 (Low - Enhancement) | Best effort | GitHub Issues |