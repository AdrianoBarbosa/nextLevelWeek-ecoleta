import type { Request, Response } from 'express'

import knex from '../database/connection.ts'
import { appConfig } from '../config/env.ts'

class ItemsController {
    async index(request: Request, response: Response) {
        const items = await knex('items').select('*')

        const serializedItems = items.map(item => {
            return {
                id: item.id,
                title: item.title,
                image_url: `${appConfig.url}/assets/items/${item.image}`
            }
        })

        return response.json(serializedItems)
    }
}

export default ItemsController
