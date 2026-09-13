import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { app, request, connection, PASSWORD, createUser, resetDatabase } from '../helpers/factories.ts'
import { verifyPassword } from '../../src/utils/password.ts'

const payload = (overrides: Record<string, unknown> = {}) => ({
    name: 'Recicla Mais',
    email: 'Contato@ReciclaMais.org',
    password: PASSWORD,
    ...overrides,
})

describe('POST /users', () => {
    beforeEach(resetDatabase)
    afterAll(() => connection.destroy())

    it('creates a user with a normalized e-mail and a hashed password', async () => {
        const response = await request(app).post('/users').send(payload())

        expect(response.status).toBe(201)
        expect(response.body).toEqual({ id: expect.any(Number), name: 'Recicla Mais', email: 'contato@reciclamais.org' })

        const saved = await connection('users').where('id', response.body.id).first()
        expect(saved.password_hash).toMatch(/^scrypt\$/)
        expect(saved.password_hash).not.toContain(PASSWORD)
        expect(await verifyPassword(PASSWORD, saved.password_hash)).toBe(true)
    })

    it('returns 409 when the e-mail is already registered, ignoring case', async () => {
        await createUser({ email: 'contato@reciclamais.org' })

        const response = await request(app).post('/users').send(payload())

        expect(response.status).toBe(409)
    })

    it.each([
        ['name is missing', { name: undefined }],
        ['email is invalid', { email: 'not-an-email' }],
        ['password is missing', { password: undefined }],
        ['password is shorter than 8 chars', { password: '1234567' }],
        ['password is longer than 128 chars', { password: 'a'.repeat(129) }],
        ['an unknown field is sent', { admin: true }],
    ])('returns 400 when %s', async (_, overrides) => {
        const response = await request(app).post('/users').send(payload(overrides))

        expect(response.status).toBe(400)
        expect(await connection('users').count({ count: '*' })).toEqual([{ count: 0 }])
    })
})
