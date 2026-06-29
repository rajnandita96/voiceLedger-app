/**
 * Debug utility — structured logging for development.
 * Logs to both console and an in-memory ring buffer for in-app viewing.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

const MAX_ENTRIES = 200;
const ringBuffer: LogEntry[] = [];

function formatTime(): string {
  const d = new Date();
  return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + d.getMilliseconds().toString().padStart(3, '0');
}

function addEntry(level: LogLevel, message: string, data?: unknown) {
  const entry: LogEntry = {
    timestamp: formatTime(),
    level,
    message,
    data,
  };
  ringBuffer.push(entry);
  if (ringBuffer.length > MAX_ENTRIES) {
    ringBuffer.shift();
  }

  // Also log to console in dev
  if (__DEV__) {
    const prefix = `[VoiceLedger:${level.toUpperCase()}]`;
    if (data !== undefined) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

export const logger = {
  debug: (msg: string, data?: unknown) => addEntry('debug', msg, data),
  info: (msg: string, data?: unknown) => addEntry('info', msg, data),
  warn: (msg: string, data?: unknown) => addEntry('warn', msg, data),
  error: (msg: string, data?: unknown) => addEntry('error', msg, data),

  /** Get all stored log entries (newest first) */
  getEntries: (): LogEntry[] => [...ringBuffer].reverse(),

  /** Clear the log buffer */
  clear: () => { ringBuffer.length = 0; },

  /** Dump all logs as a string (useful for copy-paste) */
  dump: (): string =>
    ringBuffer.map((e) => `[${e.timestamp}] ${e.level.toUpperCase()} ${e.message}`).join('\n'),
};
