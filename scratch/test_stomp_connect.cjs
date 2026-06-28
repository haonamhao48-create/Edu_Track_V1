const http = require('http');

// Get a token from login or use a fake one to test the signature parser
// Wait, we can test with no token, or a simple mock token.
// Let's write the connection simulation:
function simulateStomp(port, path) {
  return new Promise((resolve) => {
    console.log(`\n--- Testing STOMP on port ${port} ${path} ---`);
    
    const req = http.request({
      host: 'localhost',
      port: port,
      path: path,
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13'
      }
    });

    req.on('upgrade', (res, socket, upgradeHead) => {
      console.log(`[UPGRADE] Connection established on port ${port}.`);
      
      // Listen for data
      socket.on('data', (data) => {
        console.log(`[RAW RECEIVED] Len: ${data.length}`);
        const str = data.toString('utf8');
        console.log('[RAW CONTENT]:');
        console.log(JSON.stringify(str));
        console.log('---End raw---');
        
        // Let's check for CONNECTED
        if (str.includes('CONNECTED')) {
          console.log('[STATUS] Received CONNECTED frame from server!');
        }
        
        socket.end();
        resolve(true);
      });

      // Send CONNECT frame
      // Using standard STOMP frame structure
      // Wait, we need to send WebSocket text frame format!
      // In WebSocket protocol, text frames have a specific frame header (opcode 0x1, length, masking, etc.)
      // Since raw TCP socket does not frame it, we must format it as a WebSocket frame!
      // To keep it simple, let's write a helper to wrap text in a WebSocket frame.
      const connectFrameText = 
        `CONNECT\n` +
        `accept-version:1.1,1.2\n` +
        `heart-beat:10000,10000\n` +
        `Authorization:Bearer test-token-here\n\n\x00`;

      const wsFrame = encodeWebSocketFrame(connectFrameText);
      socket.write(wsFrame);
      console.log('[SENT] Sent STOMP CONNECT frame inside WebSocket frame.');
    });

    req.on('error', (err) => {
      console.log(`[ERROR] Port ${port} failed: ${err.message}`);
      resolve(false);
    });

    req.end();
  });
}

// WebSocket frame encoder helper
function encodeWebSocketFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;

  if (len <= 125) {
    header = Buffer.alloc(6); // 2 bytes header + 4 bytes mask key
    header[0] = 0x81; // FIN + Text frame
    header[1] = 0x80 | len; // Mask bit set + length
  } else if (len <= 65535) {
    header = Buffer.alloc(8);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(14);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  // Generate a random 4-byte mask key
  const maskKey = [0x12, 0x34, 0x56, 0x78];
  const headerLen = header.length;
  for (let i = 0; i < 4; i++) {
    header[headerLen - 4 + i] = maskKey[i];
  }

  // Mask payload
  const maskedPayload = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    maskedPayload[i] = payload[i] ^ maskKey[i % 4];
  }

  return Buffer.concat([header, maskedPayload]);
}

async function run() {
  await simulateStomp(7007, '/ws/chat/websocket');
}

run();
