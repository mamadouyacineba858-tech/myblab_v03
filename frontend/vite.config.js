import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { myblabDevAudit } from './dev-audit/myblabDevAudit.js'

export default defineConfig({
  plugins: [react(), myblabDevAudit()],
})
