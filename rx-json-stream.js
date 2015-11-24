var JSONStream = require('JSONStream');
var Rx = require('rx');
var RxNode = require('rx-node');

var rxJSONStream = {};

function fromWritableStreamLackingEnd(stream) {
  return RxNode.fromWritableStream(stream);
    // TODO the sources for the rxJSONStream methods should somehow pass end
    // events, but currently that isn't happening, so we need this kludge.
    // Refactor the rxJSONStream methods to end the stream when the source ends.
    // (may need to change something so that the sources pass an end event or
    // so that the sources even HAVE end events, bc I'm not sure they do at present).
    //.takeUntil(Rx.Observable.timer(0));
}

rxJSONStream.parse = function(pattern, mapFilterFunction) {
  var stream = JSONStream.parse(pattern, mapFilterFunction);
  var jsonSource = RxNode.fromReadableStream(stream);

  return function(source) {
    RxNode.writeToStream(source, stream);
    /*
    source.subscribe(function(x) {
      stream.write(x);
    }, function(err) {
      stream.write(err);
    }, function() {
      stream.end();
    });
    //*/
    return jsonSource;
  };
};

rxJSONStream.stringify = function(open, sep, close) {
  close = close || '\n]\n';
  var stream = JSONStream.stringify(open, sep, close);
  var jsonSource = fromWritableStreamLackingEnd(stream)
    .concat(Rx.Observable.return(close));
  return function(x, idx, source) {
    stream.write(x);
    return jsonSource;
  };
};

// NOTE this is the name from JSONStream, but a better name
// would be something like stringifyKeyValuePair, because
// if you really want to stringify an object, you need to
// run this first:
// .flatMap(Rx.Observable.pairs)
rxJSONStream.stringifyObject = function(open, sep, close) {
  close = close || '\n}\n';
  var stream = JSONStream.stringifyObject(open, sep, close);
  var jsonSource = fromWritableStreamLackingEnd(stream)
    .concat(Rx.Observable.return(close));
  return function(x, idx, source) {
    stream.write(x);
    return jsonSource;
  };
};

module.exports = rxJSONStream;
