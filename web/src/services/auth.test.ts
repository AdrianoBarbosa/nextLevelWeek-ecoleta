import { clearSession, getToken, getUser, isAuthenticated, saveSession } from './auth'

const user = { id: 1, name: 'Recicla Mais', email: 'contato@reciclamais.org' }

const base64url = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
const jwtWith = (payload: object) => `${base64url({ alg: 'HS256' })}.${base64url(payload)}.signature`
const nowInSeconds = () => Math.floor(Date.now() / 1000)

describe('auth service', () => {
    it('stores and reads the session', () => {
        const token = jwtWith({ sub: '1', exp: nowInSeconds() + 3600 })
        saveSession({ token, user })

        expect(getToken()).toBe(token)
        expect(getUser()).toEqual(user)
        expect(isAuthenticated()).toBe(true)
    })

    it('is not authenticated without a token', () => {
        expect(isAuthenticated()).toBe(false)
        expect(getUser()).toBeNull()
    })

    it('drops an expired session', () => {
        saveSession({ token: jwtWith({ sub: '1', exp: nowInSeconds() - 60 }), user })

        expect(isAuthenticated()).toBe(false)
        expect(getToken()).toBeNull()
        expect(getUser()).toBeNull()
    })

    it('drops a token that cannot be decoded', () => {
        saveSession({ token: 'not-a-jwt', user })

        expect(isAuthenticated()).toBe(false)
    })

    it('ignores a corrupted user entry', () => {
        localStorage.setItem('ecoleta:user', '{invalid')

        expect(getUser()).toBeNull()
    })

    it('clears only the session keys', () => {
        localStorage.setItem('other', 'value')
        saveSession({ token: 'jwt-token', user })

        clearSession()

        expect(isAuthenticated()).toBe(false)
        expect(getUser()).toBeNull()
        expect(localStorage.getItem('other')).toBe('value')
    })
})
