import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

import config from './config';
import { connectDatabase } from './database';
import { connectRedis } from './config/redis';
import { errorHandler, notFound } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Import routes
// Auth routes - enable for frontend integration
import authRoutes from './routes/auth';
// Agent routes for frontend integration
import agentRoutes from './routes/agent';
import agentsRoutes from './routes/agents';
import campaignRoutes from './routes/campaigns';
import reportsRoutes from './routes/reports';
import contactRoutes from './routes/contacts'; // Re-enabled for dial queue integration
// Import admin routes - RE-ENABLING CRITICAL ONES
// import systemOverviewRoutes from './routes/systemOverview'; // Temporarily disabled due to file corruption
// Temporarily disabled due to schema conflicts
// import userRoutes from './routes/users'; // Temporarily disabled - fixing schema issues
// import apiManagementRoutes from './routes/apiManagement'; // Temporarily disabled - fixing schema issues
// import integrationRoutes from './routes/integrations'; // Temporarily disabled - fixing schema issues
// import businessSettingsRoutes from './routes/businessSettings'; // Temporarily disabled - fixing schema issues
// import campaignManagementRoutes from './routes/campaignManagement'; // Temporarily disabled - fixing schema issues
// Temporarily disabled routes with model conflicts - RE-ENABLING CRITICAL ONES
// import contactRoutes from './routes/contacts'; // DISABLED - schema conflicts
// import campaignRoutes from './routes/campaigns';
// import interactionRoutes from './routes/interactions';
// import analyticsRoutes from './routes/analytics'; // DISABLED - schema conflicts
// import webhookRoutes from './routes/webhooks'; // Temporarily disabled - fixing schema issues

// Import Kennex Flows routes
// Temporarily disabled due to schema conflicts
// import flowRoutes from './routes/flows';
// import flowVersionRoutes from './routes/flowVersions';
// import nodeTypeRoutes from './routes/nodeTypes';
// import flowExecutionRoutes from './routes/flowExecution';

// Import Dialler System routes - STILL DISABLED DUE TO MISSING SERVICES
// import diallerAgentRoutes from './routes/diallerAgents'; // Disabled - missing services
// import diallerCampaignRoutes from './routes/diallerCampaigns'; // Disabled - schema issues  
// import diallerCallRoutes from './routes/diallerCalls'; // Disabled - missing services
// import kpiRoutes from './routes/kpi'; // Temporarily disabled - fixing schema issues
import dialerRoutes from './routes/dialer'; // NEW: Twilio dialer routes
import dialQueueRoutes from './routes/dialQueue'; // NEW: Dial queue system

// Import socket handlers
// import { initializeSocket } from './socket'; // Temporarily disabled due to campaignService dependency

class App {
  public app: express.Application;
  public server: any;
  public io: Server;

  constructor() {
    this.app = express();
    
    // Trust proxy - required for Railway and rate limiting
    this.app.set('trust proxy', 1);
    
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.frontend.url,
        credentials: true,
      },
    });

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    // this.initializeSocket(); // Temporarily disabled due to campaignService dependency
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    
    // CORS - Allow all origins for development
    this.app.use(cors({
      origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow all origins in development
        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      maxAge: 86400 // 24 hours
    }));

    // Compression
    this.app.use(compression());

    // Logging
    this.app.use(morgan('combined'));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(rateLimiter);
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
      });
    });

    // API routes - enable critical routes for frontend integration
    this.app.use('/api/auth', authRoutes); // Auth routes - enabled and working
    this.app.use('/api/agent', agentRoutes); // Single agent status
    this.app.use('/api/agents', agentsRoutes); // Agents queue and management
    this.app.use('/api/campaigns', campaignRoutes); // Campaign management
    this.app.use('/api/reports', reportsRoutes); // Reports endpoints
    this.app.use('/api/contacts', contactRoutes); // Contact management - re-enabled for dial queue
    // this.app.use('/api/admin/users', userRoutes); // Admin user management - temporarily disabled
    // this.app.use('/api/admin/api', apiManagementRoutes); // Admin API management - temporarily disabled
    // this.app.use('/api/admin/integrations', integrationRoutes); // Admin integrations management - temporarily disabled
    // this.app.use('/api/admin/business-settings', businessSettingsRoutes); // Admin business settings management - temporarily disabled
    // this.app.use('/api/admin/campaign-management', campaignManagementRoutes); // Admin campaign management - temporarily disabled
    // this.app.use('/api/admin/system', systemOverviewRoutes); // Admin system overview - temporarily disabled due to file corruption
    // Temporarily disabled routes with model conflicts - RE-ENABLING CRITICAL ONES
    // this.app.use('/api/contacts', contactRoutes); // DISABLED - schema conflicts
    // this.app.use('/api/campaigns', campaignRoutes); // Disabled - model not in schema
    // this.app.use('/api/interactions', interactionRoutes); // Disabled - model not in schema
    // this.app.use('/api/analytics', analyticsRoutes); // DISABLED - schema conflicts
    // this.app.use('/api/webhooks', webhookRoutes); // Temporarily disabled - fixing schema issues

    // Kennex Flows API routes - temporarily disabled
    // this.app.use('/api/flows', flowRoutes);
    // this.app.use('/api/flows/:flowId/versions', flowVersionRoutes);
    // this.app.use('/api/flow-node-types', nodeTypeRoutes);
    // this.app.use('/api/flow-execution', flowExecutionRoutes);

    // Dialler System API routes - STILL DISABLED DUE TO MISSING SERVICES
    // this.app.use('/api/dialler/agents', diallerAgentRoutes); // Disabled - missing services
    // this.app.use('/api/dialler/campaigns', diallerCampaignRoutes); // Disabled - schema issues
    // this.app.use('/api/dialler/calls', diallerCallRoutes); // Disabled - missing services
    // this.app.use('/api/kpi', kpiRoutes); // Temporarily disabled - fixing schema issues
    
    // NEW: Twilio Dialer API routes
    this.app.use('/api/calls', dialerRoutes); // Twilio-based dialer system
    this.app.use('/api/dial-queue', dialQueueRoutes); // Dial queue system for auto-dialer

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Kennex API',
        version: '1.0.0',
        description: 'Kennex AI Platform API Server',
        endpoints: {
          auth: '/api/auth',
          users: '/api/users',
          contacts: '/api/contacts',
          campaigns: '/api/campaigns',
          interactions: '/api/interactions',
          analytics: '/api/analytics',
          webhooks: '/api/webhooks',
          flows: '/api/flows',
          flowNodeTypes: '/api/flow-node-types',
          flowExecution: '/api/flow-execution',
          diallerAgents: '/api/dialler/agents',
          diallerCampaigns: '/api/dialler/campaigns',
          diallerCalls: '/api/dialler/calls',
        },
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFound);
    
    // Error handler
    this.app.use(errorHandler);
  }

  private initializeSocket(): void {
    // initializeSocket(this.io); // Temporarily disabled due to campaignService dependency
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();
      console.log('✅ Database connected');

      // Connect to Redis
      await connectRedis();
      console.log('✅ Redis connected');

      // Start server
      const port = config.server.port;
      this.server.listen(port, () => {
        console.log(`🚀 Server running on port ${port}`);
        console.log(`📚 API documentation available at http://localhost:${port}/api`);
        console.log(`🩺 Health check available at http://localhost:${port}/health`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the application
const app = new App();
app.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;