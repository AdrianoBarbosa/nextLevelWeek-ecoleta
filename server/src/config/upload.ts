import crypto from 'node:crypto'
import multer from 'multer'

import { paths } from './paths.ts'

// SVG fica de fora porque pode carregar scripts quando servido pelo próprio domínio da API.
const EXTENSIONS: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
}

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export class InvalidImageError extends Error {}

export default multer({
    storage: multer.diskStorage({
        destination: paths.uploads,
        filename(request, file, callback) {
            // O nome original vem do cliente e nunca é usado, evitando path traversal e colisões.
            callback(null, `${crypto.randomBytes(16).toString('hex')}${EXTENSIONS[file.mimetype]}`)
        },
    }),
    limits: {
        fileSize: MAX_IMAGE_SIZE,
        files: 1,
    },
    fileFilter(request, file, callback) {
        if (!EXTENSIONS[file.mimetype])
            return callback(new InvalidImageError('Image must be a JPEG, PNG or WebP file.'))

        callback(null, true)
    },
})
