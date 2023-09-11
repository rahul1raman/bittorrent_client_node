'use strict';

import { download } from './src/download.js';
import parseTorrent from 'parse-torrent';
import fs from 'fs';

const parseFile = async () => {
    return parseTorrent(fs.readFileSync(process.argv[2]));
};
const torrent = await parseFile();
await download(torrent);
