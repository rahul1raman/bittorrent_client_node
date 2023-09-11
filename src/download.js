'use strict';

import * as net from 'net';
import { Buffer } from 'buffer';
import * as tracker from './tracker';

function downloadFromPeer(peer) {
    const socket = net.Socket();
    socket.on('error', console.log);
    socket.connect(peer.port, peer.ip, () => {

    });

    socket.on('data', data => {

    });
}

export const download = torrent => {
    tracker.getPeers(torrent, peers => {
        peers.forEach(downloadFromPeer);
    });
} 