// E2E test: daily quota limit
const BASE = 'http://localhost:3000'
const TEST_USER = `test-quota-${Date.now()}`

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json() }
}

async function main() {
  // 1. Create session
  console.log('--- Creating test session ---')
  const { data: sessionData, status: sessionStatus } = await post('/api/sessions', {
    userId: TEST_USER,
    module: 'english',
    theme: 'test-quota',
  })
  console.log(`  status=${sessionStatus}, id=${sessionData.id || sessionData.session?.id || 'N/A'}`)
  const sessionId = sessionData.id || sessionData.session?.id || sessionData.sessionId

  if (!sessionId) {
    console.log('FAILED to create session:', JSON.stringify(sessionData).slice(0, 200))
    process.exit(1)
  }

  // 2. Send messages until blocked
  console.log('\n--- Quota test: sending messages ---')
  let blocked = false
  let blockedAt = 0

  for (let i = 1; i <= 25; i++) {
    const { status, data } = await post('/api/chat', {
      sessionId,
      userId: TEST_USER,
      userMessage: 'hello',
      roundNumber: i,
    })

    if (data?.error === 'daily_quota_exceeded') {
      console.log(`  #${i}: ❌ BLOCKED (429) — "${data.message}" limit=${data.limit}`)
      blocked = true
      blockedAt = i
      break
    } else if (status === 429) {
      console.log(`  #${i}: ❌ 429 — ${JSON.stringify(data).slice(0, 150)}`)
      blocked = true
      blockedAt = i
      break
    } else if (data?.success) {
      console.log(`  #${i}: ✅ OK`)
    } else {
      console.log(`  #${i}: ⚠️ OTHER (status=${status}) — ${JSON.stringify(data).slice(0, 150)}`)
    }
  }

  // 3. Summary
  console.log('\n--- Summary ---')
  if (blocked) {
    console.log(`✅ Quota enforced: blocked at message #${blockedAt} (free limit = 20)`)
  } else {
    console.log('❌ Quota NOT enforced — all 25 messages went through')
  }
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1) })
