import morgan from 'morgan';
import fs from 'fs';
import path from 'path';

// ==================== LOG DIRECTORY SETUP ====================
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ==================== LOG STREAMS ====================
const accessLogStream = fs.createWriteStream(
  path.join(logDir, 'access.log'),
  { flags: 'a' }
);

const errorLogStream = fs.createWriteStream(
  path.join(logDir, 'error.log'),
  { flags: 'a' }
);

// ==================== MORGAN CONFIGURATION ====================
export const accessLogger = morgan('combined', { stream: accessLogStream });

export const consoleLogger = morgan('dev');

// ==================== ERROR LOGGER ====================
export const logError = (error: Error, context?: string) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${context || 'ERROR'}: ${error.message}\n${error.stack}\n\n`;
  
  errorLogStream.write(message);
  console.error(message);
};

// ==================== REQUEST LOGGER ====================
export const logRequest = (method: string, url: string, userId?: string) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${method} ${url} - User: ${userId || 'anonymous'}\n`;
  
  accessLogStream.write(message);
};