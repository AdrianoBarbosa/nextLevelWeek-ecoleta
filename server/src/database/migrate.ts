import connection from './connection.ts'

const [batch, migrations] = await connection.migrate.latest()

console.log(migrations.length ? `Batch ${batch}: ${migrations.join(', ')}` : 'Already up to date')

await connection.destroy()
