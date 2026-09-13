import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import { authConfig } from '../config/auth.ts'
import knex from '../database/connection.ts'

export default async function authenticate(request: Request, response: Response, next: NextFunction) {
    const { authorization } = request.headers

    if (!authorization)
        return response.status(401).json({ message: 'Token not provided.' })

    const [scheme, token] = authorization.split(' ')

    if (scheme !== 'Bearer' || !token)
        return response.status(401).json({ message: 'Malformed token.' })

    let userId: number

    try {
        const payload = jwt.verify(token, authConfig.secret, {
            algorithms: [authConfig.algorithm],
        })

        userId = Number(typeof payload === 'string' ? NaN : payload.sub)
    } catch {
        return response.status(401).json({ message: 'Invalid or expired token.' })
    }

    // O token pode sobreviver ao usuário (ex.: banco recriado), então a conta precisa existir.
    const user = Number.isInteger(userId) && await knex('users').where('id', userId).first('id')

    if (!user)
        return response.status(401).json({ message: 'Invalid or expired token.' })

    request.userId = userId

    return next()
}
