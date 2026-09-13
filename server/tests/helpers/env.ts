import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.NODE_ENV = 'test'
// Limite alto para que as suítes não esbarrem no rate limit, testado separadamente.
process.env.AUTH_RATE_LIMIT ??= '1000'
process.env.APP_URL = 'http://api.test'
process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'ecoleta-uploads-'))
