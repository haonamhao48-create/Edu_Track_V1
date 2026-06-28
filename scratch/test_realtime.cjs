const http = require('http');

function connectStomp(port, path, token, roomId) {
  return new Promise((resolve, reject) => {
    console.log(`[STOMP] Connecting to ws://localhost:${port}${path}...`);
    
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
      console.log(`[WebSocket] Connected.`);
      
      let isConnected = false;
      const listeners = {};

      const sendFrame = (frame) => {
        socket.write(encodeWebSocketFrame(frame));
      };

      // Handle raw messages
      socket.on('data', (data) => {
        const payload = decodeWebSocketFrame(data);
        if (!payload) return;

        const rawFrames = payload.split('\x00');
        for (const rawFrame of rawFrames) {
          if (!rawFrame || rawFrame.trim() === '') continue;

          console.log(`[STOMP RECEIVED] Frame (length ${rawFrame.length}):\n${JSON.stringify(rawFrame)}\n---End frame---`);

          // Find boundary between headers and body (could be \n\n or \r\n\r\n)
          let doubleLIndex = rawFrame.indexOf('\n\n');
          let boundaryLen = 2;
          if (doubleLIndex === -1) {
            doubleLIndex = rawFrame.indexOf('\r\n\r\n');
            boundaryLen = 4;
          }

          let head = '';
          let body = '';
          if (doubleLIndex !== -1) {
            head = rawFrame.substring(0, doubleLIndex);
            body = rawFrame.substring(doubleLIndex + boundaryLen);
          } else {
            head = rawFrame;
            body = '';
          }

          const headLines = head.split(/\r?\n/);
          const command = headLines[0].trim();
          if (!command) continue;

          const headers = {};
          for (let i = 1; i < headLines.length; i++) {
            const line = headLines[i];
            if (line.includes(':')) {
              const idx = line.indexOf(':');
              headers[line.substring(0, idx).trim()] = line.substring(idx + 1).trim();
            }
          }

          console.log(`[PARSED] Command: ${command}, Headers:`, JSON.stringify(headers));

          if (command === 'CONNECTED') {
            console.log('[STOMP] CONNECTED received successfully!');
            isConnected = true;
            
            // Subscribe to room topic
            const subId = `sub-123`;
            const dest = `/topic/room.${roomId}`;
            const subscribeFrame = 
              `SUBSCRIBE\n` +
              `id:${subId}\n` +
              `destination:${dest}\n\n\x00`;
            
            sendFrame(subscribeFrame);
            console.log(`[STOMP] Sent SUBSCRIBE for ${dest}`);

            // Wait 1 second, then send a message
            setTimeout(() => {
              const payloadObj = {
                roomId: roomId,
                messageType: 'TEXT',
                content: 'Hello from integration test!',
                clientMessageId: `client_${Date.now()}`
              };

              const sendFrameText = 
                `SEND\n` +
                `destination:/app/chat.sendMessage\n` +
                `content-type:application/json\n\n` +
                JSON.stringify(payloadObj) + `\x00`;

              sendFrame(sendFrameText);
              console.log('[STOMP] Sent SEND frame for /app/chat.sendMessage');
            }, 1000);

          } else if (command === 'MESSAGE') {
            const dest = headers['destination'];
            console.log(`[SUCCESS] Received message on ${dest}! Body: ${body}`);
            socket.end();
            resolve(true);
          } else if (command === 'ERROR') {
            console.log(`[ERROR] Received STOMP ERROR: ${body}`);
            socket.end();
            reject(new Error(body));
          }
        }
      });

      // Send CONNECT frame
      const connectFrame = 
        `CONNECT\n` +
        `accept-version:1.1,1.2\n` +
        `heart-beat:10000,10000\n` +
        `Authorization:Bearer ${token}\n\n\x00`;

      sendFrame(connectFrame);
      console.log('[STOMP] Sent CONNECT frame');
    });

    req.on('error', (err) => {
      console.log(`[ERROR] Connection failed: ${err.message}`);
      reject(err);
    });

    req.end();
  });
}

function encodeWebSocketFrame(text) {
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;

  if (len <= 125) {
    header = Buffer.alloc(6);
    header[0] = 0x81;
    header[1] = 0x80 | len;
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

  const maskKey = [0x12, 0x34, 0x56, 0x78];
  const headerLen = header.length;
  for (let i = 0; i < 4; i++) {
    header[headerLen - 4 + i] = maskKey[i];
  }

  const maskedPayload = Buffer.alloc(len);
  for (let i = 0; i < len; i++) {
    maskedPayload[i] = payload[i] ^ maskKey[i % 4];
  }

  return Buffer.concat([header, maskedPayload]);
}

function decodeWebSocketFrame(buffer) {
  if (buffer.length < 2) return null;
  const secondByte = buffer[1];
  const isMasked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7F;
  let dataOffset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    dataOffset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(2));
    dataOffset = 10;
  }

  let maskKey;
  if (isMasked) {
    if (buffer.length < dataOffset + 4) return null;
    maskKey = buffer.slice(dataOffset, dataOffset + 4);
    dataOffset += 4;
  }

  if (buffer.length < dataOffset + payloadLength) return null;
  const payload = buffer.slice(dataOffset, dataOffset + payloadLength);

  if (isMasked) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskKey[i % 4];
    }
  }

  return payload.toString('utf8');
}

// Let's get a token to test with!
// We will use a mock token or call AuthService to get a token, but let's see if we can use a token.
async function run() {
  // Let's run with a roomId that exists or any string (e.g. test-room)
  try {
    await connectStomp(7007, '/ws/chat/websocket', 'fake-token-here', '68233a0b-5d4c-406f-bb5a-4244488717cc');
  } catch (err) {
    console.error('[RUN FAILED]', err);
  }
}

run();
