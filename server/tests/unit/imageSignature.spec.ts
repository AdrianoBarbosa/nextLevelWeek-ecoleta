import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { hasValidImageSignature } from '../../src/utils/imageSignature.ts'
import { PNG } from '../helpers/factories.ts'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'signature-'))

function write(name: string, content: Buffer) {
    const file = path.join(dir, name)
    fs.writeFileSync(file, content)
    return file
}

describe('hasValidImageSignature', () => {
    afterAll(() => fs.rmSync(dir, { recursive: true, force: true }))

    it.each([
        ['PNG', write('a.png', PNG), 'image/png'],
        ['JPEG', write('a.jpg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])), 'image/jpeg'],
        ['WebP', write('a.webp', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')])), 'image/webp'],
    ])('accepts a real %s file', async (_, file, mimetype) => {
        expect(await hasValidImageSignature(file, mimetype)).toBe(true)
    })

    it('rejects an HTML file disguised as PNG', async () => {
        const file = write('fake.png', Buffer.from('<script>alert(1)</script>'))

        expect(await hasValidImageSignature(file, 'image/png')).toBe(false)
    })

    it('rejects a PNG declared as JPEG', async () => {
        expect(await hasValidImageSignature(write('b.png', PNG), 'image/jpeg')).toBe(false)
    })

    it('rejects unsupported mimetypes and empty files', async () => {
        expect(await hasValidImageSignature(write('c.svg', Buffer.from('<svg/>')), 'image/svg+xml')).toBe(false)
        expect(await hasValidImageSignature(write('empty.png', Buffer.alloc(0)), 'image/png')).toBe(false)
    })
})
