import pino from 'pino';
import type { OrgNoteApi } from 'orgnote-api';

type Logger = OrgNoteApi['utils']['logger'];

const getBrowserConfig = () => ({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  browser: {
    asObject: true,
    transmit: {
      level: 'info',
      send: (level: string, logEvent: pino.LogEvent) => {
        const { ts, messages, bindings } = logEvent;
        const timestamp = new Date(ts).toISOString();
        const context = bindings && bindings.length > 0 ? bindings : '';
        console.log(`[${timestamp}] ${level.toUpperCase()}:`, ...messages, context);
      },
    },
  },
});

const getServerConfig = () => ({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

const createLogMethod =
  (pinoLogger: pino.Logger, method: keyof pino.Logger) =>
  (msg: string, ...args: unknown[]) => {
    const hasObjectArg = args.length > 0 && args[0] && typeof args[0] === 'object';

    if (hasObjectArg) {
      (pinoLogger[method] as (obj: Record<string, unknown>, msg: string) => void)(
        args[0] as Record<string, unknown>,
        msg,
      );
      return;
    }

    (pinoLogger[method] as (msg: string) => void)(msg);
  };

const createLoggerAdapter = (pinoLogger: pino.Logger): Logger => ({
  info: createLogMethod(pinoLogger, 'info'),
  error: createLogMethod(pinoLogger, 'error'),
  warn: createLogMethod(pinoLogger, 'warn'),
  debug: createLogMethod(pinoLogger, 'debug'),
  trace: createLogMethod(pinoLogger, 'trace'),
  child: (bindings: Record<string, unknown>) => {
    const childPino = pinoLogger.child(bindings);
    return createLoggerAdapter(childPino);
  },
});

const createPinoLogger = (): Logger => {
  const isClient = !!process.env.CLIENT;
  const config = isClient ? getBrowserConfig() : getServerConfig();
  const pinoInstance = pino(config);

  return createLoggerAdapter(pinoInstance);
};

export { createPinoLogger };
