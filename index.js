'use strict';
import { readFileSync } from 'fs';

import bencode from 'bencode';

import { getPeers } from './src/tracker.js';


const torrent = bencode.decode( readFileSync('torrents/puppy.torrent'), 'utf8' );

await getPeers(torrent, peers => {
    console.log('List of peers: ', peers);
});
