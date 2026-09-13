import app from './app.ts'
import { appConfig } from './config/env.ts'

app.listen(appConfig.port, () => {
    console.log(`Server running on port ${appConfig.port}`)
})
