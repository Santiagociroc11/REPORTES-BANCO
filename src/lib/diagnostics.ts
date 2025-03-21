type LogLevel = 'info' | 'warn' | 'error';

interface LogMessage {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  details?: unknown;
}

class Diagnostics {
  private log(level: LogLevel, module: string, message: string, details?: unknown) {
    const logMessage: LogMessage = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      details
    };

    switch (level) {
      case 'info':
        console.log(`[${logMessage.module}] ${logMessage.message}`, details || '');
        break;
      case 'warn':
        console.warn(`[${logMessage.module}] ${logMessage.message}`, details || '');
        break;
      case 'error':
        console.error(`[${logMessage.module}] ${logMessage.message}`, details || '');
        break;
    }
  }

  info(module: string, message: string, details?: unknown) {
    this.log('info', module, message, details);
  }

  warn(module: string, message: string, details?: unknown) {
    this.log('warn', module, message, details);
  }

  error(module: string, message: string, details?: unknown) {
    this.log('error', module, message, details);
  }
}

export const diagnostics = new Diagnostics();