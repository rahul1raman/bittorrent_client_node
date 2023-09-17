"use strict";

import { randomBytes } from "crypto";
import { createSocket } from "dgram";

import { uniqBy, prop} from "ramda";

let id = null;

export const deduplicateByKey = (key, array) => uniqBy(prop(key), array);

export const genId = () => {
  // Used to generate peer id to uniquely identify the client
  // "RT" is the name of my client (raman-torrent), and 0001 is the version number
  if (!id) {
    id = randomBytes(20);
    Buffer.from("-RT0001-").copy(id, 0);
  }
  return id;
};

export const isCompactFormat = (responseBuffer) => {
    // In compact format, the length of the peers section is a multiple of 6
    return (responseBuffer.length - 20) % 6 === 0;
}

export const udpSend = (rawUrl, message, messageParser) => {
  const url = new URL(rawUrl);
  const socket = createSocket("udp4");
  let connection = null;

  return new Promise((resolve) => {
    socket.on("error", (err) => {
      console.error("Error pinging UDP url: ", url);
      if (socket.listening) socket.close();
      resolve(null);
    });

    socket.on("message", (msg) => {
      connection = messageParser(msg);
      console.log("Connection found: ", connection);
      resolve(connection);
      if (socket.listening) socket.close();
    });

    socket.send(
      message,
      0,
      message.length,
      url.port,
      url.hostname
    );

    setTimeout(() => {
      console.error("Timeout: No response from UDP endpoint", url);
      resolve(null);
      if (socket.listening) socket.close();
    }, 5000);
  });
};
