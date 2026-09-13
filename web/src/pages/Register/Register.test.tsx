import { screen, waitFor } from '@testing-library/react'
import { AxiosError, AxiosHeaders } from 'axios'

import api from '../../services/api'
import { getToken } from '../../services/auth'
import { expectLocation, renderApp } from '../../tests/renderApp'
import { validToken } from '../../tests/token'

const TOKEN = validToken()

const session = { token: TOKEN, user: { id: 1, name: 'Recicla Mais', email: 'contato@reciclamais.org' } }

async function fillForm(user: ReturnType<typeof renderApp>['user'], { password = 'senha-forte-123', confirmation = password }: { password?: string, confirmation?: string } = {}) {
    await user.type(screen.getByLabelText('Nome'), 'Recicla Mais')
    await user.type(screen.getByLabelText('E-mail'), 'contato@reciclamais.org')
    await user.type(screen.getByLabelText(/^Senha/), password)
    await user.type(screen.getByLabelText('Confirme a senha'), confirmation)
    await user.click(screen.getByRole('button', { name: 'Criar conta' }))
}

describe('Register page', () => {
    beforeEach(() => {
        vi.spyOn(api, 'get').mockResolvedValue({ data: [] })
    })

    it('creates the account, logs in and goes to the point registration', async () => {
        const post = vi.spyOn(api, 'post')
            .mockResolvedValueOnce({ data: session.user })
            .mockResolvedValueOnce({ data: session })

        const { user } = renderApp('/register')

        await fillForm(user)

        await expectLocation('/create-point')
        expect(post).toHaveBeenNthCalledWith(1, 'users', { name: 'Recicla Mais', email: 'contato@reciclamais.org', password: 'senha-forte-123' })
        expect(post).toHaveBeenNthCalledWith(2, 'sessions', { email: 'contato@reciclamais.org', password: 'senha-forte-123' })
        expect(getToken()).toBe(TOKEN)
    })

    it.each([
        ['the password is too short', { password: '1234567' }, 'A senha deve ter pelo menos 8 caracteres.'],
        ['the confirmation does not match', { password: 'senha-forte-123', confirmation: 'outra-senha-123' }, 'As senhas não conferem.'],
    ])('does not submit when %s', async (_, passwords, message) => {
        vi.spyOn(api, 'post')

        const { user } = renderApp('/register')

        await fillForm(user, passwords)

        expect(await screen.findByRole('alert')).toHaveTextContent(message)
        expect(api.post).not.toHaveBeenCalled()
    })

    it('warns when the e-mail is already registered', async () => {
        const conflict = new AxiosError('Conflict', '409', undefined, undefined, {
            status: 409, statusText: 'Conflict', data: {}, headers: {}, config: { headers: new AxiosHeaders() },
        })
        vi.spyOn(api, 'post').mockRejectedValue(conflict)

        const { user } = renderApp('/register')

        await fillForm(user)

        await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Este e-mail já está cadastrado.'))
        await expectLocation('/register')
    })
})
