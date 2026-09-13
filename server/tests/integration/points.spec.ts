import fs from 'node:fs'
import path from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
    app,
    request,
    connection,
    PNG,
    createUser,
    createPoint,
    tokenFor,
    pointFields,
    postPoint,
    uploadedFiles,
    clearUploads,
    resetDatabase,
} from '../helpers/factories.ts'
import { paths } from '../../src/config/paths.ts'

describe('Points', () => {
    let user: Awaited<ReturnType<typeof createUser>>
    let token: string

    beforeEach(async () => {
        await resetDatabase()
        user = await createUser()
        token = tokenFor(user.id)
    })

    afterEach(clearUploads)
    afterAll(() => connection.destroy())

    describe('GET /points', () => {
        beforeEach(async () => {
            await createPoint(user.id, { name: 'Lâmpadas e Pilhas' }, [1, 2])
            await createPoint(user.id, { name: 'Só Óleo' }, [6])
            await createPoint(user.id, { name: 'Outra cidade', city: 'Campinas' }, [1])
        })

        it('filters by city, uf and items without duplicates', async () => {
            const response = await request(app).get('/points').query({ city: 'Limeira', uf: 'SP', items: '1,2' })

            expect(response.status).toBe(200)
            expect(response.body.map((point: { name: string }) => point.name)).toEqual(['Lâmpadas e Pilhas'])
            expect(response.body[0].image_url).toBe('http://api.test/uploads/ponto.png')
        })

        it('returns every point of the city when no item is selected', async () => {
            const response = await request(app).get('/points').query({ city: 'Limeira', uf: 'SP' })

            expect(response.body).toHaveLength(2)
        })

        it('does not expose the owner of the point', async () => {
            const response = await request(app).get('/points').query({ city: 'Limeira', uf: 'SP' })

            expect(response.body[0]).not.toHaveProperty('user_id')
        })

        it.each([
            ['city is missing', { uf: 'SP' }],
            ['uf has 3 chars', { city: 'Limeira', uf: 'SPP' }],
            ['items is not a list of ids', { city: 'Limeira', uf: 'SP', items: '1,abc' }],
        ])('returns 400 when %s', async (_, query) => {
            const response = await request(app).get('/points').query(query)

            expect(response.status).toBe(400)
        })
    })

    describe('GET /points/:id', () => {
        it('shows the point and its items', async () => {
            const id = await createPoint(user.id, {}, [1, 6])

            const response = await request(app).get(`/points/${id}`)

            expect(response.status).toBe(200)
            expect(response.body.point).toMatchObject({ id, name: 'Recicla Mais', image_url: 'http://api.test/uploads/ponto.png' })
            expect(response.body.point).not.toHaveProperty('user_id')
            expect(response.body.items).toEqual([{ title: 'Lâmpadas' }, { title: 'Óleo de Cozinha' }])
        })

        it('returns 404 when the point does not exist', async () => {
            expect((await request(app).get('/points/999')).status).toBe(404)
        })

        it('returns 400 for a non numeric id', async () => {
            expect((await request(app).get('/points/abc')).status).toBe(400)
        })
    })

    describe('POST /points', () => {
        it('creates a point owned by the authenticated user with a random image name', async () => {
            const response = await postPoint(token, pointFields(), { buffer: PNG, contentType: 'image/png', filename: '../../evil.png' })

            expect(response.status).toBe(201)
            expect(response.body).not.toHaveProperty('user_id')
            expect(response.body.image).toMatch(/^[0-9a-f]{32}\.png$/)
            expect(response.body.image_url).toBe(`http://api.test/uploads/${response.body.image}`)

            const saved = await connection('points').where('id', response.body.id).first()
            expect(saved).toMatchObject({ name: 'Recicla Mais', city: 'Limeira', user_id: user.id })

            const items = await connection('point_items').where('point_id', response.body.id).pluck('item_id')
            expect(items.map(Number)).toEqual([1, 2])

            expect(uploadedFiles()).toEqual([response.body.image])
            expect(fs.existsSync(path.resolve(paths.uploads, '..', 'evil.png'))).toBe(false)

            const image = await request(app).get(`/uploads/${response.body.image}`)
            expect(image.status).toBe(200)
            expect(image.headers['cross-origin-resource-policy']).toBe('cross-origin')
        })

        it('returns 401 without a token and does not store the image', async () => {
            const response = await postPoint(null)

            expect(response.status).toBe(401)
            expect(uploadedFiles()).toEqual([])
        })

        it('returns 401 for a token of a deleted user instead of failing on the foreign key', async () => {
            const response = await postPoint(tokenFor(999))

            expect(response.status).toBe(401)
            expect(uploadedFiles()).toEqual([])
        })

        it('returns 400 without an image', async () => {
            const response = await postPoint(token, pointFields(), null)

            expect(response.status).toBe(400)
            expect(response.body).toEqual({ message: 'Image is required.' })
        })

        it('rejects SVG uploads', async () => {
            const response = await postPoint(token, pointFields(), { buffer: Buffer.from('<svg onload="alert(1)"/>'), contentType: 'image/svg+xml', filename: 'x.svg' })

            expect(response.status).toBe(400)
            expect(uploadedFiles()).toEqual([])
        })

        it('rejects a file whose content is not the declared image type', async () => {
            const response = await postPoint(token, pointFields(), { buffer: Buffer.from('<html><script>alert(1)</script>'), contentType: 'image/png' })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({ message: 'Image must be a JPEG, PNG or WebP file.' })
            expect(uploadedFiles()).toEqual([])
        })

        it('rejects images larger than 5MB', async () => {
            const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])

            const response = await postPoint(token, pointFields(), { buffer: big, contentType: 'image/png' })

            expect(response.status).toBe(400)
            expect(response.body).toEqual({ message: 'Image is too large.' })
            expect(uploadedFiles()).toEqual([])
        })

        it.each([
            ['whatsapp has letters', { whatsapp: '19abc000000' }],
            ['latitude is out of range', { latitude: '120' }],
            ['uf has 3 chars', { uf: 'SPP' }],
            ['items is empty', { items: '' }],
            ['items is not a list of ids', { items: '1;DROP TABLE points' }],
        ])('returns 400 and removes the upload when %s', async (_, overrides) => {
            const response = await postPoint(token, pointFields(overrides))

            expect(response.status).toBe(400)
            expect(uploadedFiles()).toEqual([])
            expect(await connection('points').count({ count: '*' })).toEqual([{ count: 0 }])
        })

        it('returns 400 when an item does not exist', async () => {
            const response = await postPoint(token, pointFields({ items: '1,999' }))

            expect(response.status).toBe(400)
            expect(response.body).toEqual({ message: 'One or more items do not exist.' })
            expect(uploadedFiles()).toEqual([])
        })
    })
})
