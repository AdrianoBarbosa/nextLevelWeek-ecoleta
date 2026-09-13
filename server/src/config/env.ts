import 'dotenv/config'

export const appConfig = {
    isTest: process.env.NODE_ENV === 'test',
    url: (process.env.APP_URL || 'http://localhost:3333').replace(/\/$/, ''),
    port: Number(process.env.PORT) || 3333,
    corsOrigin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
        : '*',
    trustProxy: process.env.TRUST_PROXY,
    authRateLimit: Number(process.env.AUTH_RATE_LIMIT) || 10,
}
