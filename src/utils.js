'use strict';

import {randomBytes} from 'crypto';

let id = null;

export const genId = () => {
    // Used to generate peer id to uniquely identify the client
    // "RT" is the name of my client (raman-torrent), and 0001 is the version number
    if (!id) {
        id = randomBytes(20);
        Buffer.from('-RT0001-').copy(id, 0);
    }
    return id;
};