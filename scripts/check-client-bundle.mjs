/** Browser bundles cannot resolve external SVGA package names at runtime. */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
const client = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
assert.doesNotMatch(client, /(?:import|require)\s*\(\s*['"]svga\.lite['"]\s*\)/u,
  'The SVGA player must be bundled into the browser client')
console.log('SVGA browser bundle check passed')
assert.doesNotMatch(client, /(?:import|require)\s*\(\s*['"](?:@xyflow\/|\.\/)/u,
  'React Flow and lazy graph modules must be embedded in the browser factory')
assert.match(client, /\.react-flow__viewport/u, 'React Flow base CSS must be embedded')
assert.doesNotMatch(client, /\bprocess\.env\b/u, 'The browser does not provide a Node process global')
