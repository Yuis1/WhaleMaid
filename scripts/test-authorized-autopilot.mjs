import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, mkdir, readFile, writeFile, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { setTimeout, clearTimeout } from 'node:timers'
import process from 'node:process'

// Optional paths select a built candidate and an ephemeral-profile parent. Never
// use an existing operational DSH_HOME or import a user's profile configuration.
const source = resolve(process.env.DSH_TEST_SOURCE ?? join(dirname(fileURLToPath(import.meta.url)), '..'))
const live = process.argv.includes('--live')
if (live)
  assert.ok(
    process.env.DSH_TEST_KEY_HELPER,
    '--live requires an explicitly selected trusted DSH_TEST_KEY_HELPER',
  )
const runtime = resolve(process.env.DSH_TEST_RUNTIME ?? '.dsh-dev/complete-runtime')
const cli = join(runtime, 'node_modules/@deepseek-ai/dsh/lib/bin.js')
const base = await mkdtemp(join(resolve(process.env.DSH_TEST_ROOT ?? tmpdir()), 'whale-authorized-'))
const home = join(base, 'home'),
  profile = join(home, 'profiles', 'acceptance'),
  project = join(base, 'project')
const { DEFAULT_LIMITS, DEFAULT_PROTECTED_NAMES } = await import(
  pathToFileURL(join(source, 'packages/core/lib/index.js'))
)
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    /^(PATH|HOME|TMPDIR|TEMP|TMP|SystemRoot|ComSpec|LANG|LC_ALL)$/i.test(key),
  ),
)
Object.assign(env, { DSH_HOME: home, DSH_TEST_RUNTIME: runtime, DSH_TELEMETRY_DISABLED: '1', CI: 'true' })
if (live) Object.assign(env, { DSH_TEST_LIVE: '1', DSH_TEST_KEY_HELPER: process.env.DSH_TEST_KEY_HELPER })
let host,
  logs = '',
  deadline
let modelCalls = 0
const git = (...args) =>
  execFileSync(
    'git',
    ['-c', 'user.name=Whale Acceptance', '-c', 'user.email=whale-test@localhost', ...args],
    { cwd: project, encoding: 'utf8', timeout: 10000 },
  ).trim()
