'use strict';

const { createSocket } = require('dgram');
const { randomBytes } = require('crypto');

module.exports.getPeers = async (torrent, callback) => {
  const socket = createSocket('udp4');
  const url = torrent.announce;
  console.log('Getting peers for: ', url);

  // 1. send connect request
  await udpSend(socket, buildRequestBuffer(), url);

  socket.on('message', async response => {
    if (respType(response) === 'connect') {
      // 2. receive and parse connect response
      const connResp = parseResponse(response);
      // 3. send announce request
      const announceReq = buildAnnounceReq(connResp.connectionId);
      await udpSend(socket, announceReq, url);
    } else if (respType(response) === 'announce') {
      // 4. parse announce response
      const announceResp = parseAnnounceResp(response);
      // 5. pass peers to callback
      callback(announceResp.peers);
    }
  });
};

async function udpSend(socket, message, rawUrl) {
  const url = new URL(rawUrl);
  await socket.send(message, 0, message.length, url.port, url.host);
}

function respType(resp) {
  // ...
}

function buildRequestBuffer() {
  // build connection req based on BEP format: 
  // http://www.bittorrent.org/beps/bep_0015.html

  const buf = Buffer.alloc(16); // message should be 16 bytes long

  // connection id
  buf.writeUInt32BE(0x417, 0);
  buf.writeUInt32BE(0x27101980, 4);

  // action
  buf.writeUInt32BE(0, 8);

  // random transaction id
  randomBytes(4).copy(buf, 12);

  return buf;
}

function parseResponse(resp) {
  return {
    action: resp.readUint32BE(0),
    transactionId: resp.readUint32BE(4),
    connectionId: resp.slice(8),
  }
}

function buildAnnounceReq(connId) {
  // ...
}

function parseAnnounceResp(resp) {
  // ...
}