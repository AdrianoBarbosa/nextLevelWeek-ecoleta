import { afterAll, describe, expect, it } from 'vitest'

import { app, request, connection } from '../helpers/factories.ts'

describe('HTTP hardening', () => {
    afterAll(() => connection.destroy())

    it('does not disclose the framework and sets security headers', async () => {
        const response = await request(app).get('/unknown-route')

        expect(response.headers).not.toHaveProperty('x-powered-by')
        expect(response.headers['x-content-type-options']).toBe('nosniff')
        expect(response.headers).toHaveProperty('content-security-policy')
    })

    it('rejects JSON bodies larger than 10kb', async () => {
        const response = await request(app).post('/users').send({ name: 'a'.repeat(20 * 1024) })

        expect(response.status).toBe(413)
    })

    it('returns 400 for malformed JSON without leaking internals', async () => {
        const response = await request(app)
            .post('/users')
            .set('Content-Type', 'application/json')
            .send('{"name":')

        expect(response.status).toBe(400)
        expect(response.body).toEqual({ message: 'Invalid request body.' })
    })

    it('does not serve files outside the uploads folder', async () => {
        const response = await request(app).get('/uploads/..%2f..%2fpackage.json')

        expect(response.status).toBe(404)
    })
})
