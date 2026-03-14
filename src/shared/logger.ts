/**
 * Logger estruturado JSON — substituto de console.log em todo o projeto.
 *
 * Uso:
 *   import { logger } from '@/shared/logger';
 *   logger.info('Mensagem', { orderId: '123' });
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  const output = JSON.stringify(entry);

  switch (level) {
    case 'ERROR':
      process.stderr.write(output + '\n');
      break;
    case 'WARN':
      process.stderr.write(output + '\n');
      break;
    default:
      process.stdout.write(output + '\n');
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('DEBUG', message, meta),
  info:  (message: string, meta?: Record<string, unknown>) => log('INFO', message, meta),
  warn:  (message: string, meta?: Record<string, unknown>) => log('WARN', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('ERROR', message, meta),

  /** Cria um logger com campos fixos pré-preenchidos */
  child: (defaults: Record<string, unknown>) => ({
    debug: (msg: string, meta?: Record<string, unknown>) => log('DEBUG', msg, { ...defaults, ...meta }),
    info:  (msg: string, meta?: Record<string, unknown>) => log('INFO', msg, { ...defaults, ...meta }),
    warn:  (msg: string, meta?: Record<string, unknown>) => log('WARN', msg, { ...defaults, ...meta }),
    error: (msg: string, meta?: Record<string, unknown>) => log('ERROR', msg, { ...defaults, ...meta }),
  }),
};
