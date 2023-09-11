'use strict';

import * as net from 'net';
import { Buffer } from 'buffer';
import * as tracker from './tracker';

function downloadFromPeer(peer) {
    const socket = net.Socket();
    socket.on('error', console.log);
    socket.connect(peer.port, peer.ip, () => {

    });

    onWholeMsg(socket, data => {

    });
}


function onWholeMsg(socket, callback) {
    let savedBuf = Buffer.alloc(0);
    let handshake = true;

    socket.on('data', recvBuf => {
        // msgLen calculates the length of a whole message
        const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
        savedBuf = Buffer.concat([savedBuf, recvBuf]);
    
        while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
          callback(savedBuf.slice(0, msgLen()));
          savedBuf = savedBuf.slice(msgLen());
          handshake = false;
        }
    });
}


export const download = torrent => {
    tracker.getPeers(torrent, peers => {
        peers.forEach(downloadFromPeer);
    });
} 