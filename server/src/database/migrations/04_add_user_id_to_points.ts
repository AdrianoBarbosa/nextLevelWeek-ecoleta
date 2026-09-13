import type { Knex } from 'knex'

// O PRAGMA foreign_keys não pode ser alterado dentro de uma transação.
export const config = { transaction: false }

export async function up(knex: Knex) {
    // Nulo para os pontos criados antes de existir autenticação.
    return knex.schema.alterTable('points', table => {
        table.integer('user_id').references('id').inTable('users')
    })
}

export async function down(knex: Knex) {
    // No SQLite remover uma coluna com foreign key exige recriar a tabela points,
    // que por sua vez é referenciada por point_items.
    await knex.raw('PRAGMA foreign_keys = OFF')

    try {
        await knex.schema.alterTable('points', table => {
            table.dropForeign('user_id')
            table.dropColumn('user_id')
        })
    } finally {
        await knex.raw('PRAGMA foreign_keys = ON')
    }
}
