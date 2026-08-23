import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 8000),
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hackdekh',
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'fallback_access_secret_32_chars_minimum',
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '1d',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret_32_chars_minimum',
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || '10d',
  cronSecret: process.env.CRON_SECRET || 'hackdekh_cron_secret',
  githubClientId: process.env.GITHUB_CLIENT_ID || '',
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
};

export function validateEnv() {
  const missingRequired: string[] = [];

  if (config.isProduction) {
    if (!process.env.MONGODB_URI && !process.env.MONGO_URI) missingRequired.push('MONGODB_URI');
    if (!process.env.ACCESS_TOKEN_SECRET) missingRequired.push('ACCESS_TOKEN_SECRET');
    if (!process.env.REFRESH_TOKEN_SECRET) missingRequired.push('REFRESH_TOKEN_SECRET');
  }

  if (missingRequired.length > 0) {
    console.error('[Config] CRITICAL ERROR: Missing required environment variables:', missingRequired.join(', '));
    if (config.isProduction) {
      process.exit(1);
    }
  }
}
