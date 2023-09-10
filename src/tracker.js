'use strict';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { createSocket } = require('dgram');
const { randomBytes } = require('crypto');

import {size, infoHash} from './torrent-parser.js';

import {genId} from './utils.js';

export const getPeers = async (torrent, callback) => {
  const socket = createSocket('udp4');
  const urls = torrent['announce-list'];
  console.log('\n ====> Getting peers for: ', urls);

  const announceUrl = 'udp://explodie.org:6969';
  // 1. send connect request
  urls.forEach(async element => {
    const url = element[0];
    if (url.startsWith('udp://')) {
      await udpSend(socket, buildConnBuffer(), url);
    } else {
      console.log('Skipping non udp URL: ', url);
    }
  });

  socket.on('message', async response => {
    if (respType(response) === 'connect') {
      // 2. receive and parse connect response
      const connResp = parseConnResponse(response);
      // 3. send announce request
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
      await udpSend(socket, announceReq, announceUrl);
    } else if (respType(response) === 'announce') {
      // 4. parse announce response
      const announceResp = parseAnnounceResp(response);
      console.log("===> Announce response ", announceResp);
      // 5. pass peers to callback
      callback(announceResp.peers);
    }
  });

  socket.on('error', async response => {
    console.error("===> Error connection: ", response);
  });
};


async function udpSend(socket, message, rawUrl) {
  const url = new URL(rawUrl);
  await socket.send(message, Number(url.port), url.hostname);
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  if (action === 0) return 'connect';
  if (action === 1) return 'announce';
}

function buildConnBuffer() {
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

function parseConnResponse(resp) {
  return {
    action: resp.readUint32BE(0),
    transactionId: resp.readUint32BE(4),
    connectionId: resp.slice(8),
  }
}

function buildAnnounceReq(connId, torrent, port=6881) {
  const buf = Buffer.allocUnsafe(98);

  connId.copy(buf, 0); // connection id
  buf.writeUInt32BE(1, 8);   // action 
  randomBytes(4).copy(buf, 12); // transaction id
  infoHash(torrent).copy(buf, 16); // info hash
  genId().copy(buf, 36); // peerId
  Buffer.alloc(8).copy(buf, 56); // downloaded
  size(torrent).copy(buf, 64); // left
  Buffer.alloc(8).copy(buf, 72); // uploaded
  buf.writeUInt32BE(0, 80); // event
  buf.writeUInt32BE(0, 84); // ip address
  randomBytes(4).copy(buf, 88); // key
  buf.writeInt32BE(-1, 92); // num want
  buf.writeInt16BE(port, 96); // port

  return buf;
}

function parseAnnounceResp(resp) {
  function group(iterable, groupSize) {
    let groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }
    return groups;
  }

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    interval: resp.readUInt32BE(8),
    leechers: resp.readUInt32BE(12),
    seeders: resp.readUInt32BE(16),
    peers: group(resp.slice(20), 6).map(address => {
      return {
        ip: address.slice(0, 4).join('.'),
        port: address.readUInt16BE(4)
      }
    })
  }
}