import fs from 'node:fs/promises'

// Assinaturas (magic bytes) dos formatos aceitos, já que o mimetype é informado pelo cliente.
const SIGNATURES: Record<string, (header: Buffer) => boolean> = {
    'image/jpeg': header => header.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])),
    'image/png': header => header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    'image/webp': header => header.toString('latin1', 0, 4) === 'RIFF' && header.toString('latin1', 8, 12) === 'WEBP',
}

export async function hasValidImageSignature(filePath: string, mimetype: string) {
    const matches = SIGNATURES[mimetype]

    if (!matches)
        return false

    const file = await fs.open(filePath, 'r')

    try {
        const header = Buffer.alloc(12)
        const { bytesRead } = await file.read(header, 0, header.length, 0)

        return matches(header.subarray(0, bytesRead))
    } finally {
        await file.close()
    }
}
