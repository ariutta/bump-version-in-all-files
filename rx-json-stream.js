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
  var jsonSource = Rx.Observable.fromEvent(stream, 'data');
  return function(x, idx, source) {
    stream.write(x);
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
  var jsonSource = Rx.Observable.fromEvent(stream, 'data');
  return function(x, idx, source) {
    console.log('xbeforestringifywritelength:' + JSON.stringify(x).length);
    stream.write(x);
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
    console.log('xbeforestringifyobjectwritelength:' + JSON.stringify(x).length);
    //stream.write(['key', x]);
    stream.write(x);
    return jsonSource.map(function(result) {
      console.log('result length:' + JSON.stringify(result).length);
      return result;
    });
  };
};

module.exports = rxJSONStream;
