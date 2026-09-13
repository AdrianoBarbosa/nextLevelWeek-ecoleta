import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { FiArrowLeft } from 'react-icons/fi'
import { isAxiosError } from 'axios'

import api from '../../services/api'
import { saveSession } from '../../services/auth'

import '../Auth/styles.css'

import logo from '../../assets/logo.svg'

const MIN_PASSWORD_LENGTH = 8

const Register = () => {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [passwordConfirmation, setPasswordConfirmation] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const navigate = useNavigate()

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()

        if (password.length < MIN_PASSWORD_LENGTH)
            return setError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)

        if (password !== passwordConfirmation)
            return setError('As senhas não conferem.')

        setLoading(true)
        setError('')

        try {
            await api.post('users', { name, email, password })

            const session = await api.post('sessions', { email, password })

            saveSession(session.data)

            navigate('/create-point', { replace: true })
        } catch (err) {
            setError(isAxiosError(err) && err.response?.status === 409
                ? 'Este e-mail já está cadastrado.'
                : 'Erro ao criar a conta, tente novamente.')
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
                <h1>Criar conta</h1>

                <div className="field">
                    <label htmlFor="name">Nome</label>
                    <input type="text" id="name" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} />
                </div>

                <div className="field">
                    <label htmlFor="email">E-mail</label>
                    <input type="email" id="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                <div className="field">
                    <label htmlFor="password">Senha (mínimo {MIN_PASSWORD_LENGTH} caracteres)</label>
                    <input type="password" id="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} />
                </div>

                <div className="field">
                    <label htmlFor="password-confirmation">Confirme a senha</label>
                    <input type="password" id="password-confirmation" autoComplete="new-password" required value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} />
                </div>

                {error && <p className="error" role="alert">{error}</p>}

                <button type="submit" disabled={loading}>Criar conta</button>

                <Link to="/login">Já tenho conta</Link>
            </form>
        </div>
    )
}

export default Register
