import React from 'react'
import { Linking } from 'react-native'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import * as MailComposer from 'expo-mail-composer'

import Detail from '../src/pages/Detail'
import api from '../src/services/api'

const mockGoBack = jest.fn()

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({ goBack: mockGoBack }),
    useRoute: () => ({ params: { point_id: 7 } }),
}))

jest.mock('expo-mail-composer', () => ({ composeAsync: jest.fn() }))

const data = {
    point: {
        image: 'a.png',
        image_url: 'http://api/uploads/a.png',
        name: 'Recicla Mais',
        email: 'contato@reciclamais.org',
        whatsapp: '5519990000000',
        city: 'Limeira',
        uf: 'SP',
    },
    items: [{ title: 'Lâmpadas' }, { title: 'Óleo de Cozinha' }],
}

describe('Detail screen', () => {
    beforeEach(() => {
        jest.restoreAllMocks()
        jest.clearAllMocks()
    })

    it('shows the point with its items and address', async () => {
        jest.spyOn(api, 'get').mockResolvedValue({ data })

        await render(<Detail />)

        expect(await screen.findByText('Recicla Mais')).toBeTruthy()
        expect(screen.getByText('Lâmpadas, Óleo de Cozinha')).toBeTruthy()
        expect(screen.getByText('Limeira, SP')).toBeTruthy()
        expect(api.get).toHaveBeenCalledWith('points/7')
    })

    it('composes an e-mail and opens WhatsApp with an encoded message', async () => {
        jest.spyOn(api, 'get').mockResolvedValue({ data })
        const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true)

        await render(<Detail />)

        await fireEvent.press(await screen.findByText('E-mail'))
        expect(MailComposer.composeAsync).toHaveBeenCalledWith({
            subject: 'Interesse na coleta de resíduos',
            recipients: ['contato@reciclamais.org'],
        })

        await fireEvent.press(screen.getByText('WhatsApp'))
        const url = openURL.mock.calls[0][0]
        expect(url).toMatch(/^whatsapp:\/\/send\?phone=5519990000000&text=/)
        expect(url).not.toContain(' ')
    })

    it('goes back when the point does not exist', async () => {
        jest.spyOn(api, 'get').mockRejectedValue(new Error('404'))

        await render(<Detail />)

        await waitFor(() => expect(mockGoBack).toHaveBeenCalled())
    })
})
