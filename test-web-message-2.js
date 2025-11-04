const io = require('socket.io-client');

// Connect to the bot server
const socket = io('http://localhost:3010');

socket.on('connect', () => {
  console.log('✅ Connected to server');

  // Same user ID, second message
  const testUserId = 999888777;
  const testBotId = 'mattyatlas';
  const testMessage = 'This is my second message - just checking if message count increments';

  console.log('📤 Sending message:', { testUserId, testBotId, testMessage });

  socket.emit('send-message', {
    botId: testBotId,
    userId: testUserId,
    message: testMessage
  });
});

socket.on('bot-thinking', (data) => {
  console.log('🤔 Bot is thinking:', data);
});

socket.on('bot-message', (data) => {
  console.log('✅ Bot response received:', data.message.substring(0, 100) + '...');
  console.log('📊 Full response length:', data.message.length, 'chars');

  // Wait a bit then disconnect
  setTimeout(() => {
    socket.disconnect();
    process.exit(0);
  }, 1000);
});

socket.on('error', (error) => {
  console.error('❌ Error:', error);
  socket.disconnect();
  process.exit(1);
});

// Timeout after 30 seconds
setTimeout(() => {
  console.error('⏱️ Timeout - no response after 30 seconds');
  socket.disconnect();
  process.exit(1);
}, 30000);
