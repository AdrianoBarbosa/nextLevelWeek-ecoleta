const TOKEN_KEY = 'ecoleta:token'
const USER_KEY = 'ecoleta:user'

export interface User {
    id: number
    name: string
    email: string
}

export function saveSession({ token, user }: { token: string, user: User }) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): User | null {
    try {
        return JSON.parse(localStorage.getItem(USER_KEY) ?? 'null')
    } catch {
        return null
    }
}

function isExpired(token: string) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))

        return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()
    } catch {
        return true
    }
}

// A validade real é conferida pela API. Aqui só evitamos abrir páginas protegidas com um token vencido.
export function isAuthenticated() {
    const token = getToken()

    if (token && isExpired(token)) {
        clearSession()
        return false
    }

    return Boolean(token)
}

export function clearSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
}
