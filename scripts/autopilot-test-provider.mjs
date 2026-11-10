// Deterministic model substitute only. Session creation, tools, scopes, checkpoints,
// verification commands and persistence remain native DSH/WhaleMaid code.
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { chmod } from 'node:fs/promises'

const { LlmAdapter } = await import(
  pathToFileURL(join(process.env.DSH_TEST_RUNTIME, 'node_modules/@deepseek-ai/dsh-llm/lib/index.js'))
)
export const inject = ['llm', 'appReady', 'appExit', 'connection', 'webServer', 'credentials']
export async function apply(ctx) {
  const live = process.env.DSH_TEST_LIVE === '1'
  if (live) {
    const key = execFileSync(process.env.DSH_TEST_KEY_HELPER, ['PI_DEEPSEEK_API_KEY'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 10000,
    }).trim()
    if (!key) throw new Error('Live acceptance credential unavailable')
    await ctx.credentials.set('DEEPSEEK_API_KEY', key)
    await chmod(join(process.env.DSH_HOME, '.credentials.yaml'), 0o600)
    let calls = 0
    ctx.on('llm/stream', (_options, next) => {
      if (calls >= 8) throw new Error('Live acceptance model-call budget exhausted')
      process.send?.({ type: 'model-call', count: ++calls })
      return next()
    })
  }
  class Rules extends LlmAdapter {
    async *stream(options) {
      options.signal?.throwIfAborted()
      // Native DSH appends runtime/skills/time context as additional user-role
      // messages. Select the task input itself, keeping that full context intact.
      const text =
        options.messages
          .filter((message) => message.role === 'user')
          .flatMap((message) =>
            message.content.filter((part) => part.type === 'text').map((part) => part.text),
          )
          .findLast(
            (text) => text.startsWith('WhaleDot:') || text.startsWith('Propose the next bounded batch'),
          ) ?? ''
      let block
      if (text.startsWith('Propose the next bounded batch')) {
        block = {
          type: 'text',
          text: '```json\n{"status":"complete","reason":"Independent acceptance passed"}\n```',
        }
      } else if (text.startsWith('WhaleDot:')) {
        const data = JSON.parse(text.split('AUTHORIZED DATA=')[1])
        const answered = options.messages.some((message) => message.role === 'tool')
        if (!answered && data.task.kind === 'edit') {
          block = {
            type: 'tool-call',
            id: 'bounded_write',
            name: 'write',
            arguments: JSON.stringify({
              file_path: join(data.scope.cwd[0], 'result.txt'),
              content: 'authorized result\n',
            }),
          }
        } else {
          block = {
            type: 'text',
            text: 'Summary\nBounded task finished.\nChanges\nAuthorized result only.\nChecks\nIndependent verification is owned by WhaleMaid.\nBlockers\nNone.',
          }
        }
      } else {
        throw new Error('Unexpected model request in bounded autopilot acceptance')
      }
      yield { type: 'block-start', index: 0, blockType: block.type }
      if (block.type === 'text') yield { type: 'text-delta', index: 0, text: block.text }
      else
        yield {
          type: 'tool-call-delta',
          index: 0,
          id: block.id,
          name: block.name,
          argumentsDelta: block.arguments,
        }
      yield { type: 'block-end', index: 0, block }
      yield { type: 'finish', reason: { kind: block.type === 'tool-call' ? 'tool-calls' : 'stop' } }
    }
  }
  if (!live) ctx.llm.registerAdapter(['whale-test-rules'], new Rules())
  ctx.effect(() =>
    ctx.appReady.onReady(() =>
      process.send?.({
        type: 'ready',
        url: ctx.connection.authenticatedUrl(`http://127.0.0.1:${ctx.webServer.port}/`),
      }),
    ),
  )
  ctx.effect(() => {
    const shutdown = async (message) => {
      if (message?.type === 'shutdown') {
        if (live) await ctx.credentials.unset('DEEPSEEK_API_KEY')
        ctx.appExit(0)
      }
    }
    process.on('message', shutdown)
    return () => process.off('message', shutdown)
  })
}
