#!/usr/bin/env node
/**
 * deepseek-rtl installer.
 *
 * A DeepSeek Harness plugin is not patched into the application: it is a bundle
 * installed into a *profile* (usually `desktop`). This command performs the two
 * steps the Harness Plugin Manager performs, from a terminal:
 *
 *   1. `pnpm add <package>` inside the profile directory;
 *   2. select the package in the profile manifest's `dsh.profile.bundles`.
 *
 * Nothing else is touched, and `--revert` undoes both. The profile is never
 * edited while pnpm runs, and every manifest write is atomic.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_NAME = 'deepseek-rtl'
const here = dirname(fileURLToPath(import.meta.url))
const self = JSON.parse(await readFile(join(here, '..', 'package.json'), 'utf8'))

const HELP = `
deepseek-rtl ${self.version} — Persian and Arabic right-to-left text for DeepSeek Harness

Usage
  npx deepseek-rtl [options]          install and enable the plugin in a profile
  npx deepseek-rtl --status           report what the profile has
  npx deepseek-rtl --revert           remove the plugin from the profile

Options
  --profile <name>   profile to change (default: $DSH_PROFILE, else "desktop")
  --home <dir>       DSH home directory (default: $DSH_HOME, else ~/.dsh)
  --from <dir>       install a local checkout instead of the npm package
  -h, --help         show this help
  -v, --version      print the version

Quit DeepSeek Harness before installing or removing the plugin: the Harness
composes a profile while it boots, so the change appears after the next start.
`

/**
 * Read one option value.
 * @param {string[]} argv - the remaining arguments.
 * @param {number} index - position of the value.
 * @param {string} flag - the option name, for the error message.
 * @returns {string} the value.
 */
function valueOf(argv, index, flag) {
  const value = argv[index]
  if (value === undefined || value.startsWith('-')) fail(`${flag} needs a value`)
  return value
}

/**
 * Parse the command line.
 * @param {string[]} argv - process arguments after the executable.
 * @returns {{profile: string, home: string | undefined, status: boolean, revert: boolean, help: boolean, version: boolean, from: string | undefined}} the options.
 */
function parseArgs(argv) {
  const options = {
    profile: process.env.DSH_PROFILE ?? 'desktop',
    home: undefined,
    status: false,
    revert: false,
    help: false,
    version: false,
    from: undefined,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '-h' || arg === '--help') options.help = true
    else if (arg === '-v' || arg === '--version') options.version = true
    else if (arg === '--status') options.status = true
    else if (arg === '--revert' || arg === '--remove' || arg === '--uninstall') options.revert = true
    else if (arg === '--profile') options.profile = valueOf(argv, index += 1, '--profile')
    else if (arg === '--home') options.home = valueOf(argv, index += 1, '--home')
    else if (arg === '--from') options.from = valueOf(argv, index += 1, '--from')
    else if (arg.startsWith('--profile=')) options.profile = arg.slice('--profile='.length)
    else if (arg.startsWith('--home=')) options.home = arg.slice('--home='.length)
    else if (arg.startsWith('--from=')) options.from = arg.slice('--from='.length)
    else fail(`unknown option ${arg}\nRun "deepseek-rtl --help" for the options.`)
  }
  if (options.profile === '') fail('--profile needs a name')
  return options
}

/**
 * Locate the profile directory.
 * @param {{profile: string, home?: string | undefined}} options - parsed options.
 * @returns {{dir: string, name: string, home: string}} the profile location.
 */
function resolveProfile(options) {
  const home = options.home === undefined ? process.env.DSH_HOME ?? join(homedir(), '.dsh') : options.home
  const name = options.profile.toLowerCase()
  return { dir: join(home, 'profiles', name), name, home: resolve(home) }
}

/**
 * Stop with a message.
 * @param {string} message - what went wrong.
 * @returns {never} never returns.
 */
function fail(message) {
  process.stderr.write(`deepseek-rtl: ${message}\n`)
  process.exit(1)
}

/**
 * Print one status line.
 * @param {string} message - the line.
 */
function say(message) {
  process.stdout.write(`${message}\n`)
}

/**
 * Read and parse the profile manifest.
 * @param {string} dir - the profile directory.
 * @returns {Promise<Record<string, any>>} the parsed manifest.
 */
