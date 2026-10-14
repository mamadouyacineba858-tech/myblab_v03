import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * MB-AUDIT-AUTO-004 — exécuteur strictement local au serveur Vite DEV.
 * Aucune commande arbitraire, aucun paramètre shell et aucun endpoint en build.
 */
export function myblabDevAudit() {
  const root = resolve(import.meta.dirname, '..')
  let state = { id: null, phase: 'IDLE', startedAt: null, finishedAt: null, steps: [], verdict: 'NOT_RUN' }
  let busy = false
  const plan = [
    { id: 'arduino', label: 'Arduino firmware et UI', script: 'node_modules/vitest/vitest.mjs',
      args: ['run', 'src/arduino/firmware/__tests__/firmwareCompiler.test.js',
        'src/arduino/firmware/__tests__/firmwareExecutor.test.js',
        'src/arduino/firmware/__tests__/firmwareCircuitQualification.integration.test.js',
        'src/arduino/ui/__tests__/ArduinoCodeWorkspace.test.jsx', '--maxWorkers=1', '--minWorkers=1'] },
    { id: 'canvas', label: 'Interactions Canvas et boutons', script: 'node_modules/vitest/vitest.mjs',
      args: ['run', 'src/canvas/__tests__/ButtonInteraction008.integration.test.jsx', '--maxWorkers=1', '--minWorkers=1'] },
    { id: 'build', label: 'Compilation TypeScript et Vite', script: 'node_modules/typescript/bin/tsc',
      args: ['-b'], next: { script: 'node_modules/vite/bin/vite.js', args: ['build'] } },
  ]
  function allowed(req) {
    const remote = req.socket.remoteAddress || ''
    const local = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
    const host = String(req.headers.host || '').split(':')[0].toLowerCase()
    const origin = req.headers.origin
    return local && ['127.0.0.1', 'localhost', '[::1]'].includes(host) &&
      (!origin || (() => { try { return new URL(origin).host === req.headers.host } catch { return false } })())
  }
  function send(res, code, body) {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(JSON.stringify(body))
  }
  function execute(step, script = step.script, args = step.args) {
    return new Promise(done => {
      let finished = false
      let output = ''
      let truncated = false
      const append = chunk => {
        const value = String(chunk)
        if (output.length + value.length > 20000) {
          output += value.slice(0, Math.max(0, 20000 - output.length))
          truncated = true
        } else output += value
      }
      const child = spawn(process.execPath, [resolve(root, script), ...args], {
        cwd: root, shell: false, windowsHide: true, env: { ...process.env, CI: '1', NO_COLOR: '1' },
      })
      const timeout = setTimeout(() => child.kill(), 180000)
      child.stdout.on('data', append)
      child.stderr.on('data', append)
      const finish = (code, reason) => {
        if (finished) return
        finished = true
        clearTimeout(timeout)
        done({ status: code === 0 ? 'PASS' : 'FAIL', exitCode: code, reason, output, truncated })
      }
      child.on('error', error => finish(null, error.message))
      child.on('close', (code, signal) => finish(code, signal ? `Signal: ${signal}` : null))
    })
  }
  async function run() {
    busy = true
    state = { id: randomUUID(), phase: 'RUNNING', startedAt: new Date().toISOString(), finishedAt: null,
      steps: plan.map(s => ({ id: s.id, label: s.label, status: 'PENDING' })), verdict: 'RUNNING' }
    try {
      for (let i = 0; i < plan.length; i++) {
        const step = plan[i]
        state.steps[i].status = 'RUNNING'
        let result = await execute(step)
        if (result.status === 'PASS' && step.next) {
          const next = await execute(step, step.next.script, step.next.args)
          result = { ...next, output: result.output + '\n--- Vite build ---\n' + next.output,
            truncated: result.truncated || next.truncated }
        }
        state.steps[i] = { id: step.id, label: step.label, ...result }
      }
      state.verdict = state.steps.every(s => s.status === 'PASS') ? 'AUTOMATED_CHECKS_PASS' : 'AUTOMATED_CHECKS_FAIL'
    } catch (error) {
      state.verdict = 'STOP'
      state.error = String(error)
    } finally {
      state.phase = 'DONE'
      state.finishedAt = new Date().toISOString()
      busy = false
    }
  }
  return {
    name: 'myblab-dev-audit-local',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__myblab_dev_audit', (req, res) => {
        if (!allowed(req)) return send(res, 403, { error: 'Local access only' })
        if (req.url === '/status' && req.method === 'GET') return send(res, 200, state)
        if (req.url === '/run' && req.method === 'POST') {
          if (busy) return send(res, 409, { error: 'Audit already running', state })
          void run()
          return send(res, 202, { accepted: true })
        }
        return send(res, 404, { error: 'Not found' })
      })
    },
  }
}
