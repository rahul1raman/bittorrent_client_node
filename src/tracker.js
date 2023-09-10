'use strict';

const { createSocket } = require('dgram');

module.exports.getPeers = async (torrent, callback) => {
  const socket = createSocket('udp4');
  const url = torrent.announce;
  console.log('Getting peers for: ', url);

  // 1. send connect request
  await udpSend(socket, buildConnReq(), url);

  socket.on('message', async response => {
    if (respType(response) === 'connect') {
      // 2. receive and parse connect response
      const connResp = parseConnResp(response);
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

function buildConnReq() {
  // ...
}

function parseConnResp(resp) {
  // ...
}

function buildAnnounceReq(connId) {
  // ...
}

function parseAnnounceResp(resp) {
  // ...
}