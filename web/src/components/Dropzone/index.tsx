import { useCallback, useEffect, useState } from 'react'
import { useDropzone, type FileRejection } from 'react-dropzone'
import { FiUpload } from 'react-icons/fi'

import './styles.css'

interface Props {
    onFileUploaded: (file: File) => void
}

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const Dropzone = ({ onFileUploaded }: Props) => {
    const [selectedFileUrl, setSelectedFileUrl] = useState('')
    const [error, setError] = useState('')

    const onDrop = useCallback((acceptedFiles: File[], rejections: FileRejection[]) => {
        if (rejections.length) {
            setError(rejections[0].errors[0].code === 'file-too-large'
                ? 'A imagem deve ter no máximo 5MB.'
                : 'Envie uma imagem JPG, PNG ou WebP.')
            return
        }

        const file = acceptedFiles[0]

        setError('')
        setSelectedFileUrl(URL.createObjectURL(file))
        onFileUploaded(file)
    }, [onFileUploaded])

    // Libera a URL temporária da pré-visualização anterior.
    useEffect(() => () => {
        if (selectedFileUrl)
            URL.revokeObjectURL(selectedFileUrl)
    }, [selectedFileUrl])

    const { getRootProps, getInputProps } = useDropzone({
        onDrop,
        multiple: false,
        maxSize: MAX_IMAGE_SIZE,
        accept: {
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/webp': ['.webp'],
        },
    })

    return (
        <div className='dropzone' {...getRootProps()}>
            <input {...getInputProps()} data-testid="dropzone-input" />

            {
                selectedFileUrl
                    ? <img src={selectedFileUrl} alt="Point thumbnail" />
                    : (
                        <p>
                            <FiUpload />
                            {error || 'Imagem do estabelecimento'}
                        </p>
                    )
            }
        </div>
    )
}

export default Dropzone
