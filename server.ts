import * as http from 'http';
import * as crypto from 'crypto';

const server = http.createServer();

server.on('upgrade', (req, socket, head) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) return socket.destroy();

  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const acceptKey = crypto
    .createHash('sha1')
    .update(key + GUID)
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`
  ];

  socket.write(responseHeaders.join('\r\n') + '\r\n\r\n');

  socket.on('data', (buffer) => {
    const firstByte = buffer[0];
    const opcode = firstByte & 0x0f;

    if (opcode === 0x8) return socket.end();

    const secondByte = buffer[1];
    const isMasked = secondByte & 0x80;
    const payloadLength = secondByte & 0x7f;

    let maskingKeyOffset = 2;
    if (payloadLength === 126) maskingKeyOffset = 4;
    if (payloadLength === 127) maskingKeyOffset = 10;

    const maskingKey = buffer.slice(maskingKeyOffset, maskingKeyOffset + 4);
    const data = buffer.slice(maskingKeyOffset + 4);

    const decoded = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      decoded[i] = data[i] ^ maskingKey[i % 4];
    }

    console.log('Received:', decoded.toString());

    const response = Buffer.from('Hello from server!');
    const frame = Buffer.alloc(2 + response.length);
    frame[0] = 0x81;
    frame[1] = response.length;
    response.copy(frame, 2);
    socket.write(frame);
  });
});

server.listen(8080, () => {
  console.log('WebSocket server running on ws://localhost:8080');
});