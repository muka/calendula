
import winston from 'winston'
import { colorize } from './colors.js'

export const createLogger = (label = "logger", metadata?: Record<string, string>) => {

    const defaultMeta = metadata ? { ...metadata } : {}

    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: winston.format.json(),
        defaultMeta,
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.printf(msg =>
                        `${label ? '[' + colorize(label) + '] ' : '' }${winston.format.colorize().colorize(msg.level, msg.level)} ${msg.message}`
                    )
                ),
            })
        ]
    })
}

export const logger = createLogger()