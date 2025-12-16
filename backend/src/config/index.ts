import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface Config {
  server: {
    port: number;
    env: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshSecret: string;
    refreshExpiresIn: string;
  };
  frontend: {
    url: string;
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3Bucket: string;
  };
  openai: {
    apiKey: string;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
}

const config: Config = {
  server: {
    port: parseInt(process.env.API_PORT || '3001', 10),
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/kennex_db',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
};

export default config;