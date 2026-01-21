import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom format for development (readable)
const devFormat = printf(({ level, message, timestamp, context, trace, ...metadata }) => {
  let msg = `${timestamp} [${context || 'Application'}] ${level}: ${message}`;

  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  if (trace) {
    msg += `\n${trace}`;
  }

  return msg;
});

// Custom format for production (JSON for log aggregators)
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const winstonConfig = (nodeEnv: string, logLevel: string): WinstonModuleOptions => {
  const isDev = nodeEnv !== 'production';

  return {
    transports: [
      // Console transport
      new winston.transports.Console({
        level: logLevel,
        format: isDev
          ? combine(
              colorize({ all: true }),
              timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              errors({ stack: true }),
              devFormat
            )
          : prodFormat,
      }),

      // File transport for errors (production only)
      ...(isDev
        ? []
        : [
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              format: prodFormat,
              maxsize: 5242880, // 5MB
              maxFiles: 5,
            }),
            new winston.transports.File({
              filename: 'logs/combined.log',
              format: prodFormat,
              maxsize: 5242880, // 5MB
              maxFiles: 5,
            }),
          ]),
    ],
  };
};

// Logger instance for use outside of NestJS context
export const createLogger = (nodeEnv: string, logLevel: string) => {
  const isDev = nodeEnv !== 'production';

  return winston.createLogger({
    level: logLevel,
    format: isDev
      ? combine(
          colorize({ all: true }),
          timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          errors({ stack: true }),
          devFormat
        )
      : prodFormat,
    transports: [
      new winston.transports.Console(),
      ...(isDev
        ? []
        : [
            new winston.transports.File({
              filename: 'logs/error.log',
              level: 'error',
              maxsize: 5242880,
              maxFiles: 5,
            }),
            new winston.transports.File({
              filename: 'logs/combined.log',
              maxsize: 5242880,
              maxFiles: 5,
            }),
          ]),
    ],
  });
};
