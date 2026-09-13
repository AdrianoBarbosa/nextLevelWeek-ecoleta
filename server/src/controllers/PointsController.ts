import fs from 'node:fs/promises'
import type { Request, Response } from 'express'

import knex from '../database/connection.ts'
import { appConfig } from '../config/env.ts'
import { hasValidImageSignature } from '../utils/imageSignature.ts'

const POINT_FIELDS = [
    'points.id',
    'points.image',
    'points.name',
    'points.email',
    'points.whatsapp',
    'points.latitude',
    'points.longitude',
    'points.city',
    'points.uf',
]

function parseItems(items: string) {
    return [...new Set(items.split(',').map(item => Number(item.trim())))]
}

function serializePoint<T extends { image: string }>(point: T) {
    return {
        ...point,
        image_url: `${appConfig.url}/uploads/${point.image}`
    }
}

class PointsController {
    async index(request: Request, response: Response) {
        const { city, uf, items } = request.query as { city: string, uf: string, items?: string }

        const query = knex('points')
            .where('city', city)
            .where('uf', uf)
            .distinct()
            .select(POINT_FIELDS)

        if (items)
            query
                .join('point_items', 'points.id', '=', 'point_items.point_id')
                .whereIn('point_items.item_id', parseItems(items))

        const points = await query

        return response.json(points.map(serializePoint))
    }

    async show(request: Request, response: Response) {
        const { id } = request.params

        const point = await knex('points').where('id', id).first(POINT_FIELDS)

        if (!point)
            return response.status(404).json({ message: 'Point not found.' })

        const items = await knex('items')
            .join('point_items', 'items.id', '=', 'point_items.item_id')
            .where('point_items.point_id', id)
            .select('items.title')

        return response.json({ point: serializePoint(point), items })
    }

    async create(request: Request, response: Response) {
        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items
        } = request.body

        const file = request.file

        if (!file)
            return response.status(400).json({ message: 'Image is required.' })

        if (!await hasValidImageSignature(file.path, file.mimetype)) {
            await fs.rm(file.path, { force: true })
            return response.status(400).json({ message: 'Image must be a JPEG, PNG or WebP file.' })
        }

        const itemIds = parseItems(items)

        const [{ count }] = await knex('items').whereIn('id', itemIds).count({ count: '*' })

        if (Number(count) !== itemIds.length) {
            await fs.rm(file.path, { force: true })
            return response.status(400).json({ message: 'One or more items do not exist.' })
        }

        const point = {
            image: file.filename,
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            user_id: request.userId,
        }

        try {
            const point_id = await knex.transaction(async trx => {
                const [id] = await trx('points').insert(point)

                await trx('point_items').insert(itemIds.map(item_id => ({ item_id, point_id: id })))

                return id
            })

            const { user_id, ...publicPoint } = point

            return response.status(201).json(serializePoint({ id: point_id, ...publicPoint }))
        } catch (err) {
            await fs.rm(file.path, { force: true })
            throw err
        }
    }
}

export default PointsController
