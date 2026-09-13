import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import authenticate from '../../src/middlewares/authenticate.ts'
import { authConfig } from '../../src/config/auth.ts'
import { connection, createUser, resetDatabase } from '../helpers/factories.ts'

async function run(authorization?: string) {
    const request = { headers: authorization === undefined ? {} : { authorization } } as Request
    const response = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }
    const next = vi.fn()

    await authenticate(request, response as unknown as Response, next as NextFunction)

    return { request, response, next }
}

function expectUnauthorized({ response, next }: Awaited<ReturnType<typeof run>>, message: string) {
    expect(next).not.toHaveBeenCalled()
    expect(response.status).toHaveBeenCalledWith(401)
    expect(response.json).toHaveBeenCalledWith({ message })
}

let userId: number

const sign = (options: jwt.SignOptions = {}, secret: string = authConfig.secret) =>
    jwt.sign({}, secret, { subject: String(userId), algorithm: 'HS256', ...options })

describe('authenticate middleware', () => {
    beforeAll(async () => {
        await resetDatabase()
        userId = (await createUser()).id
    })

    afterAll(() => connection.destroy())

    it('calls next and exposes the user id for a valid token', async () => {
        const { request, next } = await run(`Bearer ${sign()}`)

        expect(next).toHaveBeenCalledTimes(1)
        expect(request.userId).toBe(userId)
    })

    it('rejects requests without the authorization header', async () => {
        expectUnauthorized(await run(), 'Token not provided.')
    })

    it.each([['Basic abc'], ['Bearer'], ['token-sem-esquema']])('rejects the malformed header "%s"', async header => {
        expectUnauthorized(await run(header), 'Malformed token.')
    })

    it('rejects a valid token of a user that no longer exists', async () => {
        expectUnauthorized(await run(`Bearer ${sign({ subject: '999' })}`), 'Invalid or expired token.')
    })

    it.each([
        ['signed with another secret', () => sign({}, 'x'.repeat(40))],
        ['expired', () => sign({ expiresIn: -1 })],
        ['unsigned (alg none)', () => jwt.sign({}, '', { subject: String(userId), algorithm: 'none' })],
        ['with a non numeric subject', () => sign({ subject: 'admin' })],
        ['garbage', () => 'not.a.jwt'],
    ])('rejects a token %s', async (_, token) => {
        expectUnauthorized(await run(`Bearer ${token()}`), 'Invalid or expired token.')
    })
})
