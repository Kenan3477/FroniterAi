/**
 * Email Service for Omnivox-AI
 * Handles organization welcome emails and password setup
 */

import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// Email configuration from environment variables
const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  from: process.env.SMTP_FROM || 'noreply@omnivox-ai.com'
};

// Create reusable transporter object
const transporter = nodemailer.createTransport(emailConfig);

/**
 * Generate password setup token and URL
 */
export const generatePasswordSetupToken = (email: string): { token: string; expires: Date } => {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return { token, expires };
};

/**
 * Send organization welcome email with password setup link
 */
export const sendOrganizationWelcomeEmail = async (
  email: string,
  organizationName: string,
  setupToken: string,
  baseUrl: string = process.env.FRONTEND_URL || 'https://omnivox-ai.vercel.app'
): Promise<boolean> => {
  try {
    const setupUrl = `${baseUrl}/setup-password?token=${setupToken}&email=${encodeURIComponent(email)}`;
    
    const mailOptions = {
      from: emailConfig.from,
      to: email,
      subject: `Welcome to Omnivox-AI - Set up your account for ${organizationName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Omnivox-AI</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 40px 30px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .header p { color: #dbeafe; margin: 10px 0 0 0; font-size: 16px; }
            .content { padding: 40px 30px; }
            .content h2 { color: #1f2937; margin: 0 0 20px 0; font-size: 24px; }
            .content p { color: #6b7280; line-height: 1.6; margin: 16px 0; }
            .cta-button { display: inline-block; background: #1e40af; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .cta-button:hover { background: #1d4ed8; }
            .features { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .feature { margin: 10px 0; color: #374151; }
            .feature strong { color: #1f2937; }
            .footer { padding: 20px 30px; background: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb; }
            .footer p { color: #6b7280; font-size: 14px; margin: 0; }
            .security-note { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .security-note p { color: #92400e; margin: 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎯 Welcome to Omnivox-AI</h1>
              <p>Your AI-Powered Dialler Platform</p>
            </div>
            
            <div class="content">
              <h2>Welcome to ${organizationName}!</h2>
              
              <p>Your organization has been successfully created in Omnivox-AI. You have been designated as the <strong>Super Administrator</strong> for your organization.</p>
              
              <p>As a Super Admin, you'll have complete control over:</p>
              
              <div class="features">
                <div class="feature">📊 <strong>Dashboard & Analytics</strong> - Monitor call performance and team metrics</div>
                <div class="feature">👥 <strong>User Management</strong> - Add agents, supervisors, and manage roles</div>
                <div class="feature">📞 <strong>Campaign Setup</strong> - Create and manage dialing campaigns</div>
                <div class="feature">🤖 <strong>AI Configuration</strong> - Set up sentiment analysis and auto-disposition</div>
                <div class="feature">⚙️ <strong>System Settings</strong> - Configure organization preferences</div>
              </div>
              
              <p>To get started, please set up your password by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${setupUrl}" class="cta-button">Set Up Your Password</a>
              </div>
              
              <div class="security-note">
                <p><strong>Security Notice:</strong> This link is valid for 24 hours. If you didn't request this account, please ignore this email.</p>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this URL into your browser:</p>
              <p style="word-break: break-all; color: #6b7280; font-size: 14px;">${setupUrl}</p>
              
              <p>If you need any help getting started, our team is ready to assist you.</p>
              
              <p>Welcome to the future of intelligent dialing!</p>
              <p><strong>The Omnivox-AI Team</strong></p>
            </div>
            
            <div class="footer">
              <p>&copy; 2026 Omnivox-AI. Professional AI-Powered Dialler Platform.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to Omnivox-AI!
        
        Your organization "${organizationName}" has been successfully created.
        You have been designated as the Super Administrator.
        
        To get started, please set up your password by visiting:
        ${setupUrl}
        
        This link is valid for 24 hours.
        
        If you need assistance, contact our support team.
        
        Welcome to the future of intelligent dialing!
        The Omnivox-AI Team
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', info.messageId);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    return false;
  }
};

/**
 * Verify email service configuration
 */
export const verifyEmailService = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log('✅ Email service is ready');
    return true;
  } catch (error) {
    console.error('❌ Email service verification failed:', error);
    return false;
  }
};

export default {
  sendOrganizationWelcomeEmail,
  generatePasswordSetupToken,
  verifyEmailService
};