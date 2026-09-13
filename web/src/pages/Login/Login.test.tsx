import { screen } from '@testing-library/react'

import api from '../../services/api'
import { getToken, getUser } from '../../services/auth'
import { expectLocation, renderApp } from '../../tests/renderApp'
import { validToken } from '../../tests/token'

const TOKEN = validToken()

const session = { token: TOKEN, user: { id: 1, name: 'Recicla Mais', email: 'contato@reciclamais.org' } }

async function login(user: ReturnType<typeof renderApp>['user'], password = 'senha-forte-123') {
    await user.type(screen.getByLabelText('E-mail'), 'contato@reciclamais.org')
    await user.type(screen.getByLabelText('Senha'), password)
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('Login page', () => {
    beforeEach(() => {
        vi.spyOn(api, 'get').mockResolvedValue({ data: [] })
    })

    it('logs in, stores the session and goes to the point registration', async () => {
        vi.spyOn(api, 'post').mockResolvedValue({ data: session })

        const { user } = renderApp('/login')

        await login(user)

        await expectLocation('/create-point')
        expect(api.post).toHaveBeenCalledWith('sessions', { email: 'contato@reciclamais.org', password: 'senha-forte-123' })
        expect(getToken()).toBe(TOKEN)
        expect(getUser()).toEqual(session.user)
    })

    it('shows an error and stays on the page with wrong credentials', async () => {
        vi.spyOn(api, 'post').mockRejectedValue(new Error('401'))

        const { user } = renderApp('/login')

        await login(user, 'senha-errada')

        expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos.')
        expect(getToken()).toBeNull()
        await expectLocation('/login')
    })

    it('is where protected pages redirect to, returning to them after login', async () => {
        vi.spyOn(api, 'post').mockResolvedValue({ data: session })

        const { user } = renderApp('/create-point')

        await expectLocation('/login')
        await login(user)

        await expectLocation('/create-point')
    })
})
