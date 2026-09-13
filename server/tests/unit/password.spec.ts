import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from '../../src/utils/password.ts'

describe('password hashing', () => {
    it('verifies the right password and rejects a wrong one', async () => {
        const hash = await hashPassword('senha-forte-123')

        expect(await verifyPassword('senha-forte-123', hash)).toBe(true)
        expect(await verifyPassword('senha-forte-124', hash)).toBe(false)
    })

    it('uses a random salt for each hash and never stores the password', async () => {
        const [a, b] = await Promise.all([hashPassword('mesma-senha'), hashPassword('mesma-senha')])

        expect(a).not.toBe(b)
        expect(a).not.toContain('mesma-senha')
    })

    it('stores the cost parameters with the hash', async () => {
        const hash = await hashPassword('senha', { N: 2 ** 11, r: 8, p: 1 })

        expect(hash.split('$').slice(0, 4)).toEqual(['scrypt', '2048', '8', '1'])
        expect(await verifyPassword('senha', hash)).toBe(true)
    })

    it('treats equivalent unicode forms as the same password', async () => {
        expect(await verifyPassword('café', await hashPassword('café'))).toBe(true)
    })

    it.each([
        ['null', null],
        ['an empty string', ''],
        ['another algorithm', 'bcrypt$2b$10$abc'],
        ['non numeric cost', 'scrypt$x$8$1$c2FsdA==$aGFzaA=='],
    ])('returns false for %s as stored hash', async (_, stored) => {
        expect(await verifyPassword('senha', stored)).toBe(false)
    })
})