const shutdown = async () => {
  if (host?.exitCode !== null) return
  const exited = once(host, 'exit')
  if (host.connected) host.send({ type: 'shutdown' })
  const timer = setTimeout(() => {
    try {
      process.kill(-host.pid, 'SIGKILL')
    } catch {
      // The isolated host process group already exited.
    }
  }, 5000)
  await exited
  clearTimeout(timer)
}
const boot = async () => {
  // detached starts a separate session/process group, equivalent to setsid.
  host = spawn(
    process.execPath,
    [cli, '--profile', 'acceptance', '--no-open', '--host', '127.0.0.1', '--port', '0'],
    { cwd: project, env, detached: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
  )
  for (const stream of [host.stdout, host.stderr])
    stream.on('data', (chunk) => {
      logs = (logs + chunk).slice(-24000)
    })
  return new Promise((done, reject) => {
    const timer = setTimeout(() => reject(new Error('Native DSH startup timed out')), 30000)
    host.on('message', (message) => {
      if (message?.type === 'model-call') modelCalls = message.count
      if (message?.type === 'ready') {
        clearTimeout(timer)
        done(message.url)
      }
    })
    host.once('exit', (code) => {
      clearTimeout(timer)
      reject(new Error(`Native DSH exited ${code}`))
    })
  })
}
const ownerSession = async (url) => {
  const response = await globalThis.fetch(url, { redirect: 'manual' })
  const cookie = response.headers.get('set-cookie')?.split(';')[0]
  assert.ok(cookie, 'native Connection signed owner cookie')
  return { origin: new URL(url).origin, cookie }
}
const wait = async (read, predicate, label, timeout = 60000) => {
  const until = Date.now() + timeout
  let last
  while (Date.now() < until) {
    last = await read()
    if (predicate(last)) return last
    await delay(100)
  }
  throw new Error(`${label}: ${JSON.stringify(last)}`)
}
try {
  await mkdir(profile, { recursive: true })
  await mkdir(project)
  await writeFile(
    join(project, 'package.json'),
    JSON.stringify({ private: true, scripts: { test: 'node --test acceptance.test.cjs' } }),
  )
  await writeFile(
    join(project, 'acceptance.test.cjs'),
    "const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');test('authorized result',()=>assert.equal(fs.readFileSync('result.txt','utf8'),'authorized result\\n'));\n",
  )
  if (live) await writeFile(join(project, 'result.txt'), 'pending\n')
  git('init', '--quiet')
  git('add', '.')
  git('commit', '--quiet', '-m', 'Synthetic acceptance baseline')
  const original = git('rev-parse', 'HEAD')
  await writeFile(
    join(profile, 'package.json'),
    JSON.stringify({
      name: 'whale-bounded-acceptance',
      private: true,
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } },
    }),
  )
  await symlink(join(runtime, 'node_modules'), join(profile, 'node_modules'), 'dir')
  await writeFile(
    join(profile, 'cordis.patch.yml'),
    `- insert:\n    - id: whaledot\n      name: ${JSON.stringify(join(source, 'packages/host/lib/index.js'))}\n      config:\n        companion:\n          enabled: false\n        initiative:\n          enabled: false\n    - id: bounded-provider\n      name: ${JSON.stringify(join(source, 'scripts/autopilot-test-provider.mjs'))}\n- id: agent-default-model\n  config:\n    provider: ${live ? 'deepseek-official' : 'whale-test-rules'}\n    model: ${live ? 'deepseek-flash' : 'bounded-rules'}\n- id: session-title-llm\n  disabled: true\n- id: hmr\n  disabled: true\n${live ? '- id: llm-deepseek\n  config:\n    baseURL: https://api.deepseek.com/anthropic\n    thinking: disabled\n    maxTokens: 4096\n    retryPolicy:\n      mode: normal\n      maxRetries: 0\n' : ''}`,
  )
  deadline = setTimeout(
    () => {
      try {
        process.kill(-host.pid, 'SIGKILL')
      } catch {
        // The isolated host process group already exited.
      }
    },
    live ? 300000 : 150000,
  )
  let { origin, cookie } = await ownerSession(await boot())
  const call = async (method, payload = {}, authenticated = true) => {
    const reply = await globalThis.fetch(`${origin}/api/whaledot/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(authenticated ? { cookie } : {}) },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: 'acceptance',
        method: `whaledot/${method}`,
        payload,
      }),
    })
    if (!authenticated) return reply.status
    assert.equal(reply.status, 200, `${method} HTTP`)
    const body = await reply.json()
    assert.equal(body.result?.ok, true, `${method}: ${JSON.stringify(body.result)}`)
    return body.result.value
  }
  // The exact native POST path is the write readiness preflight.
  assert.equal(await call('set-paused', { paused: true, principal: { kind: 'owner' } }, false), 401)
  await call('set-paused', { paused: true })
  await wait(
    () => call('status'),
    (state) => state.services.tools && state.services.permissionPresets,
    'WhaleMaid service readiness',
  )
  const approved = await call('confirm-goal', {
    title: 'Bounded synthetic file',
    objective:
      'In the authorized worktree, make result.txt contain exactly "authorized result" followed by one newline. Read the existing file before changing it. Do not change any other file. WhaleMaid owns independent npm test verification; do not run tests yourself. Stop after this one change.',
    expectedOutcome: 'Independent test passes',
    acceptance: ['result.txt contains authorized result'],
    stopConditions: ['Stop after completion'],
    mode: 'autonomous',
    initialTasks: [
      {
        title: 'Summarize the explicit goal in one sentence without tool calls',
        kind: 'analyze',
        dependsOnIndex: [],
      },
      { title: 'Write authorized result', kind: 'edit', dependsOnIndex: [0] },
    ],
    projectRoot: project,
    allowedPaths: [project],
    protectedPaths: [join(project, '.git'), join(project, '.env*')],
    protectedNames: DEFAULT_PROTECTED_NAMES,
    allowedActions: [
      'read-file',
      'write-file',
      'run-command',
      'continue-goal',
      'pause-goal',
      'resume-goal',
      'open-workbench',
    ],
    permissionPreset: 'workspace-write',
    commandMode: 'confirmed',
    verifyCommands: ['npm test'],
    limits: { ...DEFAULT_LIMITS, maxRunMinutes: 1, maxRunsPerDay: 3, plannerCallsPerDay: 2 },
    limitsExpandedConfirmed: false,
    confirm: true,
  })
  const goalId = approved.goal.id
  await call('set-autopilot', { goalId, enabled: true, confirm: true, scopeHash: approved.scope.hash })
  const detail = () => call('goal-detail', { goalId })
  await wait(
    detail,
    (state) => state.autopilotEvents.some((event) => event.reason === 'global-paused'),
    'pause decision settled',
  )
  assert.equal((await detail()).runs.length, 0)
  await call('set-paused', { paused: false })
  const completed = await wait(
    detail,
    (state) => {
      assert.ok(
        !state.tasks.some((task) => ['FAILED', 'BLOCKED', 'UNKNOWN'].includes(task.state)),
        `Execution stopped: ${JSON.stringify(state.runs)}`,
      )
      return state.goal.status === 'completed'
    },
    'authorized task → checkpoint → independent verification → completed',
    live ? 240000 : 90000,
  )
  assert.ok(completed.tasks.every((task) => task.state === 'SUCCEEDED'))
  assert.equal(completed.runs.length, 2)
  assert.ok(
    completed.verifications.some((record) =>
      record.current.some((command) => command.status === 'passed' && command.exitCode === 0),
    ),
  )
  assert.equal(
    await readFile(join(completed.runs.at(-1).worktreePath, 'result.txt'), 'utf8'),
    'authorized result\n',
  )
  assert.equal(git('rev-parse', 'HEAD'), original)
  assert.equal(git('status', '--porcelain'), '')
  // Pause is durable. Restart must preserve final state and must not resubmit it.
  await call('set-paused', { paused: true })
  const trace = await call('export-trace', { goalId })
  assert.ok(trace.markdown.includes('verified-goal-complete'))
  if (!live) {
    await shutdown()
    ;({ origin, cookie } = await ownerSession(await boot()))
    const recovered = await wait(detail, (state) => state.globalPaused, 'durable pause after native restart')
    assert.equal(recovered.goal.status, 'completed')
    assert.equal(recovered.goal.autopilot.enabled, false)
    assert.equal(recovered.runs.length, completed.runs.length)
  }
  await writeFile(
    join(base, 'result.json'),
    JSON.stringify(
      {
        source,
        runtime,
        goalId,
        runs: completed.runs.length,
        state: completed.goal.status,
        paused: true,
        rulesModel: !live,
        realModel: live,
        modelCalls,
      },
      null,
      2,
    ),
  )
  console.log(
    live
      ? `PASS: native DeepSeek official bounded goal → real file tool → checkpoint → npm test → completed; ${modelCalls}/8 model calls, original workspace unchanged.`
      : 'PASS: native owner POST → approved scope → pause/resume → native DSH sessions/tools → Git checkpoint → real npm test → completed → durable pause/final state after restart; deterministic model substitute, zero external model calls.',
  )
} catch (error) {
  console.error(logs.replace(/([?&]token=)[^&\s]+/g, '$1[REDACTED]'))
  throw error
} finally {
  clearTimeout(deadline)
  await shutdown()
  // Remove temporary secrets even after a failed live run before moving state to Trash.
  if (live) await writeFile(join(home, '.credentials.yaml'), '{}\n', { mode: 0o600 })
  // Keep no runtime, profile or synthetic state in the development tree.
  execFileSync('trash-put', [base], { timeout: 10000 })
}
