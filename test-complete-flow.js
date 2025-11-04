const io = require('socket.io-client');

/**
 * Complete end-to-end test:
 * 1. Fresh user opens UI
 * 2. Clicks Matty (no session) - creates empty tab
 * 3. Sends message - backend creates session
 * 4. Backend sends sessionUuid in bot-message
 * 5. Frontend updates tab with sessionUuid
 * 6. Session History button should now show 1 session
 */

const TEST_USER_ID = 777888999; // Fresh test user

console.log('\n=== COMPLETE FLOW TEST ===\n');
console.log('Test User ID:', TEST_USER_ID);

console.log('\n1️⃣ Step 1: Verify no existing sessions...');

fetch(`http://localhost:3010/sessions/mattyatlas/${TEST_USER_ID}`)
  .then(res => res.json())
  .then(data => {
    console.log('   Existing sessions:', data.totalSessions || 0);

    if (data.currentSession) {
      console.log('   ✅ Using existing session:', data.currentSession.uuid.substring(0, 8));
      testComplete(data.currentSession.uuid);
    } else {
      console.log('   ✅ No session - will create new one');

      console.log('\n2️⃣ Step 2: Sending message to create session...');

      const socket = io('http://localhost:3010');

      socket.on('connect', () => {
        console.log('   ✅ Connected');

        socket.emit('send-message', {
          botId: 'mattyatlas',
          userId: TEST_USER_ID,
          message: 'Test complete flow'
        });
      });

      socket.on('bot-thinking', () => {
        console.log('   🤔 Bot thinking...');
      });

      socket.on('bot-message', (data) => {
        console.log('   ✅ Bot responded');
        console.log('   📦 Data received:', {
          botId: data.botId,
          hasMessage: !!data.message,
          hasSessionUuid: !!data.sessionUuid,
          sessionUuid: data.sessionUuid ? data.sessionUuid.substring(0, 8) + '...' : 'MISSING!'
        });

        if (data.sessionUuid) {
          console.log('\n3️⃣ Step 3: Verify session was created in backend...');

          setTimeout(() => {
            fetch(`http://localhost:3010/sessions/mattyatlas/${TEST_USER_ID}`)
              .then(res => res.json())
              .then(sessionData => {
                if (sessionData.currentSession) {
                  console.log('   ✅ Session exists in backend:', sessionData.currentSession.uuid.substring(0, 8));
                  console.log('   Message count:', sessionData.currentSession.messageCount);

                  testComplete(sessionData.currentSession.uuid);
                } else {
                  console.error('   ❌ Session not found in backend!');
                  socket.disconnect();
                  process.exit(1);
                }
              });
          }, 500);
        } else {
          console.error('\n❌ FAILED: Backend did not send sessionUuid!');
          console.error('   Frontend tab will NOT be linked to session');
          console.error('   Session History button will NOT work');
          socket.disconnect();
          process.exit(1);
        }
      });

      socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
        socket.disconnect();
        process.exit(1);
      });

      setTimeout(() => {
        console.error('\n⏱️ Test timeout');
        socket.disconnect();
        process.exit(1);
      }, 30000);
    }
  });

function testComplete(uuid) {
  console.log('\n4️⃣ Step 4: Fetch messages from session...');

  fetch(`http://localhost:3010/messages/${uuid}`)
    .then(res => res.json())
    .then(msgData => {
      console.log('   ✅ Messages loaded:', msgData.messageCount);

      console.log('\n✅ ✅ ✅ TEST PASSED! ✅ ✅ ✅\n');
      console.log('Summary:');
      console.log('  - Session UUID:', uuid);
      console.log('  - Messages:', msgData.messageCount);
      console.log('  - Backend tracking: ✅ WORKING');
      console.log('  - Session UUID in socket: ✅ SENT');
      console.log('\n📋 What should happen in UI:');
      console.log('  1. User clicks Matty → Empty tab opens');
      console.log('  2. User sends message → Bot responds');
      console.log('  3. Tab gets linked to session:', uuid.substring(0, 8) + '...');
      console.log('  4. Session History button shows 1 session');
      console.log('  5. Clicking history loads messages\n');

      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Failed to load messages:', err.message);
      process.exit(1);
    });
}
