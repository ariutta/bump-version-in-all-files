var _ = require('lodash');
var JSONStream = require('JSONStream');
var Rx = require('rx');
var RxNode = require('rx-node');

var rxJSONStream = {};

/*
rxJSONStream.parse = function(pattern, mapFilterFunction) {
  var stream = JSONStream.parse(pattern, mapFilterFunction);
  var jsonSource = Rx.Observable.fromEvent(stream, 'data');
  return function(x, idx, source) {
    console.log('x');
    //console.log(x);
    stream.write(x);
    return jsonSource.map(function(result) {
      console.log('result length' + JSON.stringify(result).length);
      return result;
    });
  };
};
//*/

rxJSONStream.parse = function(pattern, mapFilterFunction) {
  var stream = JSONStream.parse(pattern, mapFilterFunction);

  stream.on('end', function() {
    console.log('stream end');
  });
  //var jsonSource = Rx.Observable.fromEvent(stream, 'data');
  //var jsonSource = RxNode.fromReadableStream(stream);
  //*
  var jsonSource = RxNode.fromReadableStream(stream)
    .takeUntil(Rx.Observable.timer(0));
  //*/
  /*
  var jsonSource = RxNode.fromReadableStream(stream)
    .takeUntil(Rx.Observable.timer(5000));
  //*/

  return function(x, idx, source) {
    /*
    source.subscribeOnCompleted(
      function() {
        console.log('parse Completed');
      });
    //*/

    if (x !== 'end') {
      stream.write(x);
    } else {
      stream.end();
    }
    return jsonSource;
  };
};

/*
rxJSONStream.stringify = function(open, sep, close) {
  var stream = JSONStream.stringify(open, sep, close);
  var jsonSource = Rx.Observable.fromEvent(stream, 'data');
  return function(x, idx, source) {
    stream.write(x);
    return jsonSource;
  };
};
//*/

//*
rxJSONStream.stringify = function(open, sep, close) {
  var stream = JSONStream.stringify();
  //var jsonSource = Rx.Observable.fromEvent(stream, 'data');
  var jsonSource = RxNode.fromWritableStream(stream);
  return function(x, idx, source) {
    console.log('*');
    console.log('* xlength before writing to stringify:' + JSON.stringify(x).length);
    console.log('*');
    stream.write(x);
    return jsonSource.map(function(result) {
      console.log('*');
      console.log('* xlength after being stringified:' + result.length);
      console.log('*');
      return result;
    });
  };
};
//*/

/*
rxJSONStream.stringify = function(open, sep, close) {
  var stream = JSONStream.stringify();
  //var jsonSource = Rx.Observable.fromEvent(stream, 'data');
  var jsonSource = RxNode.fromWritableStream(stream);
  return function(x, idx, source) {
    console.log('xbeforestringifywritelength:' + JSON.stringify(x).length);
    RxNode.writeToStream(source, stream);
    //stream.write(x);
    return jsonSource.map(function(result) {
      console.log('xstringify52length' + JSON.stringify(result).length);
      return result;
    });
  };
};
//*/

/*
rxJSONStream.stringify = function(open, sep, close) {
  var stream = JSONStream.stringify(open, sep, close);
  return RxNode.fromWritableStream(stream);
};
//*/

rxJSONStream.stringifyObject = function(open, sep, close) {
  var stream = JSONStream.stringifyObject(open, sep, close);
  var jsonSource = RxNode.fromWritableStream(stream);
  return function(x, idx, source) {
    var keys = _.keys(x);
    console.log('keys');
    console.log(keys);
    console.log('xbeforestringifyobjectwritelength:' + JSON.stringify(x).length);
    stream.write(['key', x]);
    //stream.write(x);
    return jsonSource.map(function(result) {
      console.log('result length:' + JSON.stringify(result).length);
      return result;
    });
  };
};

module.exports = rxJSONStream;
