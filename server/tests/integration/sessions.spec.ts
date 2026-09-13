import jwt from 'jsonwebtoken'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { app, request, connection, createUser, resetDatabase } from '../helpers/factories.ts'
import { authConfig } from '../../src/config/auth.ts'

const login = (body: Record<string, unknown>) => request(app).post('/sessions').send(body)

describe('POST /sessions', () => {
    beforeEach(resetDatabase)
    afterAll(() => connection.destroy())

    it('returns the user and a signed JWT for valid credentials', async () => {
        const user = await createUser()

        const response = await login({ email: 'CONTATO@reciclamais.org', password: user.password })

        expect(response.status).toBe(200)
        expect(response.body.user).toEqual({ id: user.id, name: user.name, email: user.email })
        expect(response.body.user).not.toHaveProperty('password_hash')

        const payload = jwt.verify(response.body.token, authConfig.secret, { algorithms: ['HS256'] }) as jwt.JwtPayload
        expect(payload.sub).toBe(String(user.id))
        expect(payload.exp).toBeGreaterThan(payload.iat!)
    })

    it('returns 401 with a wrong password', async () => {
        const user = await createUser()

        const response = await login({ email: user.email, password: 'senha-errada' })

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ message: 'Invalid e-mail or password.' })
    })

    it('returns the same 401 for an unknown e-mail, without revealing it', async () => {
        const response = await login({ email: 'ninguem@exemplo.com', password: 'qualquer-senha' })

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ message: 'Invalid e-mail or password.' })
    })

    it('returns 400 when the password is missing', async () => {
        const response = await login({ email: 'contato@reciclamais.org' })

        expect(response.status).toBe(400)
    })
})
