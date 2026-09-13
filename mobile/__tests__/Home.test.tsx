import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'

import Home from '../src/pages/Home'

const mockNavigate = jest.fn()

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({ navigate: mockNavigate }),
}))

describe('Home screen', () => {
    beforeEach(() => mockNavigate.mockClear())

    it('navigates to the points of the typed city, normalizing the input', async () => {
        await render(<Home />)

        await fireEvent.changeText(screen.getByPlaceholderText('UF'), 'sp ')
        await fireEvent.changeText(screen.getByPlaceholderText('Cidade'), ' Limeira ')
        await fireEvent.press(screen.getByText('Entrar'))

        expect(mockNavigate).toHaveBeenCalledWith('Points', { uf: 'SP', city: 'Limeira' })
    })
})
