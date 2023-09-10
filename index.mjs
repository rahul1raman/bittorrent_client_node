'use strict';

import { readFileSync } from 'fs';
import {createSocket } from 'dgram';
import { Buffer } from 'buffer';
import { URL, parse } from 'url'; 

import bencode from 'bencode';


const torrent = bencode.decode( readFileSync('puppy.torrent'), 'utf8' );
const announceUrl = torrent.announce;
const url = new URL(announceUrl);

console.log(url);

