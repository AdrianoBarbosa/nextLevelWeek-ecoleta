import type { ReactNode } from 'react'
import { screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import userEvent from '@testing-library/user-event'

import api from '../../services/api'
import { saveSession } from '../../services/auth'
import { expectLocation, renderApp } from '../../tests/renderApp'
import { validToken } from '../../tests/token'

const TOKEN = validToken()

type ClickHandler = (event: { latlng: { lat: number, lng: number } }) => void

let mapClick: ClickHandler | undefined

vi.mock('./markerIcon', () => ({}))

vi.mock('react-leaflet', () => ({
    MapContainer: ({ children }: { children: ReactNode }) => <div data-testid="map">{children}</div>,
    TileLayer: () => null,
    Marker: ({ position }: { position: [number, number] }) => <span data-testid="marker">{position.join(',')}</span>,
    useMap: () => ({ setView: vi.fn() }),
    useMapEvents: (handlers: { click: ClickHandler }) => { mapClick = handlers.click },
}))

const items = [
    { id: 1, title: 'Lâmpadas', image_url: 'http://api/lampadas.svg' },
    { id: 2, title: 'Pilhas e Baterias', image_url: 'http://api/baterias.svg' },
]

const png = () => new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'ponto.png', { type: 'image/png' })

describe('CreatePoint page', () => {
    beforeEach(() => {
        saveSession({ token: TOKEN, user: { id: 1, name: 'Recicla Mais', email: 'contato@reciclamais.org' } })

        URL.createObjectURL = vi.fn(() => 'blob:preview')
        URL.revokeObjectURL = vi.fn()

        vi.spyOn(api, 'get').mockResolvedValue({ data: items })
        vi.spyOn(axios, 'get').mockImplementation(async (url: string) => ({
            data: url.endsWith('/estados') ? [{ sigla: 'SP' }, { sigla: 'MG' }] : [{ nome: 'Limeira' }, { nome: 'Campinas' }],
        }))
        vi.spyOn(window, 'alert').mockImplementation(() => {})
    })

    async function fillForm(user: ReturnType<typeof renderApp>['user'], { withImage = true, withPosition = true, withItems = true } = {}) {
        if (withImage)
            await user.upload(screen.getByTestId('dropzone-input'), png())

        await user.type(screen.getByLabelText('Nome da entidade'), 'Recicla Mais')
        await user.type(screen.getByLabelText('E-mail'), 'contato@reciclamais.org')
        await user.type(screen.getByLabelText('WhatsApp'), '(19) 99000-0000')

        if (withPosition)
            mapClick!({ latlng: { lat: -22.56, lng: -47.4 } })

        await user.selectOptions(screen.getByLabelText('Estado (UF)'), await screen.findByRole('option', { name: 'SP' }))
        await user.selectOptions(screen.getByLabelText('Cidade'), await screen.findByRole('option', { name: 'Limeira' }))

        if (withItems) {
            await user.click(await screen.findByText('Lâmpadas'))
            await user.click(screen.getByText('Pilhas e Baterias'))
        }
    }

    it('loads the items and the IBGE cities of the selected UF', async () => {
        const { user } = renderApp('/create-point')

        expect(await screen.findByText('Lâmpadas')).toBeInTheDocument()

        await user.selectOptions(screen.getByLabelText('Estado (UF)'), await screen.findByRole('option', { name: 'SP' }))

        expect(await screen.findByRole('option', { name: 'Limeira' })).toBeInTheDocument()
        expect(axios.get).toHaveBeenCalledWith('https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios')
    })

    it('redirects to login when the stored token is expired', async () => {
        saveSession({ token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIiwiZXhwIjoxfQ.signature', user: { id: 1, name: 'Recicla Mais', email: 'contato@reciclamais.org' } })

        renderApp('/create-point')

        await expectLocation('/login')
    })

    it('clears the cities of the previous UF while the new ones load', async () => {
        let resolveMg: (value: { data: { nome: string }[] }) => void = () => {}
        vi.mocked(axios.get).mockImplementation((url: string) => {
            if (url.endsWith('/estados')) return Promise.resolve({ data: [{ sigla: 'SP' }, { sigla: 'MG' }] })
            if (url.includes('/SP/')) return Promise.resolve({ data: [{ nome: 'Limeira' }] })
            return new Promise(resolve => { resolveMg = resolve })
        })

        const { user } = renderApp('/create-point')

        await user.selectOptions(screen.getByLabelText('Estado (UF)'), await screen.findByRole('option', { name: 'SP' }))
        await user.selectOptions(screen.getByLabelText('Cidade'), await screen.findByRole('option', { name: 'Limeira' }))

        await user.selectOptions(screen.getByLabelText('Estado (UF)'), 'MG')

        expect(screen.queryByRole('option', { name: 'Limeira' })).not.toBeInTheDocument()
        expect(screen.getByLabelText('Cidade')).toHaveValue('0')

        resolveMg({ data: [{ nome: 'Uberlândia' }] })
        expect(await screen.findByRole('option', { name: 'Uberlândia' })).toBeInTheDocument()
    })

    it('toggles the selected items', async () => {
        const { user } = renderApp('/create-point')

        const item = (await screen.findByText('Lâmpadas')).closest('li')!

        await user.click(item)
        expect(item).toHaveClass('selected')

        await user.click(item)
        expect(item).not.toHaveClass('selected')
    })

    it('sends the point as multipart form data and goes home', async () => {
        const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { id: 1 } })

        const { user } = renderApp('/create-point')

        await fillForm(user)
        expect(await screen.findByTestId('marker')).toHaveTextContent('-22.56,-47.4')

        await user.click(screen.getByRole('button', { name: 'Cadastrar ponto de coleta' }))

        await expectLocation('/')

        const [url, data] = post.mock.calls[0] as [string, FormData]
        expect(url).toBe('points')
        expect(Object.fromEntries([...data.entries()].filter(([key]) => key !== 'image'))).toEqual({
            name: 'Recicla Mais',
            email: 'contato@reciclamais.org',
            whatsapp: '19990000000',
            uf: 'SP',
            city: 'Limeira',
            latitude: '-22.56',
            longitude: '-47.4',
            items: '1,2',
        })
        expect((data.get('image') as File).name).toBe('ponto.png')
        expect(window.alert).toHaveBeenCalledWith('Ponto de coleta criado.')
    })

    it.each([
        ['the image is missing', { withImage: false }, 'Envie uma imagem do estabelecimento.'],
        ['no position was selected on the map', { withPosition: false }, 'Selecione o endereço no mapa.'],
        ['no item was selected', { withItems: false }, 'Selecione ao menos um item de coleta.'],
    ])('does not submit when %s', async (_, options, message) => {
        vi.spyOn(api, 'post')

        const { user } = renderApp('/create-point')

        await fillForm(user, options)
        await user.click(screen.getByRole('button', { name: 'Cadastrar ponto de coleta' }))

        await waitFor(() => expect(window.alert).toHaveBeenCalledWith(message))
        expect(api.post).not.toHaveBeenCalled()
    })

    it('warns and stays on the page when the API rejects the point', async () => {
        vi.spyOn(api, 'post').mockRejectedValue(new Error('400'))

        const { user } = renderApp('/create-point')

        await fillForm(user)
        await user.click(screen.getByRole('button', { name: 'Cadastrar ponto de coleta' }))

        await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Erro ao criar o ponto de coleta, confira os dados e tente novamente.'))
        await expectLocation('/create-point')
    })

    it('rejects files that are not images', async () => {
        renderApp('/create-point')

        // applyAccept desligado para simular um arquivo que burla o filtro do seletor de arquivos.
        await userEvent.setup({ applyAccept: false })
            .upload(screen.getByTestId('dropzone-input'), new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }))

        expect(await screen.findByText('Envie uma imagem JPG, PNG ou WebP.')).toBeInTheDocument()
    })
})
