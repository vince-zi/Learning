// E2E test: cross-session memory — verify with follow-up message
const BASE = 'http://localhost:3001'
const UID = `ctx-${Date.now()}`

async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { s: r.status, d: await r.json() }
}

async function main() {
  // Session A
  const { d: s1 } = await post('/api/sessions', { userId: UID, module: 'english', theme: 'Free Conversation' })
  const a = s1.session?.id || s1.id
  await post('/api/chat', { sessionId: a, userId: UID, userMessage: 'Hi, I am a piano teacher and I have two cats.', roundNumber: 1 })
  await post('/api/chat', { sessionId: a, userId: UID, userMessage: 'I also love hiking every weekend.', roundNumber: 2 })
  console.log('Session A done, 2 personal messages sent')

  // Session B — 2 messages: opener + specific question
  const { d: s2 } = await post('/api/sessions', { userId: UID, module: 'english', theme: 'Free Conversation' })
  const b = s2.session?.id || s2.id

  // First message: opener
  const { d: r1 } = await post('/api/chat', { sessionId: b, userId: UID, userMessage: 'Hi!', roundNumber: 1 })
  console.log('AI (msg 1):', r1.message?.content?.slice(0, 120))

  // Second message: ask a question that requires recalling context
  const { d: r2 } = await post('/api/chat', { sessionId: b, userId: UID, userMessage: 'What do you know about me so far?', roundNumber: 2 })
  const ai2 = r2.message?.content || ''
  console.log('AI (msg 2):', ai2.slice(0, 300))

  const hit = /piano|teacher|cat|hiking/i.test(ai2)
  console.log(`\n${hit ? '✅ AI referenced personal info!' : '❌ AI did not reference'}`)
}

main().catch(e => console.error(e))