async function readManifest(dir) {
  const path = join(dir, 'package.json')
  try {
    return JSON.parse(await readFile(path, 'utf8'))
  } catch (error) {
    fail(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * Replace the profile manifest atomically.
 * @param {string} dir - the profile directory.
 * @param {Record<string, any>} manifest - the manifest to save.
 * @returns {Promise<void>} resolves once the new file is in place.
 */
async function writeManifest(dir, manifest) {
  const path = join(dir, 'package.json')
  const temporary = `${path}.deepseek-rtl-${process.pid}`
  await writeFile(temporary, `${JSON.stringify(manifest, undefined, 2)}\n`, { mode: 0o600 })
  await rename(temporary, path)
}

/**
 * The candidate install roots of a packaged DeepSeek Harness.
 * @returns {string[]} directories that may contain a `resources/` folder.
 */
function desktopRoots() {
  const roots = []
  const installDir = process.env.DSH_INSTALL_DIR
  if (installDir !== undefined) {
    const marker = installDir.indexOf('app.asar')
    if (marker > 0) roots.push(installDir.slice(0, marker))
  }
  const node = process.env.DSH_NODE_EXECUTABLE
  if (node !== undefined) roots.push(dirname(node))
  if (process.platform === 'win32') {
    if (process.env.LOCALAPPDATA !== undefined) roots.push(join(process.env.LOCALAPPDATA, 'Programs', 'DeepSeek Harness'))
    if (process.env.ProgramFiles !== undefined) roots.push(join(process.env.ProgramFiles, 'DeepSeek Harness'))
  } else if (process.platform === 'darwin') {
    roots.push('/Applications/DeepSeek Harness.app/Contents')
  } else {
    roots.push('/opt/DeepSeek Harness', join(homedir(), '.local', 'share', 'deepseek-harness'))
  }
  return roots
}

/**
 * Run a candidate pnpm, with or without a `cmd.exe` shim, and no shell parsing
 * from Node. A Windows shim is invoked as separate `cmd.exe` arguments so Node
 * quotes each token once and a path with spaces still arrives intact.
 * @param {{kind: 'direct', command: string, prefix: string[]} | {kind: 'cmd', tokens: string[]}} pnpm - the candidate.
 * @param {string[]} args - arguments after the executable.
 * @param {import('node:child_process').SpawnSyncOptionsWithStringEncoding} options - spawn options.
 * @returns {import('node:child_process').SpawnSyncReturns<string>} the run.
 */
function execPnpm(pnpm, args, options) {
  if (pnpm.kind === 'cmd') {
    const command = process.env.ComSpec ?? 'cmd.exe'
    return spawnSync(command, ['/d', '/s', '/c', ...pnpm.tokens, ...args], { ...options, shell: false })
  }
  return spawnSync(pnpm.command, [...pnpm.prefix, ...args], { ...options, shell: false })
}

/**
 * The pnpm command a run should use.
 * @returns {{kind: 'direct', command: string, prefix: string[], label: string} | {kind: 'cmd', tokens: string[], label: string}} the candidate.
 */
function findPnpm() {
  /** @type {({kind: 'direct', command: string, prefix: string[], label: string} | {kind: 'cmd', tokens: string[], label: string})[]} */
  const candidates = []
  if (process.env.DSH_PNPM !== undefined) {
    candidates.push({ kind: 'direct', command: process.execPath, prefix: [process.env.DSH_PNPM], label: process.env.DSH_PNPM })
  }
  for (const root of desktopRoots()) {
    for (const base of [root, join(root, 'resources')]) {
      const script = join(base, 'runtime', 'primary-runtime', 'dependencies', 'pnpm', 'bin', 'pnpm.cjs')
      if (existsSync(script)) candidates.push({ kind: 'direct', command: process.execPath, prefix: [script], label: script })
    }
  }
  if (process.platform === 'win32') {
    // A global pnpm is an npm shim (`pnpm.cmd`), which Windows runs through
    // cmd.exe; corepack is the same shape.
    candidates.push({ kind: 'cmd', tokens: ['pnpm'], label: 'pnpm on PATH' })
    candidates.push({ kind: 'cmd', tokens: ['corepack', 'pnpm'], label: 'corepack pnpm' })
  } else {
    candidates.push({ kind: 'direct', command: 'pnpm', prefix: [], label: 'pnpm on PATH' })
    candidates.push({ kind: 'direct', command: 'corepack', prefix: ['pnpm'], label: 'corepack pnpm' })
  }
  for (const candidate of candidates) {
    const probe = execPnpm(candidate, ['--version'], {
      encoding: 'utf8',
      timeout: 60_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    if (probe.status === 0) return candidate
  }
  return fail(
    'pnpm was not found.\n'
    + '  DeepSeek Harness Desktop ships one; open the app once so its runtime exists, or install pnpm (npm install -g pnpm).\n'
    + '  You can also point at one explicitly with DSH_PNPM=<path to pnpm.cjs>.',
  )
}

/**
 * Run pnpm in the profile directory with inherited output.
 * @param {ReturnType<typeof findPnpm>} pnpm - the executable.
 * @param {string[]} args - pnpm arguments.
 * @param {string} cwd - the profile directory.
 * @returns {number} the exit code.
 */
function runPnpm(pnpm, args, cwd) {
  const result = execPnpm(pnpm, args, { cwd, stdio: 'inherit' })
  if (result.error !== undefined) fail(`could not run pnpm: ${result.error.message}`)
  return result.status ?? 1
}

/**
 * The version installed in the profile, if any.
 * @param {string} dir - the profile directory.
 * @returns {Promise<string | undefined>} the installed version.
 */
async function installedVersion(dir) {
  try {
    const manifest = JSON.parse(await readFile(join(dir, 'node_modules', PACKAGE_NAME, 'package.json'), 'utf8'))
    return typeof manifest.version === 'string' ? manifest.version : undefined
  } catch {
    return undefined
  }
}

/**
 * Refuse a directory that is not an initialized profile.
 * @param {{dir: string, name: string, home: string}} profile - the profile location.
 * @returns {Promise<void>} resolves when the manifest exists.
 */
async function requireProfile(profile) {
  if (!existsSync(join(profile.dir, 'package.json'))) {
    fail(
      `no DeepSeek Harness profile at ${profile.dir}\n`
      + `  Open DeepSeek Harness once so it creates the "${profile.name}" profile, then quit it and run this again.\n`
      + '  A different profile or home can be named with --profile / --home.',
    )
  }
}

/**
 * Install the bundle and enable it.
 * @param {ReturnType<typeof parseArgs>} options - parsed options.
 * @returns {Promise<void>} resolves on success.
 */
async function install(options) {
  const profile = resolveProfile(options)
  await requireProfile(profile)
  const spec = options.from === undefined ? `${PACKAGE_NAME}@${self.version}` : `file:${resolve(options.from)}`
  const pnpm = findPnpm()
  say(`deepseek-rtl: installing ${spec}`)
  say(`deepseek-rtl: profile ${profile.name} (${profile.dir})`)
  const code = runPnpm(pnpm, ['add', spec], profile.dir)
  if (code !== 0) fail(`pnpm add exited with ${code}; nothing was enabled`)

  const manifest = await readManifest(profile.dir)
  const selection = manifest.dsh?.profile?.bundles
  const bundles = Array.isArray(selection) ? [...selection] : []
  if (!bundles.includes(PACKAGE_NAME)) bundles.push(PACKAGE_NAME)
  manifest.dsh = { ...manifest.dsh, profile: { ...manifest.dsh?.profile, bundles } }
  await writeManifest(profile.dir, manifest)

  const version = await installedVersion(profile.dir)
  if (version === undefined) fail('the package is not in the profile node_modules after install; nothing was enabled')
  say(`deepseek-rtl: enabled ${PACKAGE_NAME}@${version}`)
  say('deepseek-rtl: quit DeepSeek Harness and open it again; then use the button beside More actions, or Alt+R.')
}

/**
 * Remove the bundle from the selection and from the profile dependencies.
 * @param {ReturnType<typeof parseArgs>} options - parsed options.
 * @returns {Promise<void>} resolves on success.
 */
async function revert(options) {
  const profile = resolveProfile(options)
  await requireProfile(profile)
  const manifest = await readManifest(profile.dir)
  const selection = manifest.dsh?.profile?.bundles
  if (Array.isArray(selection) && selection.includes(PACKAGE_NAME)) {
    manifest.dsh = {
      ...manifest.dsh,
      profile: { ...manifest.dsh?.profile, bundles: selection.filter(entry => entry !== PACKAGE_NAME) },
    }
    await writeManifest(profile.dir, manifest)
    say(`deepseek-rtl: ${PACKAGE_NAME} removed from dsh.profile.bundles`)
  }
  const dependency = manifest.dependencies?.[PACKAGE_NAME]
  if (dependency !== undefined || existsSync(join(profile.dir, 'node_modules', PACKAGE_NAME))) {
    const code = runPnpm(findPnpm(), ['remove', PACKAGE_NAME], profile.dir)
    if (code !== 0) fail(`pnpm remove exited with ${code}`)
    say('deepseek-rtl: package removed from the profile')
  } else {
    say('deepseek-rtl: the package was not installed in this profile')
  }
  say('deepseek-rtl: restart DeepSeek Harness to finish removing it.')
}

/**
 * Report the profile's state.
 * @param {ReturnType<typeof parseArgs>} options - parsed options.
 * @returns {Promise<void>} resolves after printing.
 */
async function status(options) {
  const profile = resolveProfile(options)
  say(`deepseek-rtl: home ${profile.home}`)
  say(`deepseek-rtl: profile ${profile.name} (${profile.dir})`)
  if (!existsSync(join(profile.dir, 'package.json'))) {
    say('deepseek-rtl: profile is not initialized')
    return
  }
  const manifest = await readManifest(profile.dir)
  const selection = manifest.dsh?.profile?.bundles
  const selected = Array.isArray(selection) && selection.includes(PACKAGE_NAME)
  const dependency = manifest.dependencies?.[PACKAGE_NAME]
  const version = await installedVersion(profile.dir)
  say(`  selected in dsh.profile.bundles: ${selected ? 'yes' : 'no'}`)
  say(`  profile dependency: ${dependency ?? 'none'}`)
  say(`  installed version: ${version ?? 'not installed'}`)
  if (selected && version !== undefined) say('deepseek-rtl: active (restart the app if it was just installed)')
}

const options = parseArgs(process.argv.slice(2))
if (options.help) {
  process.stdout.write(HELP.trimStart())
} else if (options.version) {
  say(self.version)
} else if (options.status) {
  await status(options)
} else if (options.revert) {
  await revert(options)
} else {
  await install(options)
}
