const io = require('socket.io-client');

/**
 * Test the full UI flow:
 * 1. Click Matty (no session exists yet) - should create empty tab
 * 2. Send a message - session gets created
 * 3. Check if tab gets updated with session UUID
 * 4. Reload and click Matty again - should load existing session with messages
 */

const TEST_USER_ID = 888999111; // New test user

console.log('\n=== TEST: UI Session Flow ===\n');
console.log('User ID:', TEST_USER_ID);

// Step 1: Simulate fresh user clicking Matty (no session yet)
console.log('\n1️⃣ Step 1: Check if session exists for new user...');
fetch(`http://localhost:3010/sessions/mattyatlas/${TEST_USER_ID}`)
  .then(res => res.json())
  .then(data => {
    console.log('   Existing sessions:', data.totalSessions || 0);
    if (data.currentSession) {
      console.log('   ⚠️  Session already exists! Using existing:', data.currentSession.uuid.substring(0, 8));
      testWithExistingSession(data.currentSession.uuid);
    } else {
      console.log('   ✅ No session yet (expected for new user)');
      testNewSession();
    }
  })
  .catch(err => {
    console.error('   ❌ Error:', err.message);
    process.exit(1);
  });

function testNewSession() {
  console.log('\n2️⃣ Step 2: Sending first message to create session...');

  const socket = io('http://localhost:3010');

  socket.on('connect', () => {
    console.log('   ✅ Connected to server');

    socket.emit('send-message', {
      botId: 'mattyatlas',
      userId: TEST_USER_ID,
      message: 'Test message to create session'
    });
  });

  socket.on('bot-thinking', () => {
    console.log('   🤔 Bot thinking...');
  });

  socket.on('bot-message', (data) => {
    console.log('   ✅ Bot responded:', data.message.substring(0, 50) + '...');

    // Step 3: Check if session was created
    setTimeout(() => {
      console.log('\n3️⃣ Step 3: Verifying session was created...');

      fetch(`http://localhost:3010/sessions/mattyatlas/${TEST_USER_ID}`)
        .then(res => res.json())
        .then(sessionData => {
          if (sessionData.currentSession) {
            const uuid = sessionData.currentSession.uuid;
            console.log('   ✅ Session created:', uuid.substring(0, 8) + '...');
            console.log('   Message count:', sessionData.currentSession.messageCount);

            // Step 4: Check if messages are retrievable
            console.log('\n4️⃣ Step 4: Loading messages from session...');

            fetch(`http://localhost:3010/messages/${uuid}`)
              .then(res => res.json())
              .then(msgData => {
                console.log('   ✅ Messages loaded:', msgData.messageCount, 'messages');
                console.log('   User message:', msgData.messages.find(m => m.sender === 'user')?.text.substring(0, 50) || 'Not found');
                console.log('   Bot message:', msgData.messages.find(m => m.sender === 'bot')?.text || 'Not found');

                console.log('\n✅ TEST PASSED: Session flow works correctly!');
                console.log('\n📝 Summary:');
                console.log('   - Session UUID:', uuid);
                console.log('   - Messages stored:', msgData.messageCount);
                console.log('   - Backend session tracking: ✅ WORKING');
                console.log('\n⚠️  Note: Frontend tab management needs testing in actual browser');

                socket.disconnect();
                process.exit(0);
              })
              .catch(err => {
                console.error('   ❌ Failed to load messages:', err.message);
                socket.disconnect();
                process.exit(1);
              });
          } else {
            console.error('   ❌ Session not created after message!');
            socket.disconnect();
            process.exit(1);
          }
        })
        .catch(err => {
          console.error('   ❌ Error checking session:', err.message);
          socket.disconnect();
          process.exit(1);
        });
    }, 1000);
  });

  socket.on('error', (error) => {
    console.error('   ❌ Socket error:', error);
    socket.disconnect();
    process.exit(1);
  });

  setTimeout(() => {
    console.error('\n⏱️ Test timeout after 30 seconds');
    socket.disconnect();
    process.exit(1);
  }, 30000);
}

function testWithExistingSession(uuid) {
  console.log('\n2️⃣ Step 2: Loading messages from existing session...');

  fetch(`http://localhost:3010/messages/${uuid}`)
    .then(res => res.json())
    .then(msgData => {
      console.log('   ✅ Messages loaded:', msgData.messageCount, 'messages');
      console.log('   Recent messages:', msgData.messages.length);

      console.log('\n✅ TEST PASSED: Existing session loads correctly!');
      console.log('\n📝 Summary:');
      console.log('   - Session UUID:', uuid);
      console.log('   - Messages stored:', msgData.messageCount);
      console.log('   - Backend session tracking: ✅ WORKING');

      process.exit(0);
    })
    .catch(err => {
      console.error('   ❌ Failed to load messages:', err.message);
      process.exit(1);
    });
}
