/**
 * Build step: inline the bundled Vazirmatn face into the browser bundle.
 *
 * The Harness loads a plugin's Client module as one plain script, so the font
 * has to travel inside it. `src/client.js` keeps a readable placeholder and
 * this script replaces it with the base64 `data:` URL of the shipped WOFF2.
 * Run it after editing `src/client.js`:
 *
 *   node tools/build-client.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PLACEHOLDER = '__VAZIRMATN_FONT_URL__'

const font = readFileSync(join(root, 'assets', 'Vazirmatn-Variable.woff2'))
const source = readFileSync(join(root, 'src', 'client.js'), 'utf8')

if (!source.includes(PLACEHOLDER)) throw new Error(`src/client.js no longer contains ${PLACEHOLDER}`)

const url = `data:font/woff2;base64,${font.toString('base64')}`
const output = source.split(PLACEHOLDER).join(url)

if (output.includes('__VAZIRMATN')) throw new Error('a build placeholder survived inlining')

writeFileSync(join(root, 'client.js'), output)
console.log(`client.js written: ${output.length} bytes (font ${font.length} bytes)`)
