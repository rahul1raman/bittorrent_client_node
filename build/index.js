'use strict';

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
var _fs = require("fs");
var _bencode = _interopRequireDefault(require("bencode"));
var _tracker = require("./src/tracker.js");
var torrent = _bencode["default"].decode((0, _fs.readFileSync)('torrents/puppy.torrent'), 'utf8');
await (0, _tracker.getPeers)(torrent, function (peers) {
  console.log('List of peers: ', peers);
});
//# sourceMappingURL=index.js.map