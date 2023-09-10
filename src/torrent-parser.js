'use strict';

import { readFileSync } from 'fs';
import { createHash } from 'crypto';
import bignum from 'bignum';
import bencode from 'bencode';

export const open = (filepath) => {
  return bencode.decode(readFileSync(filepath));
};

export const size = torrent => {
  const size = torrent.info.files ?
    torrent.info.files.map(file => file.length).reduce((a, b) => a + b) :
    torrent.info.length;

  return bignum.toBuffer(size, {size: 8});
};

export const infoHash = torrent => {
  const info = bencode.encode(torrent.info);
  // SHA1 is the hash function supported by bittorrent
  // returns 20 bytes fixed size buffer
  return createHash('sha1').update(info).digest();
};