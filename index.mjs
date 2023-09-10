'use strict';

import { readFileSync } from 'fs';

import bencode from 'bencode';

import tracker from './src/tracker.js';


const torrent = bencode.decode( readFileSync('puppy.torrent'), 'utf8' );

await tracker.getPeers(torrent, peers => {
    console.log('List of peers: ', peers);
});