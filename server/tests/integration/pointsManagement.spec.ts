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
    putPoint,
    storeUpload,
    uploadedFiles,
    clearUploads,
    resetDatabase,
} from '../helpers/factories.ts'

const itemsOf = async (pointId: number) =>
    (await connection('point_items').where('point_id', pointId).orderBy('item_id').pluck('item_id')).map(Number)

const updatedFields = pointFields({
    name: 'Recicla Mais Centro',
    whatsapp: '5519911111111',
    latitude: '-22.6',
    longitude: '-47.5',
    city: 'Campinas',
    items: '3,6',
})

describe('Point management', () => {
    let owner: Awaited<ReturnType<typeof createUser>>
    let ownerToken: string
    let otherToken: string
    let pointId: number

    beforeEach(async () => {
        await resetDatabase()
        owner = await createUser()
        ownerToken = tokenFor(owner.id)
        otherToken = tokenFor((await createUser({ email: 'outra@exemplo.com' })).id)

        storeUpload('antiga.png')
        pointId = await createPoint(owner.id, { image: 'antiga.png' }, [1, 2])
    })

    afterEach(clearUploads)
    afterAll(() => connection.destroy())

    describe('PUT /points/:id', () => {
        it('updates the data and items, keeping the current image when none is sent', async () => {
            const response = await putPoint(pointId, ownerToken, updatedFields)

            expect(response.status).toBe(200)
            expect(response.body).toMatchObject({
                id: pointId,
                name: 'Recicla Mais Centro',
                city: 'Campinas',
                image: 'antiga.png',
                image_url: 'http://api.test/uploads/antiga.png',
            })
            expect(response.body).not.toHaveProperty('user_id')

            const saved = await connection('points').where('id', pointId).first()
            expect(saved).toMatchObject({ name: 'Recicla Mais Centro', whatsapp: '5519911111111', city: 'Campinas', user_id: owner.id })
            expect(await itemsOf(pointId)).toEqual([3, 6])
            expect(uploadedFiles()).toEqual(['antiga.png'])
        })

        it('replaces the image and removes the previous file', async () => {
            const response = await putPoint(pointId, ownerToken, updatedFields, { buffer: PNG, contentType: 'image/png' })

            expect(response.status).toBe(200)
            expect(response.body.image).toMatch(/^[0-9a-f]{32}\.png$/)
            expect(uploadedFiles()).toEqual([response.body.image])
        })

        it('returns 403 for another user and keeps the point and its image untouched', async () => {
            const response = await putPoint(pointId, otherToken, updatedFields, { buffer: PNG, contentType: 'image/png' })

            expect(response.status).toBe(403)
            expect(await connection('points').where('id', pointId).first('name')).toEqual({ name: 'Recicla Mais' })
            expect(await itemsOf(pointId)).toEqual([1, 2])
            expect(uploadedFiles()).toEqual(['antiga.png'])
        })

        it('returns 403 for a legacy point without owner', async () => {
            const legacyId = await createPoint(null)

            const response = await putPoint(legacyId, ownerToken, updatedFields)

            expect(response.status).toBe(403)
        })

        it('returns 401 without a token', async () => {
            expect((await putPoint(pointId, null, updatedFields)).status).toBe(401)
        })

        it('returns 404 for a point that does not exist', async () => {
            expect((await putPoint(999, ownerToken, updatedFields)).status).toBe(404)
        })

        it('returns 400 for a non numeric id', async () => {
            expect((await putPoint('abc', ownerToken, updatedFields)).status).toBe(400)
        })

        it.each([
            ['a required field is missing', pointFields({ name: '' }), null],
            ['an item does not exist', pointFields({ items: '1,999' }), null],
            ['the new image is not a real image', pointFields(), { buffer: Buffer.from('<html>'), contentType: 'image/png' }],
        ])('returns 400 when %s, without changing the point or leaking uploads', async (_, fields, image) => {
            const response = await putPoint(pointId, ownerToken, fields, image)

            expect(response.status).toBe(400)
            expect(await connection('points').where('id', pointId).first('name', 'image')).toEqual({ name: 'Recicla Mais', image: 'antiga.png' })
            expect(await itemsOf(pointId)).toEqual([1, 2])
            expect(uploadedFiles()).toEqual(['antiga.png'])
        })
    })

    describe('DELETE /points/:id', () => {
        const remove = (id: number | string, token: string | null) => {
            const req = request(app).delete(`/points/${id}`)
            return token ? req.set('Authorization', `Bearer ${token}`) : req
        }

        it('deletes the point, its items and its image', async () => {
            const response = await remove(pointId, ownerToken)

            expect(response.status).toBe(204)
            expect(await connection('points').where('id', pointId).first()).toBeUndefined()
            expect(await itemsOf(pointId)).toEqual([])
            expect(uploadedFiles()).toEqual([])
            expect((await request(app).get(`/points/${pointId}`)).status).toBe(404)
        })

        it('returns 403 for another user and keeps everything', async () => {
            const response = await remove(pointId, otherToken)

            expect(response.status).toBe(403)
            expect(await connection('points').where('id', pointId).first()).toBeDefined()
            expect(await itemsOf(pointId)).toEqual([1, 2])
            expect(uploadedFiles()).toEqual(['antiga.png'])
        })

        it('returns 403 for a legacy point without owner', async () => {
            expect((await remove(await createPoint(null), ownerToken)).status).toBe(403)
        })

        it('returns 401 without a token', async () => {
            expect((await remove(pointId, null)).status).toBe(401)
        })

        it('returns 404 for a point that does not exist', async () => {
            expect((await remove(999, ownerToken)).status).toBe(404)
        })

        it('returns 400 for a non numeric id', async () => {
            expect((await remove('abc', ownerToken)).status).toBe(400)
        })
    })
})
