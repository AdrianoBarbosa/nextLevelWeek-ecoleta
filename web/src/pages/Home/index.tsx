import { useState } from 'react'
import { FiLogIn, FiLogOut } from 'react-icons/fi'
import { Link } from 'react-router'

import { clearSession, getUser } from '../../services/auth'

import './styles.css'

import logo from '../../assets/logo.svg'

const Home = () => {
    const [user, setUser] = useState(getUser)

    function handleLogout() {
        clearSession()
        setUser(null)
    }

    return (
        <div id="page-home">
            <div className="content">
                <header>
                    <img src={logo} alt="Ecoleta"/>

                    {user
                        ? (
                            <button type="button" onClick={handleLogout}>
                                <FiLogOut />
                                Sair ({user.name})
                            </button>
                        )
                        : <Link to="/login">Entrar</Link>}
                </header>

                <main>
                    <h1>Seu marketplace de coleta de resíduos.</h1>
                    <p>Ajudamos pessoas a encontrarem pontos de coleta de forma eficiente.</p>

                    <Link to="/create-point">
                        <span>
                            <FiLogIn />
                        </span>
                        <strong>Cadastre um ponto de coleta</strong>
                    </Link>
                </main>
            </div>
        </div>
    )
}

export default Home
