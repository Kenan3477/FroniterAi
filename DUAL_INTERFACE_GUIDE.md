# 🌐 Frontier AI - Dual Interface System

## Available Interfaces

Your Railway deployment of Frontier AI provides **two distinct interfaces** accessible through different URLs:

### 1. 🤖 Frontier AI Business Dashboard (Main Interface)
**URL**: `https://your-app.up.railway.app/`

**Features**:
- Advanced conversational AI chat interface
- Business operations suite
- Financial analysis tools
- Business formation capabilities
- Web development services
- Compliance management
- Marketing automation
- Professional user interface

**Purpose**: Primary interface for business users to interact with Frontier AI's business capabilities.

### 2. 🧬 Self-Evolution Monitoring Dashboard
**URL**: `https://your-app.up.railway.app/evolution`

**Features**:
- Real-time evolution system monitoring
- Live task creation and management
- Performance metrics and statistics
- System status and health monitoring
- Evolution cycle tracking
- File generation statistics
- Self-improvement progress

**Purpose**: Technical dashboard for monitoring the AI's self-evolution capabilities and system performance.

## Navigation Between Interfaces

### From Business Dashboard → Evolution Monitor
- Click the "🧬 Evolution Monitor" button in the header
- Or navigate directly to `/evolution`

### From Evolution Monitor → Business Dashboard  
- Click the "🤖 AI Dashboard" button in the header
- Or navigate directly to `/` or `/dashboard`

## API Endpoints

Both interfaces share the same backend APIs:

- **Chat API**: `/api/chat` - Conversational AI processing
- **Stats API**: `/api/stats` - System statistics
- **Task API**: `/add_task` - Add evolution tasks

## Deployment Architecture

```
Railway Deployment
├── Frontend Business Interface (/)
│   ├── Conversational AI
│   ├── Business Operations
│   └── Professional UI
│
├── Evolution Monitor (/evolution)
│   ├── Real-time Monitoring
│   ├── Task Management
│   └── Performance Metrics
│
└── Shared Backend APIs
    ├── Evolution System
    ├── Business Modules
    └── Chat Processing
```

## Use Cases

### Business Users
1. Access main dashboard at `/`
2. Use conversational interface for business tasks
3. Monitor results and performance

### Technical Users/Administrators
1. Access evolution monitor at `/evolution`
2. Monitor AI self-improvement
3. Add technical evolution tasks
4. Track system performance

### Hybrid Usage
- Start with business interface for operations
- Switch to evolution monitor for technical insights
- Both interfaces complement each other

## Railway Deployment URLs

After deploying to Railway, you'll have:

- **Main Business Interface**: `https://your-project.up.railway.app/`
- **Evolution Monitor**: `https://your-project.up.railway.app/evolution`
- **API Chat**: `https://your-project.up.railway.app/api/chat`
- **System Stats**: `https://your-project.up.railway.app/api/stats`

This dual-interface system provides both user-friendly business capabilities and technical monitoring in a single, cohesive deployment! 🚀
