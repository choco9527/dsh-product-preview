/** Preserve the licenses of React Flow and its bundled runtime dependencies. */
import { createRequire } from 'node:module'
import { dirname, join, parse } from 'node:path'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
const licenses = new Map()
function collect(name, from) {
  const require = createRequire(from)
  let directory = dirname(require.resolve(name))
  let manifest
  while (directory !== parse(directory).root) {
    const file = join(directory, 'package.json')
    if (existsSync(file)) {
      const candidate = JSON.parse(readFileSync(file, 'utf8'))
      if (candidate.name === name) { manifest = candidate; break }
    }
    directory = dirname(directory)
  }
  if (!manifest) throw Error('Package manifest missing: ' + name)
  const key = name + '@' + manifest.version
  if (licenses.has(key)) return
  const files = readdirSync(directory).filter(file => /^licen[sc]e(?:[.-].*)?$/i.test(file))
  if (!files.length) throw Error('License missing: ' + key)
  licenses.set(key, files.map(file => readFileSync(join(directory, file), 'utf8')).join('\n'))
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    if (!dependency.startsWith('@types/')) collect(dependency, join(directory, 'package.json'))
  }
}
collect('@xyflow/react', new URL('../package.json', import.meta.url))
collect('fflate', new URL('../package.json', import.meta.url))
writeFileSync(new URL('../lib/flow-licenses.txt', import.meta.url),
  [...licenses].sort(([a], [b]) => a.localeCompare(b)).map(([name, license]) => name + '\n\n' + license).join('\n\n'))
console.log('Preserved React Flow dependency licenses: ' + licenses.size)
