import type { Request, Response } from 'express'

import knex from '../database/connection.ts'
import { hashPassword } from '../utils/password.ts'

class UsersController {
    async create(request: Request, response: Response) {
        const { name, email, password } = request.body

        const normalizedEmail = String(email).toLowerCase()

        const password_hash = await hashPassword(password)

        try {
            const [id] = await knex('users').insert({ name, email: normalizedEmail, password_hash })

            return response.status(201).json({ id, name, email: normalizedEmail })
        } catch (err) {
            if ((err as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE')
                return response.status(409).json({ message: 'E-mail already registered.' })

            throw err
        }
    }
}

export default UsersController
