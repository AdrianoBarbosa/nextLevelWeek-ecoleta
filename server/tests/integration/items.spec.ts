import { afterAll, beforeEach, describe, expect, it } from 'vitest'

import { app, request, connection, resetDatabase } from '../helpers/factories.ts'

describe('Items', () => {
    beforeEach(resetDatabase)
    afterAll(() => connection.destroy())

    it('lists the seeded items with a public image url', async () => {
        const response = await request(app).get('/items')

        expect(response.status).toBe(200)
        expect(response.body).toHaveLength(6)
        expect(response.body[0]).toEqual({
            id: 1,
            title: 'Lâmpadas',
            image_url: 'http://api.test/assets/items/lampadas.svg',
        })
    })

    it('serves the item images', async () => {
        const response = await request(app).get('/assets/items/lampadas.svg')

        expect(response.status).toBe(200)
        expect(response.headers['content-type']).toContain('image/svg+xml')
    })

    it('does not seed the items twice', async () => {
        await connection.seed.run()

        expect(await connection('items').count({ count: '*' })).toEqual([{ count: 6 }])
    })
})
