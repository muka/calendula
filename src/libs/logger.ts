
import winston from 'winston'
import { colorize } from './colors.js'

export const createLogger = (context?: string, metadata?: Record<string, string>) => {

    const defaultMeta = metadata ? { ...metadata } : {}

    if (context) defaultMeta.context = context


    const contextFormatter = winston.format((info) => {
        const {message} = info;

        if (info.context) {
          info.message = `[${colorize(info.context.toString())}] ${message}`;
          delete info.context;
        }
        
        return info;
    })();

    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.json(),
        defaultMeta,
        transports: [
            new winston.transports.Console({
                
                format: winston.format.combine(
                    winston.format.colorize(),                    
                    contextFormatter,
                    winston.format.simple(),
                ),
            })
        ]
    })
}

export const logger = createLogger()