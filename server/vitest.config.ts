import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        setupFiles: ['./tests/helpers/env.ts'],
        coverage: {
            include: ['src/**/*.ts'],
            exclude: ['src/server.ts', 'src/database/migrate.ts', 'src/database/seed.ts'],
        },
    },
})
