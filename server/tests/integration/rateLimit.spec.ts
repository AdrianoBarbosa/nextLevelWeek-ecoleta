import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

vi.stubEnv('AUTH_RATE_LIMIT', '10')

const { app, request, connection, resetDatabase } = await import('../helpers/factories.ts')

describe('authentication rate limit', () => {
    beforeAll(resetDatabase)
    afterAll(() => connection.destroy())

    it('blocks brute force attempts on POST /sessions', async () => {
        const attempt = () => request(app).post('/sessions').send({ email: 'alvo@exemplo.com', password: 'chute-qualquer' })

        for (let i = 0; i < 10; i++)
            expect((await attempt()).status).toBe(401)

        const blocked = await attempt()

        expect(blocked.status).toBe(429)
        expect(blocked.body).toEqual({ message: 'Too many attempts, please try again later.' })
    })

    it('keeps a separate counter for POST /users', async () => {
        const response = await request(app).post('/users').send({})

        expect(response.status).toBe(400)
    })
})
