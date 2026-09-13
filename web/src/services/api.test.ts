import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'

import api from './api'
import { getToken, saveSession } from './auth'
import { redirectToLogin } from './navigation'

vi.mock('./navigation', () => ({ redirectToLogin: vi.fn() }))

const user = { id: 1, name: 'Recicla Mais', email: 'contato@reciclamais.org' }

function mockAdapter(status = 200) {
    const adapter = vi.fn((config: InternalAxiosRequestConfig) => {
        const response = { data: {}, status, statusText: '', headers: {}, config }

        if (status >= 400)
            return Promise.reject(Object.assign(new Error(`Request failed with status code ${status}`), { response, config }))

        return Promise.resolve(response)
    })

    api.defaults.adapter = adapter as unknown as AxiosAdapter

    return adapter
}

describe('api client', () => {
    beforeEach(() => {
        vi.mocked(redirectToLogin).mockClear()
    })

    it('sends the JWT as a Bearer token when logged in', async () => {
        saveSession({ token: 'jwt-token', user })
        const adapter = mockAdapter()

        await api.post('points', {})

        expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer jwt-token')
    })

    it('does not send an Authorization header when logged out', async () => {
        const adapter = mockAdapter()

        await api.get('items')

        expect(adapter.mock.calls[0][0].headers.Authorization).toBeUndefined()
    })

    it('clears the session and redirects to login on 401', async () => {
        saveSession({ token: 'expired', user })
        mockAdapter(401)

        await expect(api.post('points', {})).rejects.toThrow('401')

        expect(getToken()).toBeNull()
        expect(redirectToLogin).toHaveBeenCalledTimes(1)
    })

    it('does not redirect on 401 when there is no session (failed login)', async () => {
        mockAdapter(401)

        await expect(api.post('sessions', {})).rejects.toThrow('401')

        expect(redirectToLogin).not.toHaveBeenCalled()
    })

    it.each(['sessions', 'users'])('keeps the session and does not redirect on a 401 from %s', async endpoint => {
        saveSession({ token: 'jwt-token', user })
        mockAdapter(401)

        await expect(api.post(endpoint, {})).rejects.toThrow('401')

        expect(getToken()).toBe('jwt-token')
        expect(redirectToLogin).not.toHaveBeenCalled()
    })

    it('keeps the session on other errors', async () => {
        saveSession({ token: 'jwt-token', user })
        mockAdapter(500)

        await expect(api.post('points', {})).rejects.toThrow('500')

        expect(getToken()).toBe('jwt-token')
    })
})
