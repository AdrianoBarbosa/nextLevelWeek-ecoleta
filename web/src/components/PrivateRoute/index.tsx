import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'

import { isAuthenticated } from '../../services/auth'

const PrivateRoute = ({ children }: { children: ReactNode }) => {
    const location = useLocation()

    if (!isAuthenticated())
        return <Navigate to="/login" replace state={{ from: location.pathname }} />

    return children
}

export default PrivateRoute
