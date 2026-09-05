/** Browser bundles cannot resolve external SVGA package names at runtime. */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const client = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
assert.doesNotMatch(client, /(?:import|require)\s*\(\s*['"]svga\.lite['"]\s*\)/u,
  'The SVGA player must be bundled into the browser client')
console.log('SVGA browser bundle check passed')
