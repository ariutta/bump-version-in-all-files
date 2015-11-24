var JSONStream = require('JSONStream');
var Rx = require('rx');
var RxNode = require('./rx-node-plus.js');

var hyperquest = require('hyperquest');

function rxQuestGet(uri, opts) {
  opts = opts || {};
  if (typeof uri === 'string') {
    opts.uri = uri;
  } else {
    opts = uri;
  }
  var stream = hyperquest(opts);

  var parsedStream;

  var json = opts.json;
  if (json) {
    parsedStream = stream
      .pipe(JSONStream.parse(json));
  } else {
    parsedStream = stream;
  }

  return RxNode.fromUnpauseableStream(parsedStream);
}

function rxQuest(uri, opts) {
  return rxQuestGet(uri, opts);
}

rxQuest.get = function rxQuest(uri, opts) {
  return rxQuestGet(uri, opts);
};

module.exports = rxQuest;
