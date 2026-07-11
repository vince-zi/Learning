// ============================================================
// Supabase Migration Runner — 005_usage_daily
// Run: node scripts/run-migration-005.mjs
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

const sql = readFileSync(join(__dirname, '..', 'supabase', 'migrations', '005_usage_daily.sql'), 'utf-8')

// Execute SQL statements one by one
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

async function run() {
  console.log('Running migration 005_usage_daily...')

  // Step 1: Add tier column via REST — try to update a user with tier field
  // Since we can't run DDL via REST, we'll check if the table exists first
  console.log('Checking existing tables...')

  // Try to query usage_daily — if it fails, the table doesn't exist
  const { error: checkErr } = await supabase
    .from('usage_daily')
    .select('id')
    .limit(1)

  if (checkErr) {
    console.log('usage_daily table does not exist yet.')
    console.log('This migration requires DDL execution.')
    console.log('')
    console.log('=== PLEASE RUN THIS SQL IN SUPABASE DASHBOARD SQL EDITOR ===')
    console.log('Go to: https://supabase.com/dashboard/project/mcvuqsqgtuboknyhjqlp/sql/new')
    console.log('Paste the contents of: supabase/migrations/005_usage_daily.sql')
    console.log('')
    console.log('Or run via Supabase CLI: supabase db push')
  } else {
    console.log('usage_daily table exists!')

    // Test the quota module
    const { data: testData } = await supabase
      .from('users')
      .select('tier')
      .limit(1)

    console.log('Users tier column:', testData ? 'exists' : 'missing')
  }
}

run().catch(console.error)
