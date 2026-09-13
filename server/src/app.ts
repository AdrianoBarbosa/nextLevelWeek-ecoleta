import fs from 'node:fs/promises'
import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import multer from 'multer'
import { errors } from 'celebrate'

import routes from './routes.ts'
import { appConfig } from './config/env.ts'
import { paths } from './config/paths.ts'
import { InvalidImageError } from './config/upload.ts'

const app = express()

app.disable('x-powered-by')

// Atrás de um proxy reverso o rate limit precisa do IP real do cliente (ex.: TRUST_PROXY=1).
if (appConfig.trustProxy)
    app.set('trust proxy', Number(appConfig.trustProxy) || appConfig.trustProxy)

app.use(helmet({
    // As imagens são exibidas pelo site e pelo app, que rodam em outras origens.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({ origin: appConfig.corsOrigin }))
app.use(express.json({ limit: '10kb' }))
app.use(routes)

app.use('/uploads', express.static(paths.uploads))
app.use('/assets/items', express.static(paths.itemImages))

// Remove a imagem enviada quando a requisição falha depois do upload (ex.: validação do corpo).
app.use(async (err: Error, request: Request, response: Response, next: NextFunction) => {
    if (request.file)
        await fs.rm(request.file.path, { force: true })

    next(err)
})

app.use(errors())

app.use((err: Error & { type?: string, status?: number }, request: Request, response: Response, next: NextFunction) => {
    if (err instanceof InvalidImageError)
        return response.status(400).json({ message: err.message })

    if (err instanceof multer.MulterError)
        return response.status(400).json({ message: err.code === 'LIMIT_FILE_SIZE' ? 'Image is too large.' : 'Invalid upload.' })

    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large')
        return response.status(err.status ?? 400).json({ message: 'Invalid request body.' })

    console.error(err)

    return response.status(500).json({ message: 'Internal server error.' })
})

export default app
