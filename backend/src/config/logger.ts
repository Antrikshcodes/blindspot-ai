type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: string;
  data?: unknown;
}

class Logger {
  private formatMessage(level: LogLevel, message: string, context?: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}] ` : '';
    const formattedData = data ? ` ${JSON.stringify(data, null, 2)}` : '';
    return `${timestamp} [${level.toUpperCase()}] ${ctx}${message}${formattedData}`;
  }

  info(message: string, context?: string, data?: unknown): void {
    console.log(this.formatMessage('info', message, context, data));
  }

  warn(message: string, context?: string, data?: unknown): void {
    console.warn(this.formatMessage('warn', message, context, data));
  }

  error(message: string, context?: string, data?: unknown): void {
    console.error(this.formatMessage('error', message, context, data));
  }

  debug(message: string, context?: string, data?: unknown): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message, context, data));
    }
  }
}

export const logger = new Logger();
