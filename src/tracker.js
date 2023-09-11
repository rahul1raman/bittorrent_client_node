'use strict';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { createSocket } = require('dgram');
const { randomBytes } = require('crypto');
const axios = require('axios');
const bignum = require('bignum');

import {genId} from './utils.js';

export const getPeers = async (torrent) => {
  const trackers = torrent.announce;
  const peers = [];

  for (const trackerUrl of trackers) {
    console.log('Getting peers for: ', trackerUrl);
    // if (trackerUrl.startsWith('http')) {
    //   const httpPeers = await getPeersFromHttpTracker(trackerUrl, torrent);
    //   peers.push(...httpPeers);
    // } else 
    if (trackerUrl.startsWith('udp')) {
      const connection = await getConnection(trackerUrl);
      if (connection) {
        const { peers: udpPeers } = await getPeersFromUDPTracker(trackerUrl, torrent, connection.connectionId);
        peers.push(...udpPeers);
      }
    }
  }

  return peers;
};


export function buildConnectionMessage() {
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

function buildAnnounceReq(connectionId, torrent, port=6881) {
  const buf = Buffer.alloc(98);

  // Connection ID
  // buf.writeUInt32BE(0x417, 0);
  // buf.writeUInt32BE(0x27101980, 4);

  connectionId.copy(buf, 0);

  // Action (announce)
  buf.writeUInt32BE(0x1, 8);

  // Transaction ID
  randomBytes(4).copy(buf, 12)

  // Info Hash
  Buffer.from(torrent.infoHash, 'hex').copy(buf, 16, 0, 20);

  // Peer ID
  genId().copy(buf, 36, 0, 20);

  buf.writeUInt32BE(0, 56); // downloaded
  buf.writeUInt32BE(bignum.toBuffer(torrent.length, {size: 8}), 64); // left
  buf.writeUInt32BE(0, 72);  // uploaded

  // Event
  buf.writeInt32BE(0, 80); // event

  // IP Address
  buf.writeUInt32BE(0, 84);

  // Key
  randomBytes(4).copy(buf, 88, 0, 4)

  // Num Want
  buf.writeInt32BE(-1, 92);

  // Port
  buf.writeUInt16BE(port, 96);

  return buf;
}

function parseAnnounceResp(responseBuffer) {
  try {
    const action = responseBuffer.readUInt32BE(0);
    const transactionID = responseBuffer.readUInt32BE(4);

    const interval = responseBuffer.readUInt32BE(8);
    const leechers = responseBuffer.readUInt32BE(12);
    const seeders = responseBuffer.readUInt32BE(16);

    const peersBuffer = responseBuffer.slice(20);

    // Determine if the response is in compact format
    const isCompact = isCompactFormat(peersBuffer);

    const peers = [];

    if (isCompact) {
      for (let i = 0; i < peersBuffer.length; i += 6) {
        if (i + 6 <= peersBuffer.length) {
          const peerIPBytes = peersBuffer.slice(i, i + 4);
          const peerPortBytes = peersBuffer.slice(i + 4, i + 6);

          const peerIP = Array.from(peerIPBytes).join('.');
          const peerPort = peerPortBytes.readUInt16BE(0);

          peers.push({ ip: peerIP, port: peerPort });
        }
      }
    } else {
      // Handle non-compact format
      for (let i = 0; i < peersBuffer.length; i += 6) {
        if (i + 6 <= peersBuffer.length) {
          const peerIP = peersBuffer.slice(i, i + 4).join('.');
          const peerPort = peersBuffer.readUInt16BE(i + 4);
          peers.push({ ip: peerIP, port: peerPort });
        }
      }
    }

    return {
      action,
      transactionID,
      interval,
      leechers,
      seeders,
      peers,
    };
  } catch (e) {
    return { peers: []};
  }
}

async function getPeersFromHttpTracker(announceUrl, torrent) {
  const response = await axios.get(announceUrl, {
    params: {
      info_hash: torrent.infoHash, // Unique identifier for the torrent
      peer_id: genId(), // Your peer ID, should be unique
      port: 6881, // Port on which you'll be listening for incoming connections
      uploaded: 0, // Amount uploaded (can be 0 for now)
      downloaded: 0, // Amount downloaded (can be 0 for now)
      left: torrent.length, // Amount left to download (initially equals total size)
      compact: 1, // Compact response format (1 for yes, 0 for no)
      numwant: 50, // Number of peers you want in the response
      event: 'started' // Event type (started, stopped, completed)
    }
  });

  const peers = parseAnnounceResp(response.data);

  return peers;
}


async function getConnection(announceUrl) {
  const trackerUrl = new URL(announceUrl);
  const socket = createSocket('udp4');
  let connection = null;

  return new Promise((resolve, reject) => {
    socket.on('error', (err) => {
      console.error('Error pinging UDP url: ', announceUrl);
      // console.error(err);
      resolve(null);
      if (socket.listening) socket.close();
    });

    socket.on('message', (msg) => {
      connection = parseConnResponse(msg);
      console.log('Connection found: ', connection);
      resolve(connection);
      if (socket.listening) socket.close();
    });

    const message = buildConnectionMessage();
    socket.send(message, 0, message.length, trackerUrl.port, trackerUrl.hostname);

    setTimeout(() => {
      console.error('Timeout: No response from UDP endpoint', announceUrl);
      resolve(null);
      if (socket.listening) socket.close();
      
    }, 5000);
  });
}


async function getPeersFromUDPTracker(announceUrl, torrent, connectionId) {
  const trackerUrl = new URL(announceUrl);
  const socket = createSocket('udp4');

  let peers = {
    peers: [],
  };

  return new Promise((resolve, reject) => {
    socket.on('error', (err) => {
      console.error('Error pinging UDP url: ', announceUrl);
      // console.error(err);
      resolve(peers);
      if (socket.listening) socket.close();
    });

    socket.on('message', (msg) => {
      peers = parseAnnounceResp(msg);
      console.log('Peers found: ', peers);
      resolve(peers);
      if (socket.listening) socket.close();
    });

    // Send announce request
    const message = buildAnnounceReq(connectionId, torrent);
    socket.send(message, 0, message.length, trackerUrl.port, trackerUrl.hostname);

    setTimeout(() => {
      console.error('Timeout: No response from UDP endpoint', announceUrl);
      resolve(peers);
      if (socket.listening) socket.close();
      
    }, 5000);
  });
}


function isCompactFormat(responseBuffer) {
  // In compact format, the length of the peers section is a multiple of 6
  return (responseBuffer.length - 20) % 6 === 0;
}