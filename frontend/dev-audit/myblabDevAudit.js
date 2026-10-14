import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import process from 'node:process'

/**
 * MB-AUDIT-AUTO-004 — exécuteur strictement local au serveur Vite DEV.
 * Aucune commande arbitraire, aucun paramètre shell et aucun endpoint en build.
 */
export function myblabDevAudit() {
  const root = resolve(import.meta.dirname, '..')
  let state = { id: null, phase: 'IDLE', startedAt: null, finishedAt: null, steps: [], verdict: 'NOT_RUN' }
  let busy = false
  // Une seule passe Vitest : la suite simulateur est deja incluse dans la suite complete.
  // Chaque controle a son propre delai. Les preuves visuelles/physiques restent distinctes.
  const plan = [
    { id: 'full-suite', label: 'Toutes les suites Vitest du frontend (simulation, composants, Canvas, Arduino, persistance)', script: 'node_modules/vitest/vitest.mjs',
      args: ['--config', 'src/simulator/vitest.config.ts', '--run', '--maxWorkers=2', '--minWorkers=1'], timeoutMs: 900000 },
    { id: 'lint', label: 'Analyse statique ESLint de tout le frontend', script: 'node_modules/eslint/bin/eslint.js',
      args: ['.'], timeoutMs: 120000 },
    { id: 'build', label: 'Compilation TypeScript et Vite', script: 'node_modules/typescript/bin/tsc',
      args: ['-b'], timeoutMs: 120000, next: { script: 'node_modules/vite/bin/vite.js', args: ['build'] } },
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
      let omittedBytes = 0
      const append = chunk => {
        if (state.phase === "RUNNING") {
          const active = state.steps.find(item => item.status === "RUNNING")
          if (active) { active.lastOutputAt = new Date().toISOString(); active.outputBytes = (active.outputBytes || 0) + Buffer.byteLength(chunk) }
        }
        const value = String(chunk)
        if (output.length + value.length > 60000) {
          const kept = value.slice(0, Math.max(0, 60000 - output.length))
          output += kept
          truncated = true
          omittedBytes += Buffer.byteLength(value.slice(kept.length))
        } else output += value
      }
      const child = spawn(process.execPath, [resolve(root, script), ...args], {
        cwd: root, shell: false, windowsHide: true, env: { ...process.env, CI: '1', NO_COLOR: '1' },
      })
      let timedOut = false
      const timeoutMs = step.timeoutMs || 120000
      const timeout = setTimeout(() => {
        timedOut = true
        // Sur Windows, tuer seulement le parent node laisse parfois des workers Vitest orphelins.
        if (process.platform === 'win32' && child.pid) {
          const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' })
          killer.on('error', () => child.kill())
        } else child.kill()
      }, timeoutMs)
      child.stdout.on('data', append)
      child.stderr.on('data', append)
      const finish = (code, reason) => {
        if (finished) return
        finished = true
        clearTimeout(timeout)
        done({ status: code === 0 ? 'PASS' : 'FAIL', exitCode: code, reason: timedOut ? `TIMEOUT_${Math.round(timeoutMs / 1000)}_SECONDS` : reason, output, truncated, omittedBytes })
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
        state.steps[i].startedAt = new Date().toISOString()
        let result = await execute(step)
        if (result.status === 'PASS' && step.next) {
          const next = await execute(step, step.next.script, step.next.args)
          result = { ...next, output: result.output + '\n--- Vite build ---\n' + next.output,
            truncated: result.truncated || next.truncated }
        }
        state.steps[i] = { id: step.id, label: step.label, startedAt: state.steps[i].startedAt, finishedAt: new Date().toISOString(), ...result }
      }
      state.verdict = state.steps.every(s => s.status === 'PASS') ? 'AUTOMATED_CHECKS_PASS_VISUAL_AND_PHYSICAL_PENDING' : 'AUTOMATED_CHECKS_FAIL'
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
