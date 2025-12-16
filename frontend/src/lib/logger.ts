import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each log level
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, correlationId, userId, ...meta } = info;
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const correlationStr = correlationId ? ` [${correlationId}]` : '';
    const userStr = userId ? ` [User:${userId}]` : '';
    return `${timestamp} [${level}]${correlationStr}${userStr}: ${message}${metaStr}`;
  })
);

// Custom format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: fileFormat,
  defaultMeta: { 
    service: 'kennex-api',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error log file
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      auditFile: 'logs/.audit/error-audit.json'
    }),

    // Combined log file
    new DailyRotateFile({
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      auditFile: 'logs/.audit/combined-audit.json'
    }),

    // HTTP requests log
    new DailyRotateFile({
      filename: 'logs/http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '7d',
      auditFile: 'logs/.audit/http-audit.json'
    })
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Create correlation ID for request tracking
export const generateCorrelationId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Enhanced logger with correlation ID support
export class Logger {
  private correlationId?: string;
  private userId?: number;

  constructor(correlationId?: string, userId?: number) {
    this.correlationId = correlationId;
    this.userId = userId;
  }

  private log(level: string, message: string, meta: any = {}) {
    const logData = {
      ...meta,
      correlationId: this.correlationId,
      userId: this.userId
    };

    logger.log(level, message, logData);
  }

  error(message: string, meta?: any) {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: any) {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: any) {
    this.log('info', message, meta);
  }

  http(message: string, meta?: any) {
    this.log('http', message, meta);
  }

  debug(message: string, meta?: any) {
    this.log('debug', message, meta);
  }

  // Log API request
  logRequest(method: string, url: string, ip: string, userAgent?: string) {
    this.http(`${method} ${url}`, {
      ip,
      userAgent,
      type: 'request'
    });
  }

  // Log API response
  logResponse(method: string, url: string, statusCode: number, responseTime: number) {
    this.http(`${method} ${url} - ${statusCode}`, {
      statusCode,
      responseTime,
      type: 'response'
    });
  }

  // Log database query
  logQuery(query: string, duration: number, recordCount?: number) {
    this.debug('Database query', {
      query,
      duration,
      recordCount,
      type: 'database'
    });
  }

  // Log authentication events
  logAuth(event: string, userId?: number, details?: any) {
    this.info(`Authentication: ${event}`, {
      userId,
      ...details,
      type: 'authentication'
    });
  }

  // Log business events
  logBusiness(event: string, details?: any) {
    this.info(`Business event: ${event}`, {
      ...details,
      type: 'business'
    });
  }

  // Log security events
  logSecurity(event: string, details?: any) {
    this.warn(`Security event: ${event}`, {
      ...details,
      type: 'security'
    });
  }
}

// Default logger instance
export const defaultLogger = new Logger();

export default logger;