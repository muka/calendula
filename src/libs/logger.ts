
import winston from 'winston'
import { colorize } from './colors.js'
import { getConfig } from './config.js'

export const createLogger = (label = "logger", metadata?: Record<string, string>) => {

    const defaultMeta = metadata ? { ...metadata } : {}

    return winston.createLogger({
        level: getConfig('LOG_LEVEL'),
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