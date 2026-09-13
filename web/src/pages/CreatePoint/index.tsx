import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { FiArrowLeft } from 'react-icons/fi'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import axios from 'axios'
import api from '../../services/api'

import Dropzone from '../../components/Dropzone'
import './markerIcon'

import './styles.css'

import logo from '../../assets/logo.svg'

interface Item {
    id: number,
    title: string,
    image_url: string
}

interface IBGEUFResponse {
    sigla: string
}

interface IBGECityResponse {
    nome: string
}

type Position = [number, number]

// O MapContainer só usa o center inicial, então a posição do usuário precisa ser aplicada depois.
const MapCenter = ({ position }: { position: Position }) => {
    const map = useMap()

    useEffect(() => {
        map.setView(position)
    }, [map, position])

    return null
}

const MapClick = ({ onClick }: { onClick: (position: Position) => void }) => {
    useMapEvents({
        click(event) {
            onClick([event.latlng.lat, event.latlng.lng])
        }
    })

    return null
}

const CreatePoint = () => {
    const [items, setItems] = useState<Item[]>([])
    const [ufs, setUfs] = useState<string[]>([])
    const [cities, setCities] = useState<string[]>([])

    const [initialPosition, setInitialPosition] = useState<Position>([-14.235, -51.9253])

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        whatsapp: ''
    })

    const [selectedUf, setSelectedUf] = useState('0')
    const [selectedCity, setSelectedCity] = useState('0')
    const [selectedItems, setSelectedItems] = useState<number[]>([])
    const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
    const [selectedFile, setSelectedFile] = useState<File>()

    const navigate = useNavigate()

    useEffect(() => {
        navigator.geolocation?.getCurrentPosition(position => {
            const { latitude, longitude } = position.coords

            setInitialPosition([latitude, longitude])
        })
    }, [])

    useEffect(() => {
        api.get<Item[]>('items').then(response => {
            setItems(response.data)
        })
    }, [])

    useEffect(() => {
        axios.get<IBGEUFResponse[]>('https://servicodados.ibge.gov.br/api/v1/localidades/estados')
            .then(response => {
                const ufInitials = response.data.map(uf => uf.sigla).sort()

                setUfs(ufInitials)
            })
    }, [])

    useEffect(() => {
        setCities([])

        if (selectedUf === '0') return

        // Ignora respostas de uma UF anterior que cheguem depois da troca.
        let ignore = false

        axios.get<IBGECityResponse[]>(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUf}/municipios`)
            .then(response => {
                if (!ignore)
                    setCities(response.data.map(city => city.nome))
            })

        return () => { ignore = true }
    }, [selectedUf])

    function handleSelectUf(event: ChangeEvent<HTMLSelectElement>) {
        setSelectedUf(event.target.value)
        setSelectedCity('0')
    }

    function handleSelectCity(event: ChangeEvent<HTMLSelectElement>) {
        setSelectedCity(event.target.value)
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const { name, value } = event.target

        setFormData({ ...formData, [name]: value })
    }

    function handleSelectedItem(id: number) {
        if (selectedItems.includes(id))
            setSelectedItems(selectedItems.filter(item => item !== id))
        else
            setSelectedItems([...selectedItems, id])
    }

    function validationError() {
        if (!selectedFile) return 'Envie uma imagem do estabelecimento.'
        if (!selectedPosition) return 'Selecione o endereço no mapa.'
        if (selectedUf === '0' || selectedCity === '0') return 'Selecione o estado e a cidade.'
        if (!selectedItems.length) return 'Selecione ao menos um item de coleta.'
        return null
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault()

        const error = validationError()

        if (error)
            return alert(error)

        const { name, email, whatsapp } = formData
        const [latitude, longitude] = selectedPosition!

        const data = new FormData()

        data.append('name', name)
        data.append('email', email)
        data.append('whatsapp', whatsapp.replace(/\D/g, ''))
        data.append('uf', selectedUf)
        data.append('city', selectedCity)
        data.append('latitude', String(latitude))
        data.append('longitude', String(longitude))
        data.append('items', selectedItems.join(','))
        data.append('image', selectedFile!)

        try {
            await api.post('points', data)

            alert('Ponto de coleta criado.')

            navigate('/')
        } catch {
            alert('Erro ao criar o ponto de coleta, confira os dados e tente novamente.')
        }
    }

    return (
        <div id="page-create-point">
            <header>
                <img src={logo} alt="Ecoleta" />

                <Link to="/">
                    <FiArrowLeft />
                    Voltar para home
                </Link>
            </header>

            <form onSubmit={handleSubmit}>
                <h1>Cadastro do <br /> ponto de coleta</h1>

                <Dropzone onFileUploaded={setSelectedFile} />

                <fieldset>
                    <legend>
                        <h2>Dados</h2>
                    </legend>

                    <div className="field">
                        <label htmlFor="name">Nome da entidade</label>
                        <input type="text" name="name" id="name" required onChange={handleInputChange} />
                    </div>

                    <div className="field-group">
                        <div className="field">
                            <label htmlFor="email">E-mail</label>
                            <input type="email" name="email" id="email" required onChange={handleInputChange} />
                        </div>

                        <div className="field">
                            <label htmlFor="whatsapp">WhatsApp</label>
                            <input type="text" name="whatsapp" id="whatsapp" required onChange={handleInputChange} />
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>
                        <h2>Endereço</h2>
                        <span>Selecione o endereço no mapa</span>
                    </legend>

                    <MapContainer center={initialPosition} zoom={15}>
                        <TileLayer
                            attribution='&amp;copy <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <MapCenter position={initialPosition} />
                        <MapClick onClick={setSelectedPosition} />

                        {selectedPosition && <Marker position={selectedPosition} />}
                    </MapContainer>

                    <div className="field-group">
                        <div className="field">
                            <label htmlFor="uf">Estado (UF)</label>
                            <select name="uf" id="uf" value={selectedUf} onChange={handleSelectUf}>
                                <option value="0">Selecione uma UF</option>
                                {ufs.map(uf => (
                                    <option key={uf} value={uf}>{uf}</option>
                                ))}
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="city">Cidade</label>
                            <select name="city" id="city" value={selectedCity} onChange={handleSelectCity}>
                                <option value="0">Selecione uma cidade</option>
                                {cities.map(city => (
                                    <option key={city} value={city}>{city}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend>
                        <h2>Ítens de coleta</h2>
                        <span>Selecione um ou mais ítens abaixo</span>
                    </legend>

                    <ul className="items-grid">
                        {items.map(item => (
                            <li
                                key={item.id}
                                onClick={() => handleSelectedItem(item.id)}
                                className={selectedItems.includes(item.id) ? 'selected' : ''}
                            >
                                <img src={item.image_url} alt={item.title} />
                                <span>{item.title}</span>
                            </li>
                        ))}
                    </ul>
                </fieldset>

                <button type="submit">Cadastrar ponto de coleta</button>
            </form>
        </div>
    )
}

export default CreatePoint
