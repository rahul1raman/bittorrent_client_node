'use strict';

import * as net from 'net';
import { Buffer } from 'buffer';
import * as tracker from './tracker.js';
import * as message from './message.js';

function downloadFromPeer(peer, torrent) {
    const socket = net.Socket();
    socket.on('error', console.log);
    socket.connect(peer.port, peer.ip, () => {
        socket.write(message.buildHandshake(torrent));
    });

    onWholeMsg(socket, msg => msgHandler(msg, socket));
}

function isHandshake(msg) {
    return msg.length === msg.readUInt8(0) + 49 && 
        msg.toString('utf8', 1) === 'BitTorrent protocol';
}


function msgHandler(msg, socket) {
    if (isHandshake(msg)) {
      socket.write(message.buildInterested());
    } else {
      const m = message.parse(msg);
      console.log('Message: ', m);
    }
  }


function onWholeMsg(socket, callback) {
    let savedBuf = Buffer.alloc(0);
    let handshake = true;

    socket.on('data', recvBuf => {
        console.log('Received msg from peer: ', msg);
        // msgLen calculates the length of a whole message
        function msgLen() {
            return handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
        }
        savedBuf = Buffer.concat([savedBuf, recvBuf]);
    
        while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
          callback(savedBuf.subarray(0, msgLen()));
          savedBuf = savedBuf.subarray(msgLen());
          handshake = false;
        }
    });
}


export const download = async torrent => {
    const peers = await tracker.getPeers(torrent);
    console.log('Found peers: ', peers);
    // peers.forEach(peer => downloadFromPeer(peer, torrent));
}