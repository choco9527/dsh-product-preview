/** Browser bundles cannot resolve external SVGA package names at runtime. */
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { builtinModules, createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
const client = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const builtins = new Set(builtinModules.flatMap(name => [name, `node:${name}`]))
for (const match of client.matchAll(/\b(?:require|import)\s*\(\s*['"]([^'"]+)['"]\s*\)/gu)) {
  assert.ok(!builtins.has(match[1]), `Browser factory cannot load Node module: ${match[1]}`)
}
assert.doesNotMatch(client, /(?:import|require)\s*\(\s*['"]svga\.lite['"]\s*\)/u,
  'The SVGA player must be bundled into the browser client')
console.log('SVGA browser bundle check passed')
assert.doesNotMatch(client, /(?:import|require)\s*\(\s*['"](?:@xyflow\/|\.\/)/u,
  'React Flow and lazy graph modules must be embedded in the browser factory')
assert.match(client, /\.react-flow__viewport/u, 'React Flow base CSS must be embedded')
assert.doesNotMatch(client, /\bprocess\.env\b/u, 'The browser does not provide a Node process global')

// Execute the shipped factory with only the React modules provided by the client loader.
const require = createRequire(import.meta.url)
const modules = new Set(['react', 'react/jsx-runtime', 'react-dom'])
let loaded
const window = { URL, __ModuleLoader__: { load({ factory }) {
  loaded = factory(id => {
    assert.ok(modules.has(id), `Unregistered browser module: ${id}`)
    return require(id)
  })
} } }
runInNewContext(client, { window, URL, Blob, TextEncoder, TextDecoder, console, setTimeout, clearTimeout }, { timeout: 5000 })
assert.equal(typeof loaded?.apply, 'function', 'Shipped plugin factory must initialize')
console.log('Browser factory initialized without Node dependencies')
