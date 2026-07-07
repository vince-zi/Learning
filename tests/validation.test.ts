/**
 * Learniny System Core Flow Validation Test
 * 
 * This test automates the complete validation flow comparing:
 * 1. Practice & Diagnosis Mode (DeepSeek LLM)
 * 2. Review & Elimination Mode (100% Local Offline Engine)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test data
const TEST_USER_ID = `test_user_flow_val_${Date.now()}`;
let practiceSessionId: string;
let reviewSessionId: string;
let errorRecordId: string;

// Assertion counters
let passedAsserts = 0;
let failedAsserts = 0;
const assertions: Array<{ name: string; passed: boolean; expected: any; actual: any }> = [];

// Helper function to assert and track
function assert(name: string, condition: boolean, expected: any, actual: any) {
  const passed = condition;
  assertions.push({ name, passed, expected, actual });
  if (passed) {
    passedAsserts++;
  } else {
    failedAsserts++;
  }
  expect(condition).toBe(true);
}

// Helper function to make API requests
async function apiRequest(endpoint: string, method: string = 'POST', body?: any) {
  const url = `${BASE_URL}${endpoint}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  return await response.json();
}

describe('Learniny System Core Flow Validation', () => {
  beforeAll(async () => {
    console.log('\n🚀 Starting Core Flow Validation Test');
    console.log(`Test User ID: ${TEST_USER_ID}`);
  });

  afterAll(() => {
    console.log('\n📊 Test Summary');
    console.log(`✅ Passed: ${passedAsserts}`);
    console.log(`❌ Failed: ${failedAsserts}`);
    console.log(`📈 Total: ${passedAsserts + failedAsserts}`);
    console.log(`📊 Pass Rate: ${Math.round((passedAsserts / (passedAsserts + failedAsserts)) * 100)}%`);
  });

  describe('1. Practice & Diagnosis Mode (Online LLM)', () => {
    it('should setup user in database', async () => {
      console.log('\n👤 Setting up user...');
      
      // Upsert user
      const { error } = await supabase
        .from('users')
        .upsert({ id: TEST_USER_ID, created_at: new Date().toISOString() });
      
      assert('User Setup', !error, true, !error);
    });

    it('should setup CEFR profile', async () => {
      console.log('📝 Setting up CEFR profile...');
      
      const { error } = await supabase
        .from('english_learner_profiles')
        .upsert({
          user_id: TEST_USER_ID,
          cefr_level: 'B1',
          updated_at: new Date().toISOString()
        });
      
      assert('CEFR Profile Setup', !error, true, !error);
    });

    it('should create practice session', async () => {
      console.log('🎯 Creating practice session...');
      
      const response = await apiRequest('/api/sessions', 'POST', {
        userId: TEST_USER_ID,
        module: 'english',
        theme: 'Free Conversation'
      });
      
      assert('Create Session', response.success === true, true, response.success);
      
      if (response.session) {
        practiceSessionId = response.session.id;
        console.log(`Session ID: ${practiceSessionId}`);
      }
    });

    it('should initialize dialog', async () => {
      console.log('💬 Initializing dialog...');
      
      const response = await apiRequest('/api/chat', 'POST', {
        sessionId: practiceSessionId,
        userId: TEST_USER_ID,
        userMessage: '[INIT_FREE_CONVERSATION]',
        module: 'english',
        roundNumber: 1
      });
      
      const hasMessage = response.message?.content && response.message.content.length > 0;
      assert('Init Dialog Success', hasMessage, true, hasMessage);
      
      if (hasMessage) {
        console.log(`Assistant: ${response.message.content.substring(0, 100)}...`);
      }
    });

    it('should detect grammar error', async () => {
      console.log('🔍 Submitting grammar error...');
      
      const response = await apiRequest('/api/chat', 'POST', {
        sessionId: practiceSessionId,
        userId: TEST_USER_ID,
        userMessage: 'I very like playing basketball.',
        module: 'english',
        roundNumber: 2
      });
      
      const hasError = response.detectedError !== null && response.detectedError !== undefined;
      assert('Error Detected', hasError, true, hasError);
      
      if (hasError) {
        console.log(`Error Type: ${response.detectedError.errorType}`);
        console.log(`Corrected: ${response.detectedError.correctedText}`);
      }
    });

    it('should insert error record in database', async () => {
      console.log('💾 Checking database error record...');
      
      // Wait a bit for the record to be inserted
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data, error } = await supabase
        .from('error_records')
        .select('*')
        .eq('user_id', TEST_USER_ID)
        .eq('original_text', 'I very like playing basketball.');
      
      const hasRecord = !error && data && data.length > 0;
      assert('DB Record Inserted', hasRecord, true, hasRecord);
      
      if (hasRecord && data![0]) {
        errorRecordId = data![0].id;
        console.log(`Error Record ID: ${errorRecordId}`);
      }
    });

    it('should filter greeting noise', async () => {
      console.log('🔇 Testing greeting noise filter...');
      
      const { data: beforeData } = await supabase
        .from('error_records')
        .select('*')
        .eq('user_id', TEST_USER_ID);
      
      const beforeCount = beforeData?.length || 0;
      
      // Submit greeting
      await apiRequest('/api/chat', 'POST', {
        sessionId: practiceSessionId,
        userId: TEST_USER_ID,
        userMessage: 'Hi',
        module: 'english',
        roundNumber: 3
      });
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: afterData } = await supabase
        .from('error_records')
        .select('*')
        .eq('user_id', TEST_USER_ID);
      
      const afterCount = afterData?.length || 0;
      
      assert('Greeting Filtered', beforeCount === afterCount, beforeCount, afterCount);
    });

    it('should create discovery card', async () => {
      console.log('🌟 Creating discovery card...');
      
      const response = await apiRequest('/api/discoveries', 'POST', {
        sessionId: practiceSessionId,
        userId: TEST_USER_ID,
        knowledgeNodeId: 'likes-dislikes',
        module: 'english'
      });
      
      const hasDiscovery = !!(response.success && response.discovery);
      assert('Discovery Card Created', hasDiscovery, true, hasDiscovery);
      
      if (hasDiscovery) {
        console.log(`Discovery: ${response.discovery.title}`);
      }
    });

    it('should archive session', async () => {
      console.log('📦 Archiving session...');
      
      const response = await apiRequest('/api/sessions', 'PATCH', {
        sessionId: practiceSessionId
      });
      
      assert('Session Archived', response.success === true, true, response.success);
    });
  });

  describe('2. Review & Elimination Mode (100% Local Offline)', () => {
    it('should create review session', async () => {
      console.log('\n🔄 Creating review session...');
      
      const response = await apiRequest('/api/sessions', 'POST', {
        userId: TEST_USER_ID,
        module: 'english',
        theme: `温习: ${errorRecordId}`
      });
      
      assert('Create Review Session', response.success === true, true, response.success);
      
      if (response.session) {
        reviewSessionId = response.session.id;
        console.log(`Review Session ID: ${reviewSessionId}`);
      }
    });

    it('should initialize review chat with instant response', async () => {
      console.log('⚡ Initializing review chat...');
      
      const startTime = Date.now();
      
      const response = await apiRequest('/api/chat', 'POST', {
        sessionId: reviewSessionId,
        userId: TEST_USER_ID,
        userMessage: 'I am ready to review.',
        isEnglish: true
      });
      
      const latency = Date.now() - startTime;
      
      console.log(`Latency: ${latency}ms`);
      
      // Note: The expected latency should be < 1200ms for local mode with remote DB
      const isInstant = latency < 1200;
      
      if (!isInstant) {
        console.warn(`⚠️ Warning: Expected < 1200ms, got ${latency}ms`);
      }
      
      const displaysError = response.message?.content?.includes('I very like playing basketball');
      assert('Displays Wrong Sentence', displaysError, true, displaysError);
      
      assert('Instant Local Welcome', isInstant, true, isInstant);
    });

    it('should reject bad rewrite', async () => {
      console.log('❌ Testing bad rewrite rejection...');
      
      const response = await apiRequest('/api/chat', 'POST', {
        sessionId: reviewSessionId,
        userId: TEST_USER_ID,
        userMessage: 'I basketball like very.',
        isEnglish: true,
        reviewStage: 0
      });
      
      const isResolved = response.isResolved === true;
      assert('Rewrite Rejected', !isResolved, false, isResolved);
    });

    it('should accept correct rewrite', async () => {
      console.log('✅ Testing correct rewrite acceptance...');
      
      const response = await apiRequest('/api/chat', 'POST', {
        sessionId: reviewSessionId,
        userId: TEST_USER_ID,
        userMessage: 'I really like playing basketball.',
        isEnglish: true,
        reviewStage: 0
      });
      
      const isResolved = response.isResolved === true;
      assert('Rewrite Accepted', isResolved, true, isResolved);
      
      if (isResolved) {
        console.log(`✨ Error resolved at stage: ${response.resolvedStage}`);
      }
      
      assert('Resolved Stage is 2', response.resolvedStage === 2, 2, response.resolvedStage);
    });

    it('should mark error as noted in database', async () => {
      console.log('✔️ Checking database update...');
      
      // Wait a bit for the database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data, error } = await supabase
        .from('error_records')
        .select('*')
        .eq('id', errorRecordId)
        .single();
      
      const isNoted = !error && data && data.noted_by_user === true;
      assert('DB noted_by_user is True', isNoted, true, isNoted);
    });

    it('should not create secondary pollution', async () => {
      console.log('🛡️ Checking for secondary pollution...');
      
      const { data, error } = await supabase
        .from('error_records')
        .select('*')
        .eq('user_id', TEST_USER_ID);
      
      const recordCount = data?.length || 0;
      
      assert('No Secondary Pollution', recordCount === 1, 1, recordCount);
      
      if (recordCount > 1) {
        console.error('⚠️ Secondary pollution detected!');
        console.error('Records:', data);
      }
    });
  });
});
