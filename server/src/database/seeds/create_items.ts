import type { Knex } from 'knex'

export async function seed(knex: Knex) {
    const [{ count }] = await knex('items').count({ count: '*' })

    // Evita duplicar os itens ao rodar o seed mais de uma vez.
    if (Number(count) > 0)
        return

    await knex('items').insert([
        { title: 'Lâmpadas', image: 'lampadas.svg' },
        { title: 'Pilhas e Baterias', image: 'baterias.svg' },
        { title: 'Papéis e Papelão', image: 'papeis-papelao.svg' },
        { title: 'Resíduos Eletrônicos', image: 'eletronicos.svg' },
        { title: 'Resíduos Orgânicos', image: 'organicos.svg' },
        { title: 'Óleo de Cozinha', image: 'oleo.svg' }
    ])
}
