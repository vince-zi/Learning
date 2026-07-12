// ============================================================
// Supabase Migration Checker — 006_user_passcode
// Run: node scripts/run-migration-006.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load from .env.local
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) env[match[1]] = match[2].trim()
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase env vars in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run() {
  console.log('Checking if users.passcode column exists in database...')

  // Try to query passcode column from users
  const { data, error } = await supabase
    .from('users')
    .select('id, passcode')
    .limit(1)

  if (error) {
    if (error.message.includes('column "passcode" does not exist') || error.message.includes('passcode')) {
      console.log('\n❌ [passcode] column is MISSING in the users table.')
      console.log('This migration requires DDL execution.')
      console.log('')
      console.log('=== PLEASE RUN THIS SQL IN YOUR SUPABASE DASHBOARD SQL EDITOR ===')
      console.log('Go to: https://supabase.com/dashboard/project/mcvuqsqgtuboknyhjqlp/sql/new')
      console.log('Paste the following SQL statement and click RUN:')
      console.log('------------------------------------------------------------')
      console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS passcode TEXT;')
      console.log('------------------------------------------------------------')
      console.log('')
    } else {
      console.error('Unexpected error checking passcode column:', error)
    }
  } else {
    console.log('\n✅ [passcode] column ALREADY EXISTS in the users table!')
  }
}

run().catch(console.error)
