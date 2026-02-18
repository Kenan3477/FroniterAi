import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Force deployment to test schema migration

import config from './config';
import { connectDatabase } from './database';
import { connectRedis } from './config/redis';
import { errorHandler, notFound } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { ensureBasicAgents } from './utils/ensureBasicAgents';

// Import routes
// Auth routes - enable for frontend integration
import authRoutes from './routes/auth'; // Use proper Prisma-based authentication
// Agent routes for frontend integration
import agentRoutes from './routes/agent';
import agentsRoutes from './routes/agents';
import autoDialRoutes from './routes/autoDialRoutes'; // Auto-dial engine routes
import campaignRoutes from './routes/campaignsNew'; // NEW: Production campaign service
import interactionRoutes from './routes/interactionsNew'; // NEW: Production interaction service
// import queueRoutes from './routes/queue'; // TEMPORARILY DISABLED - schema conflicts
import reportsRoutes from './routes/reports';
import contactRoutes from './routes/contacts'; // Re-enabled for dial queue integration
// Import admin routes - RE-ENABLING CRITICAL ONES
import systemOverviewRoutes from './routes/systemOverview'; // Re-enabled after creating missing route file
// Enhanced user routes with enterprise features
import userRoutes from './routes/users'; // RE-ENABLED - stats endpoint for admin dashboard
import userManagementRoutes from './routes/userManagement'; // Enterprise user management system
import callRecordsRoutes from './routes/callRecords'; // Production call records service
import recordingRoutes from './routes/recordingRoutes'; // Call recording download and streaming
import { recordingFixRoutes } from './routes/recordingFix'; // ADMIN: Recording system fixes
// import apiManagementRoutes from './routes/apiManagement'; // Temporarily disabled - fixing schema issues
// import integrationRoutes from './routes/integrations'; // Temporarily disabled - fixing schema issues
// import businessSettingsRoutes from './routes/businessSettings'; // Temporarily disabled - fixing schema issues
// import campaignManagementRoutes from './routes/campaignManagement'; // DISABLED - schema conflicts
import campaignManagementRoutes from './routes/campaignManagement'; // RE-ENABLED - Fixed with proper Prisma integration
import businessSettingsRoutes from './routes/businessSettings'; // RE-ENABLED - Needed for frontend business settings
import webhookRoutes from './routes/webhooks'; // Re-enabled for Twilio webhook handling
import callsRoutes from './routes/callsRoutes'; // TwiML and call management routes
import adminSetupRoutes from './routes/adminSetup'; // Admin setup for initial user creation
// import callsRoutes from './routes/callsRoutes'; // SIP call control system - DISABLED due to schema conflicts
import dispositionsRoutes from './routes/dispositionsRoutes'; // Disposition collection system
import productionDialerRoutes from './routes/productionDialerRoutes'; // PRODUCTION: Real Twilio SIP integration
import callManagementRoutes from './routes/callManagementRoutes'; // PRODUCTION: Call state machine management
import inboundCallRoutes from './routes/inboundCallRoutes'; // PRODUCTION: Inbound call handling system
import routingRoutes from './routes/routingRoutes'; // Inbound call routing system
import voiceRoutes from './routes/voiceRoutes'; // Voice/telephony configuration for CLI selection
import inboundQueueRoutes from './routes/inboundQueueRoutes'; // Inbound queue management system
import cleanupRoutes from './routes/cleanup'; // ADMIN: Emergency cleanup endpoints
import kpiRoutes from './routes/kpi'; // Real database-driven KPI analytics
import dncRoutes from './routes/admin/dnc'; // DNC (Do Not Call) management system
import testRoutes from './routes/test'; // Testing and debugging endpoints
// Temporarily disabled routes with model conflicts - RE-ENABLING CRITICAL ONES
// import campaignRoutes from './routes/campaigns';
// import interactionRoutes from './routes/interactions';
// import analyticsRoutes from './routes/analytics'; // DISABLED - schema conflicts
// import webhookRoutes from './routes/webhooks'; // Temporarily disabled - fixing schema issues

// Import Omnivox-AI Flows routes - ENABLED
import flowRoutes from './routes/flows'; // ENABLED - User model conflict fixed
// import flowVersionRoutes from './routes/flowVersions'; // DISABLED - dependent on flows
// import nodeTypeRoutes from './routes/nodeTypes';
// import flowExecutionRoutes from './routes/flowExecution';

