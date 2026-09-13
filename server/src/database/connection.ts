import path from 'node:path'
import knex, { type Knex } from 'knex'

import { appConfig } from '../config/env.ts'
import { paths } from '../config/paths.ts'

export const config: Knex.Config = {
    client: 'better-sqlite3',
    connection: {
        filename: appConfig.isTest
            ? ':memory:'
            : process.env.DB_FILENAME || path.join(paths.database, 'database.sqlite'),
    },
    migrations: {
        directory: path.join(paths.database, 'migrations'),
        loadExtensions: ['.ts'],
    },
    seeds: {
        directory: path.join(paths.database, 'seeds'),
        loadExtensions: ['.ts'],
    },
    useNullAsDefault: true,
}

const connection = knex(config)

export default connection
