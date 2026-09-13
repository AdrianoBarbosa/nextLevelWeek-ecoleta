import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..', '..')

export const paths = {
    root,
    uploads: process.env.UPLOADS_DIR || path.join(root, 'uploads'),
    itemImages: path.join(root, 'assets', 'items'),
    database: path.join(root, 'src', 'database'),
}
