import connection from './connection.ts'

const [seeds] = await connection.seed.run()

console.log(`Seeds: ${seeds.join(', ')}`)

await connection.destroy()
