import React from 'react'
import { Alert } from 'react-native'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import * as Location from 'expo-location'

import Points from '../src/pages/Points'
import api from '../src/services/api'

const mockNavigate = jest.fn()
const mockGoBack = jest.fn()

jest.mock('@react-navigation/native', () => ({
    useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
    useRoute: () => ({ params: { uf: 'SP', city: 'Limeira' } }),
}))

jest.mock('expo-location', () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
}))

jest.mock('react-native-svg', () => ({ SvgUri: () => null }))

jest.mock('react-native-maps', () => {
    const { View } = require('react-native')
    const MapView = (props: object) => <View testID="map" {...props} />
    const Marker = (props: object) => <View {...props} />
    return { __esModule: true, default: MapView, Marker }
})

const items = [
    { id: 1, title: 'Lâmpadas', image_url: 'http://api/lampadas.svg' },
    { id: 2, title: 'Pilhas e Baterias', image_url: 'http://api/baterias.svg' },
]

const points = [{ id: 7, name: 'Recicla Mais', image: 'a.png', image_url: 'http://api/uploads/a.png', latitude: -22.56, longitude: -47.4 }]

describe('Points screen', () => {
    beforeEach(() => {
        jest.restoreAllMocks()
        mockNavigate.mockClear()
        jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ status: 'granted' } as Location.LocationPermissionResponse)
        jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({ coords: { latitude: -22.56, longitude: -47.4 } } as Location.LocationObject)
        jest.spyOn(api, 'get').mockImplementation(async (url: string) => ({ data: url === 'items' ? items : points }))
    })

    it('loads the items and every point of the city before any filter', async () => {
        await render(<Points />)

        expect(await screen.findByText('Lâmpadas')).toBeTruthy()
        expect(api.get).toHaveBeenCalledWith('points', { params: { city: 'Limeira', uf: 'SP', items: undefined } })
    })

    it('filters the points by the selected items as a comma separated list', async () => {
        await render(<Points />)

        await fireEvent.press(await screen.findByText('Lâmpadas'))
        await fireEvent.press(screen.getByText('Pilhas e Baterias'))

        await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('points', { params: { city: 'Limeira', uf: 'SP', items: '1,2' } }))
    })

    it('shows the map at the user location and opens the point detail', async () => {
        await render(<Points />)

        await fireEvent.press(await screen.findByTestId('point-7'))

        expect(screen.getByTestId('map')).toBeTruthy()
        expect(mockNavigate).toHaveBeenCalledWith('Detail', { point_id: 7 })
    })

    it('warns when the location permission is denied', async () => {
        jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ status: 'denied' } as Location.LocationPermissionResponse)
        const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {})

        await render(<Points />)

        await waitFor(() => expect(alert).toHaveBeenCalled())
        expect(screen.queryByTestId('map')).toBeNull()
    })
})
