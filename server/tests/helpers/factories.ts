import fs from 'node:fs'
import request from 'supertest'
import jwt from 'jsonwebtoken'

import app from '../../src/app.ts'
import connection from '../../src/database/connection.ts'
import { authConfig } from '../../src/config/auth.ts'
import { paths } from '../../src/config/paths.ts'
import { hashPassword } from '../../src/utils/password.ts'

export { app, request, connection }

export const PASSWORD = 'senha-forte-123'

// Menor PNG válido (1x1 transparente).
export const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
    'base64',
)

export async function resetDatabase() {
    await connection.migrate.rollback(undefined, true)
    await connection.migrate.latest()
    await connection.seed.run()
}

export async function createUser(overrides: Partial<{ name: string, email: string }> = {}, password = PASSWORD) {
    const data = { name: 'Recicla Mais', email: 'contato@reciclamais.org', ...overrides }

    const [id] = await connection('users').insert({ ...data, password_hash: await hashPassword(password) })

    return { id: Number(id), password, ...data }
}

export function tokenFor(userId: number, options: jwt.SignOptions = {}) {
    return jwt.sign({}, authConfig.secret, {
        subject: String(userId),
        expiresIn: '1h',
        algorithm: authConfig.algorithm,
        ...options,
    })
}

export const pointFields = (overrides: Record<string, string> = {}) => ({
    name: 'Recicla Mais',
    email: 'contato@reciclamais.org',
    whatsapp: '5519900000000',
    latitude: '-22.5645',
    longitude: '-47.4017',
    city: 'Limeira',
    uf: 'SP',
    items: '1,2',
    ...overrides,
})

type ImageUpload = { buffer: Buffer, contentType: string, filename?: string }

export function postPoint(token: string | null, fields = pointFields(), image: ImageUpload | null = { buffer: PNG, contentType: 'image/png' }) {
    return sendPoint(request(app).post('/points'), token, fields, image)
}

export function putPoint(id: number | string, token: string | null, fields = pointFields(), image: ImageUpload | null = null) {
    return sendPoint(request(app).put(`/points/${id}`), token, fields, image)
}

function sendPoint(req: request.Test, token: string | null, fields: Record<string, string>, image: ImageUpload | null) {

    if (token)
        req.set('Authorization', `Bearer ${token}`)

    for (const [key, value] of Object.entries(fields))
        req.field(key, value)

    if (image)
        req.attach('image', image.buffer, { filename: image.filename ?? 'ponto.png', contentType: image.contentType })

    return req
}

export async function createPoint(userId: number | null, overrides: Record<string, unknown> = {}, items = [1, 2]) {
    const [id] = await connection('points').insert({
        image: 'ponto.png',
        name: 'Recicla Mais',
        email: 'contato@reciclamais.org',
        whatsapp: '5519900000000',
        latitude: -22.5645,
        longitude: -47.4017,
        city: 'Limeira',
        uf: 'SP',
        user_id: userId,
        ...overrides,
    })

    await connection('point_items').insert(items.map(item_id => ({ item_id, point_id: id })))

    return Number(id)
}

export function uploadedFiles() {
    return fs.readdirSync(paths.uploads)
}

export function clearUploads() {
    for (const file of uploadedFiles())
        fs.rmSync(`${paths.uploads}/${file}`)
}

export function storeUpload(name: string) {
    fs.writeFileSync(`${paths.uploads}/${name}`, PNG)
}
