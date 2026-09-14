import type { NextFunction, Request, Response } from 'express'

import knex from '../database/connection.ts'

// Roda antes do upload, para que ninguém consiga gravar arquivos em pontos que não são seus.
export default async function ensurePointOwner(request: Request, response: Response, next: NextFunction) {
    const point = await knex('points').where('id', request.params.id).first('user_id')

    if (!point)
        return response.status(404).json({ message: 'Point not found.' })

    // Pontos criados antes da autenticação não têm dono e não podem ser alterados por ninguém.
    if (point.user_id === null || Number(point.user_id) !== request.userId)
        return response.status(403).json({ message: 'You can only change your own points.' })

    return next()
}
