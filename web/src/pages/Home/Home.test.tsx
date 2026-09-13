import { screen } from '@testing-library/react'

import { getToken, saveSession } from '../../services/auth'
import { renderApp } from '../../tests/renderApp'
import { validToken } from '../../tests/token'

const TOKEN = validToken()

describe('Home page', () => {
    it('shows the login link when logged out', () => {
        renderApp('/')

        expect(screen.getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
        expect(screen.getByRole('link', { name: /Cadastre um ponto de coleta/ })).toHaveAttribute('href', '/create-point')
    })

    it('shows the user and logs out', async () => {
        saveSession({ token: TOKEN, user: { id: 1, name: 'Recicla Mais', email: 'contato@reciclamais.org' } })

        const { user } = renderApp('/')

        await user.click(screen.getByRole('button', { name: /Sair \(Recicla Mais\)/ }))

        expect(getToken()).toBeNull()
        expect(screen.getByRole('link', { name: 'Entrar' })).toBeInTheDocument()
    })
})
