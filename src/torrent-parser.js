'use strict';

import { readFileSync } from 'fs';

import bencode from 'bencode';

export const open = (filepath) => {
  return bencode.decode(readFileSync(filepath));
};

export const size = torrent => {
  // ...
};

export const infoHash = torrent => {
  // ...
};