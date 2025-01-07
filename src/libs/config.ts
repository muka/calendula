import 'dotenv/config'

export const configNamesList = [
    'PROVIDER',
    'PROVIDER_MODEL',
    'PROVIDER_API_KEY',
    'PROVIDER_BASEURL',
    'LOG_LEVEL',
    'CONFIG_PATH',
] as const

export type ConfigName = typeof configNamesList[number]

export const defaultConfig: Record<ConfigName, string|undefined> = {
    LOG_LEVEL: 'info',
    PROVIDER: 'openai',
    PROVIDER_MODEL: 'gpt-4o-mini',
    PROVIDER_API_KEY: undefined,
    PROVIDER_BASEURL: undefined,
    CONFIG_PATH: './config',
} as const


export const getConfig = (name: ConfigName, value?: string|undefined) => {
    return value || process.env[name] || defaultConfig[name]
}