// Import Dialler System routes - STILL DISABLED DUE TO MISSING SERVICES
// import diallerAgentRoutes from './routes/diallerAgents'; // Disabled - missing services
// import diallerCampaignRoutes from './routes/diallerCampaigns'; // Disabled - schema issues  
// import diallerCallRoutes from './routes/diallerCalls'; // Disabled - missing services
import dialerRoutes from './routes/dialer'; // NEW: Twilio dialer routes
import dialQueueRoutes from './routes/dialQueue'; // NEW: Dial queue system
import eventTestRoutes from './routes/eventTest'; // NEW: Event system testing

// Phase 3: Advanced Features (Enhancement) Routes - RE-ENABLED
import flowVersioningRoutes from './routes/flowVersioning'; // NEW: Flow versioning and rollback system
import flowMonitoringRoutes from './routes/flowMonitoring'; // NEW: Real-time flow monitoring dashboard
import flowOptimizationRoutes from './routes/flowOptimization'; // NEW: AI-powered flow optimization
import multiTenantFlowRoutes from './routes/multiTenantFlow'; // NEW: Multi-tenant flow management

// Phase 3: Advanced AI Dialler Features - NEW
import sentimentAnalysisRoutes from './routes/sentimentAnalysis'; // NEW: Real-time sentiment analysis and coaching
// import autoDispositionRoutes from './routes/autoDisposition'; // NEW: AI-powered auto-disposition - TEMPORARILY DISABLED
import interactionHistoryRoutes from './routes/interactionHistory'; // NEW: Call history for manual and auto-dial

