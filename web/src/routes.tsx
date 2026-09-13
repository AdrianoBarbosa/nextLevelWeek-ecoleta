import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes as Switch } from 'react-router'

import PrivateRoute from './components/PrivateRoute'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'

// O mapa (Leaflet) só é carregado quando a página de cadastro é aberta.
const CreatePoint = lazy(() => import('./pages/CreatePoint'))

export const AppRoutes = () => {
    return (
        <Suspense fallback={null}>
            <Switch>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/create-point" element={<PrivateRoute><CreatePoint /></PrivateRoute>} />
            </Switch>
        </Suspense>
    )
}

const Routes = () => {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    )
}

export default Routes
