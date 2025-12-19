# 📱 Kennex AI Backend

> **AI-Powered Call Center Management System**

A comprehensive backend API for managing AI-driven call center operations with real-time monitoring, advanced analytics, and seamless integrations.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-18.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/database-postgresql-blue.svg)](https://postgresql.org/)
[![API Status](https://img.shields.io/badge/api-stable-green.svg)](https://api.kennex.ai/health)

## 🚀 Features

### Core Functionality
- 🎯 **Campaign Management** - Create and manage outbound/inbound call campaigns
- 👥 **Contact Management** - Comprehensive contact database with custom fields
- 🔄 **Flow Builder** - Visual conversation flow designer for AI interactions
- 📞 **Call Management** - Real-time call handling with Twilio integration
- 🤖 **AI Integration** - OpenAI-powered conversation intelligence
- 📊 **Analytics Dashboard** - Real-time performance metrics and reporting

### Advanced Features
- 🛡️ **Enterprise Security** - JWT authentication with role-based access control
- ⚡ **Performance Optimization** - Redis caching, database query optimization
- 📈 **Real-time Monitoring** - System health checks and resource monitoring
- 🔧 **API Management** - Rate limiting, compression, and response optimization
- 🌐 **Multi-tenant Support** - Isolated environments for different organizations
- 📱 **RESTful API** - Comprehensive API with OpenAPI/Swagger documentation

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Database      │
│   Dashboard     │────│   (Express.js)  │────│   (PostgreSQL)  │
│                 │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                         │
                              │                         │
                    ┌─────────────────┐    ┌─────────────────┐
                    │   Twilio API    │    │   Redis Cache   │
                    │   (Voice/SMS)   │    │   (Session)     │
                    └─────────────────┘    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │   OpenAI API    │
                    │   (AI Engine)   │
                    └─────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18.x with TypeScript
- **Framework**: Express.js with Helmet security
- **Database**: PostgreSQL 15.x with Prisma ORM
- **Caching**: Redis for session and query caching
- **Authentication**: JWT tokens with refresh mechanism
- **Testing**: Jest with ts-jest and Supertest

### Integrations
- **Voice**: Twilio Voice API for call management
- **AI**: OpenAI GPT-4 for conversation intelligence
- **Email**: SMTP support for notifications
- **Storage**: Local filesystem or AWS S3

### DevOps
- **Process Manager**: PM2 for production deployment
- **Reverse Proxy**: Nginx with SSL termination
- **Monitoring**: Winston logging with custom metrics
- **CI/CD**: GitHub Actions with automated testing

## 📦 Installation

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL 13.x or higher
- Redis 6.x (optional, for caching)
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/kennex-ai/backend.git
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database**
   ```bash
   # Create PostgreSQL database
   createdb kennex_db
   
   # Run migrations
   npx prisma migrate deploy
   npx prisma generate
   
   # Seed database (optional)
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Environment Configuration

Create a `.env` file with the following variables:

```bash
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/kennex_db"

# Authentication
JWT_SECRET="your-super-secure-secret-key"
JWT_EXPIRES_IN="1h"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"

# Twilio Integration
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# OpenAI Integration
OPENAI_API_KEY="your-openai-api-key"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Security
CORS_ORIGIN="http://localhost:3001"
RATE_LIMIT_MAX=1000
ENCRYPTION_KEY="your-32-character-encryption-key"
```

## 🚦 API Documentation

### Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://api.kennex.ai`

### Authentication

All protected endpoints require a JWT token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.kennex.ai/api/v1/endpoint
```

### Quick Examples

#### Get Access Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@kennex.ai", "password": "password"}'
```

#### Create Campaign
```bash
curl -X POST http://localhost:3000/api/v1/campaigns \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Q1 Sales Campaign",
    "type": "OUTBOUND",
    "status": "DRAFT"
  }'
```

#### Get Analytics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/v1/analytics/dashboard?period=week
```

### 📚 Complete API Documentation

- **API Reference**: [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
- **Deployment Guide**: [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)
- **Troubleshooting**: [docs/TROUBLESHOOTING_GUIDE.md](docs/TROUBLESHOOTING_GUIDE.md)

## 🧪 Testing

### Run Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- --testNamePattern="User"
```

### Test Coverage
The project maintains >70% test coverage across all modules:
- Unit tests for business logic
- Integration tests for API endpoints
- Database tests with test fixtures
- Mock tests for external services

## 🏃‍♂️ Development

### Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

### Code Style
- **TypeScript** with strict mode enabled
- **ESLint** with Airbnb configuration
- **Prettier** for code formatting
- **Husky** for pre-commit hooks

### Development Workflow
1. Create feature branch from `main`
2. Make changes with proper TypeScript types
3. Add/update tests for new functionality
4. Run linting and tests
5. Create pull request with description
6. Automated CI/CD runs tests
7. Code review and merge

## 🚀 Deployment

### Production Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Using PM2 (Recommended)**
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

3. **Using Docker**
   ```bash
   docker build -t kennex-backend .
   docker run -d -p 3000:3000 --env-file .env kennex-backend
   ```

4. **Cloud Platforms**
   - **Railway**: `railway deploy`
   - **Heroku**: `git push heroku main`
   - **AWS**: Deploy using ECS or Elastic Beanstalk

### Environment-Specific Deployments

- **Development**: `npm run dev`
- **Staging**: `pm2 start ecosystem.config.js --env staging`
- **Production**: `pm2 start ecosystem.config.js --env production`

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "twilio": "healthy"
  }
}
```

### Metrics Dashboard
Visit `http://localhost:3000/api/v1/monitoring/dashboard` for real-time metrics including:
- API response times
- Database performance
- Memory and CPU usage
- Error rates and trends

### Logging
```bash
# View application logs
tail -f logs/app.log

# View PM2 logs
pm2 logs kennex-backend

# View error logs only
grep ERROR logs/app.log
```

## 🔒 Security

### Security Features
- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Joi schema validation
- **Rate Limiting**: Configurable per-endpoint limits
- **CORS**: Configurable origin restrictions
- **Headers**: Security headers with Helmet.js
- **Encryption**: Field-level encryption for sensitive data

### Security Headers
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
```

## 📈 Performance

### Optimization Features
- **Database**: Query optimization and connection pooling
- **Caching**: Redis-based response and session caching
- **Compression**: Gzip compression for API responses
- **Pagination**: Efficient pagination for large datasets
- **Rate Limiting**: Prevent abuse and ensure fair usage

### Performance Metrics
- **Response Time**: Average <100ms for standard operations
- **Throughput**: >1000 requests/second with clustering
- **Database**: Optimized queries with <50ms average execution
- **Memory**: <512MB average memory usage per process

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with proper tests
4. Ensure all tests pass: `npm test`
5. Submit a pull request

### Code Guidelines
- Follow existing TypeScript/JavaScript patterns
- Add tests for new functionality
- Update documentation for API changes
- Follow conventional commit messages
- Ensure code passes linting

### Pull Request Process
1. Ensure CI/CD pipeline passes
2. Update relevant documentation
3. Add/update tests as needed
4. Get at least one code review approval
5. Squash commits before merging

## 🐛 Issue Reporting

### Bug Reports
Please include:
- **Environment**: OS, Node.js version, etc.
- **Steps to Reproduce**: Detailed steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Logs**: Relevant error messages

### Feature Requests
Please include:
- **Use Case**: Why is this feature needed
- **Proposed Solution**: How should it work
- **Alternatives**: Other solutions considered
- **Impact**: Who would benefit

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

### Core Team
- **Tech Lead**: [@tech-lead](https://github.com/tech-lead)
- **Backend Lead**: [@backend-lead](https://github.com/backend-lead)
- **DevOps Lead**: [@devops-lead](https://github.com/devops-lead)

### Contributors
See [CONTRIBUTORS.md](CONTRIBUTORS.md) for a complete list of contributors.

## 📞 Support

### Community
- **GitHub Discussions**: [Discussions](https://github.com/kennex-ai/backend/discussions)
- **Discord**: [Join our Discord](https://discord.gg/kennex-ai)
- **Stack Overflow**: Tag with `kennex-ai`

### Professional Support
- **Documentation**: [docs.kennex.ai](https://docs.kennex.ai)
- **Support Portal**: [support.kennex.ai](https://support.kennex.ai)
- **Enterprise**: enterprise@kennex.ai

### Status & Updates
- **Status Page**: [status.kennex.ai](https://status.kennex.ai)
- **Blog**: [blog.kennex.ai](https://blog.kennex.ai)
- **Twitter**: [@kennex_ai](https://twitter.com/kennex_ai)

## 🗺️ Roadmap

### Q1 2024
- ✅ Core API development
- ✅ Twilio integration
- ✅ Real-time monitoring
- 🚧 Advanced analytics
- 📝 Enhanced security features

### Q2 2024
- 📝 Multi-tenant support
- 📝 Webhook system
- 📝 Advanced AI features
- 📝 Mobile SDK
- 📝 Third-party integrations

### Q3 2024
- 📝 GraphQL API
- 📝 Event streaming
- 📝 Advanced reporting
- 📝 Performance optimizations
- 📝 Global deployment

## 📊 Statistics

![GitHub stars](https://img.shields.io/github/stars/kennex-ai/backend?style=social)
![GitHub forks](https://img.shields.io/github/forks/kennex-ai/backend?style=social)
![GitHub issues](https://img.shields.io/github/issues/kennex-ai/backend)
![GitHub pull requests](https://img.shields.io/github/issues-pr/kennex-ai/backend)

---

<div align="center">
  
**[Website](https://kennex.ai)** • 
**[Documentation](https://docs.kennex.ai)** • 
**[API Reference](docs/API_DOCUMENTATION.md)** • 
**[Discord](https://discord.gg/kennex-ai)** • 
**[Twitter](https://twitter.com/kennex_ai)**

Made with ❤️ by the [Kennex AI Team](https://kennex.ai/team)

</div>