// Import socket handlers
import { initializeSocket } from './socket';

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
    this.initializeSocket();
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
    // Health check with database status
    this.app.get('/health', async (req, res) => {
      try {
        // Import database health check
        const { checkDatabaseHealth } = await import('./database/index');
        const dbHealth = await checkDatabaseHealth();
        
        res.json({
          status: 'ok',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          database: {
            connected: dbHealth,
            type: process.env.DATABASE_URL?.startsWith('postgresql://') ? 'PostgreSQL' : 'SQLite'
          },
          services: {
            recordings: 'ready', // Twilio recording streaming ready
            auth: 'ready',
            campaigns: 'ready'
          }
        });
      } catch (error) {
        res.status(503).json({
          status: 'degraded',
          timestamp: new Date().toISOString(),
          error: 'Health check failed',
          database: {
            connected: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    });

    // API routes - enable critical routes for frontend integration
    this.app.use('/api/auth', authRoutes); // Auth routes - enabled and working
    this.app.use('/api/agent', agentRoutes); // Single agent status
    this.app.use('/api/agents', agentsRoutes); // Agents queue and management
    this.app.use('/api/auto-dial', autoDialRoutes); // Auto-dial engine management
    this.app.use('/api/campaigns', campaignRoutes); // NEW: Production campaign management service
    this.app.use('/api/interactions', interactionRoutes); // NEW: Production interaction tracking service
    // this.app.use('/api/queue', queueRoutes); // Campaign queue management for agents - TEMPORARILY DISABLED
    this.app.use('/api/reports', reportsRoutes); // Reports endpoints
    this.app.use('/api/contacts', contactRoutes); // Contact management - re-enabled for dial queue
    this.app.use('/api/admin/users', userRoutes); // RE-ENABLED - stats endpoint for admin dashboard
    this.app.use('/api/users', userRoutes); // User endpoints for regular user access (my-campaigns, etc.)
    this.app.use('/api/user-management', userManagementRoutes); // Enterprise user management system
    this.app.use('/api/call-records', callRecordsRoutes); // Production call records service
    this.app.use('/api/recordings', recordingRoutes); // Call recording download and streaming
    // this.app.use('/api/admin/api', apiManagementRoutes); // Admin API management - temporarily disabled
    // this.app.use('/api/admin/integrations', integrationRoutes); // Admin integrations management - temporarily disabled
    // this.app.use('/api/admin/business-settings', businessSettingsRoutes); // DISABLED - schema conflicts
    // this.app.use('/api/admin/campaign-management', campaignManagementRoutes); // DISABLED - schema conflicts
    this.app.use('/api/admin/campaign-management', campaignManagementRoutes); // RE-ENABLED - Fixed with proper Prisma integration
    this.app.use('/api/admin/business-settings', businessSettingsRoutes); // RE-ENABLED - Needed for frontend business settings
    this.app.use('/api/admin/dnc', dncRoutes); // DNC (Do Not Call) management system
    this.app.use('/api/admin/system', systemOverviewRoutes); // Admin system overview - re-enabled
    // Temporarily disabled routes with model conflicts - RE-ENABLING CRITICAL ONES
    // this.app.use('/api/contacts', contactRoutes); // DISABLED - schema conflicts
    // this.app.use('/api/campaigns', campaignRoutes); // Disabled - model not in schema
    // this.app.use('/api/interactions', interactionRoutes); // Disabled - model not in schema
    // this.app.use('/api/analytics', analyticsRoutes); // DISABLED - schema conflicts
    this.app.use('/api/webhooks', webhookRoutes); // Re-enabled for Twilio webhook handling
    this.app.use('/api/calls-twiml', callsRoutes); // TwiML and call management routes
    this.app.use('/api/admin-setup', adminSetupRoutes); // Admin setup for initial user creation
    this.app.use('/api/admin', cleanupRoutes); // TEMPORARILY ENABLED: Admin cleanup endpoints for demo record removal
    this.app.use('/api/admin/recordings', recordingFixRoutes); // ADMIN: Recording system fixes and data creation
    this.app.use('/api/test', testRoutes); // Testing and debugging endpoints
    this.app.use('/api/dispositions', dispositionsRoutes); // Disposition collection system
    this.app.use('/api/routing', routingRoutes); // Inbound call routing system
    this.app.use('/api/voice', voiceRoutes); // Voice/telephony configuration for CLI selection
    this.app.use('/api/voice', inboundQueueRoutes); // Inbound queue management system (under /api/voice/inbound-queues)
    this.app.use('/api/dialer', productionDialerRoutes); // PRODUCTION: Real Twilio SIP dialer with telephony integration
    this.app.use('/api/call-management', callManagementRoutes); // PRODUCTION: Call state machine for finite-state call lifecycle management
    this.app.use('/api/interaction-history', interactionHistoryRoutes); // NEW: Call history for manual and auto-dial with categorization

    // Omnivox-AI Flows API routes - ENABLED
    this.app.use('/api/flows', flowRoutes); // ENABLED - User model conflict fixed
    // this.app.use('/api/flows/:flowId/versions', flowVersionRoutes); // DISABLED - dependent on flows
    // this.app.use('/api/flow-node-types', nodeTypeRoutes);
    // this.app.use('/api/flow-execution', flowExecutionRoutes);

    // Phase 3: Advanced Features (Enhancement) Routes - RE-ENABLED
    this.app.use('/api/flow-versioning', flowVersioningRoutes); // Flow versioning and rollback system
    this.app.use('/api/flow-monitoring', flowMonitoringRoutes); // Real-time flow monitoring dashboard
    this.app.use('/api/flow-optimization', flowOptimizationRoutes); // AI-powered flow optimization
    this.app.use('/api/multi-tenant', multiTenantFlowRoutes); // Multi-tenant flow management

    // Phase 3: Advanced AI Dialler Features - NEW
    this.app.use('/api/sentiment', sentimentAnalysisRoutes); // Real-time sentiment analysis and coaching
    // this.app.use('/api/auto-disposition', autoDispositionRoutes); // AI-powered auto-disposition - TEMPORARILY DISABLED

    // Dialler System API routes - STILL DISABLED DUE TO MISSING SERVICES
    // this.app.use('/api/dialler/agents', diallerAgentRoutes); // Disabled - missing services
    // this.app.use('/api/dialler/campaigns', diallerCampaignRoutes); // Disabled - schema issues
    // this.app.use('/api/dialler/calls', diallerCallRoutes); // Disabled - missing services
    this.app.use('/api/kpi', kpiRoutes); // Re-enabled with basic implementation
    
    // NEW: Twilio Dialer API routes - THIS IS THE ONE WE NEED FOR TOKENS
    this.app.use('/api/calls', dialerRoutes); // Twilio-based dialer system (includes /token endpoint)
    this.app.use('/api/calls', inboundCallRoutes); // PRODUCTION: Inbound call handling webhooks and management
    this.app.use('/api/dial-queue', dialQueueRoutes); // Dial queue system for auto-dialer
    this.app.use('/api/events', eventTestRoutes); // Real-time event system testing

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Omnivox-AI API',
        version: '1.0.0',
        description: 'Omnivox-AI Platform API Server',
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
    initializeSocket(this.io);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();
      console.log('✅ Database connected');

      // Connect to Redis
      await connectRedis();
      console.log('✅ Redis connected');

      // Ensure basic system agents exist
      await ensureBasicAgents();

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