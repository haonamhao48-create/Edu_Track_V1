const http = require('http');

function testHandshake(name, options) {
  return new Promise((resolve) => {
    console.log(`[TEST] Starting handshake for ${name}...`);
    const req = http.request(options);

    req.on('upgrade', (res, socket, upgradeHead) => {
      console.log(`[SUCCESS] ${name} upgraded successfully! Status: ${res.statusCode}`);
      socket.end();
      resolve(true);
    });

    req.on('response', (res) => {
      console.log(`[FAILED] ${name} responded with status: ${res.statusCode} (No Upgrade)`);
      resolve(false);
    });

    req.on('error', (err) => {
      console.log(`[ERROR] ${name} failed: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

async function run() {
  const headers = {
    'Connection': 'Upgrade',
    'Upgrade': 'websocket',
    'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
    'Sec-WebSocket-Version': '13'
  };

  // Test direct WebSocket port 8086
  await testHandshake('Direct WebSocket (8086)', {
    host: 'localhost',
    port: 8086,
    path: '/ws/chat/websocket',
    headers: headers
  });

  // Test Gateway WebSocket port 7007
  await testHandshake('Gateway WebSocket (7007)', {
    host: 'localhost',
    port: 7007,
    path: '/ws/chat/websocket',
    headers: headers
  });
}

run();
