import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { FiArrowLeft } from 'react-icons/fi'

import api from '../../services/api'
import { saveSession } from '../../services/auth'

import '../Auth/styles.css'

import logo from '../../assets/logo.svg'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()
    const location = useLocation()

    const from = (location.state as { from?: string } | null)?.from ?? '/create-point'

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()

        setLoading(true)
        setError('')

        try {
            const response = await api.post('sessions', { email, password })

            saveSession(response.data)

            navigate(from, { replace: true })
        } catch {
            setError('E-mail ou senha inválidos.')
            setLoading(false)
        }
    }

    return (
        <div className="page-auth">
            <header>
                <img src={logo} alt="Ecoleta" />

                <Link to="/">
                    <FiArrowLeft />
                    Voltar para home
                </Link>
            </header>

            <form onSubmit={handleSubmit}>
                <h1>Entrar</h1>

                <div className="field">
                    <label htmlFor="email">E-mail</label>
                    <input type="email" id="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                <div className="field">
                    <label htmlFor="password">Senha</label>
                    <input type="password" id="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} />
                </div>

                {error && <p className="error" role="alert">{error}</p>}

                <button type="submit" disabled={loading}>Entrar</button>

                <Link to="/register">Não tenho conta</Link>
            </form>
        </div>
    )
}

export default Login
