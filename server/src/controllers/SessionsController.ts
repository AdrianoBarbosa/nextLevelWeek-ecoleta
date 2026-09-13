import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'

import knex from '../database/connection.ts'
import { authConfig } from '../config/auth.ts'
import { hashPassword, verifyPassword } from '../utils/password.ts'

// Hash usado quando o e-mail não existe, para que o tempo de resposta não revele quais contas existem.
const dummyHash = hashPassword('dummy-password-for-timing')

class SessionsController {
    async create(request: Request, response: Response) {
        const { email, password } = request.body

        const user = await knex('users')
            .where('email', String(email).toLowerCase())
            .first('id', 'name', 'email', 'password_hash')

        const passwordMatches = await verifyPassword(password, user?.password_hash ?? await dummyHash)

        if (!user || !passwordMatches)
            return response.status(401).json({ message: 'Invalid e-mail or password.' })

        const token = jwt.sign({}, authConfig.secret, {
            subject: String(user.id),
            expiresIn: authConfig.expiresIn,
            algorithm: authConfig.algorithm,
        })

        return response.json({
            user: { id: user.id, name: user.name, email: user.email },
            token,
        })
    }
}

export default SessionsController
