import express from 'express'
import { rateLimit } from 'express-rate-limit'
import { celebrate, Joi, Segments } from 'celebrate'

import upload from './config/upload.ts'
import { appConfig } from './config/env.ts'
import authenticate from './middlewares/authenticate.ts'
import ensurePointOwner from './middlewares/ensurePointOwner.ts'

import PointsController from './controllers/PointsController.ts'
import ItemsController from './controllers/ItemsController.ts'
import UsersController from './controllers/UsersController.ts'
import SessionsController from './controllers/SessionsController.ts'

const pointsController = new PointsController()
const itemsController = new ItemsController()
const usersController = new UsersController()
const sessionsController = new SessionsController()

const routes = express.Router()

// Cada rota tem seu próprio contador, para que cadastros não consumam as tentativas de logon.
const createLimiter = () => rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: appConfig.authRateLimit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many attempts, please try again later.' },
})

const itemList = Joi.string().pattern(/^\d+(\s*,\s*\d+)*$/)

const pointIdParams = celebrate({
    [Segments.PARAMS]: Joi.object().keys({
        id: Joi.number().integer().positive().required(),
    })
})

// A imagem vem no multipart e é tratada pelo multer, fora do corpo validado aqui.
const pointBody = celebrate({
    [Segments.BODY]: Joi.object().keys({
        name: Joi.string().trim().max(255).required(),
        email: Joi.string().trim().required().email().max(255),
        whatsapp: Joi.string().pattern(/^\d{10,13}$/).required(),
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        city: Joi.string().trim().max(255).required(),
        uf: Joi.string().required().length(2),
        items: itemList.required(),
    })
},
{
    abortEarly: false
})

routes.post('/users', createLimiter(), celebrate({
    [Segments.BODY]: Joi.object().keys({
        name: Joi.string().trim().max(255).required(),
        email: Joi.string().trim().email().max(255).required(),
        password: Joi.string().min(8).max(128).required(),
    })
}), usersController.create)

routes.post('/sessions', createLimiter(), celebrate({
    [Segments.BODY]: Joi.object().keys({
        email: Joi.string().trim().max(255).required(),
        password: Joi.string().max(128).required(),
    })
}), sessionsController.create)

routes.get('/items', itemsController.index)

routes.get('/points', celebrate({
    [Segments.QUERY]: Joi.object().keys({
        city: Joi.string().required(),
        uf: Joi.string().length(2).required(),
        items: itemList,
    })
}), pointsController.index)

routes.get('/points/:id', pointIdParams, pointsController.show)

routes.post('/points', authenticate, upload.single('image'), pointBody, pointsController.create)

routes.put('/points/:id', authenticate, pointIdParams, ensurePointOwner, upload.single('image'), pointBody, pointsController.update)

routes.delete('/points/:id', authenticate, pointIdParams, ensurePointOwner, pointsController.delete)

export default routes
