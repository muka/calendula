
import winston from 'winston'

export const createLogger = (context?: string, metadata?: Record<string, string>) => {

    const defaultMeta = metadata ? { ...metadata } : {}

    if (context) defaultMeta.context = context

    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.json(),
        defaultMeta,
        transports: [
            new winston.transports.Console({
                format: winston.format.simple(),
            })
        ]
    })
}

export const logger = createLogger()