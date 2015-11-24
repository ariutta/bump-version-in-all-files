var bumpVersionInAllFiles = require('./index.js');
//bumpVersionInAllFiles();

var hyperquest = require('hyperquest');
var rxQuest = require('./rx-quest.js');
var rxFs = require('./rx-fs.js');
var rxJSONStream = require('./rx-json-stream.js');
var Rx = require('rx');
var RxNode = require('./rx-node-plus.js');
var t = require('transducers-js');

function bumpPackageJson(oldVersion, newVersion) {
  var dataSource = rxQuest.get('https://publicdata-weather.firebaseio.com/sanfrancisco\.json');

  //var dataSource = rxFs.readFile('./package.json');

  /*
  var stream = hyperquest('https://publicdata-weather.firebaseio.com/sanfrancisco\.json');
  var dataSource = RxNode.fromUnpauseableStream(stream);
  Rx.Observable.fromEvent(stream, 'end')
    .subscribe(function(data) {
      console.log('hyperquest end event data');
      console.log(data);
    }, function(err) {
      throw err;
    }, function() {
      console.log('hyperquest complete');
    });
  /*
  var endSource = Rx.Observable.fromEvent(stream, 'end');
  var dataSource = Rx.Observable.fromEvent(stream, 'data')
    .takeUntil(endSource);
  //*/

  dataSource
    //.let(rxJSONStream.parse('*'))
    //.let(rxJSONStream.parse('timezone'))
    .let(rxJSONStream.parse('*.data'))
    //.let(rxJSONStream.parse(true))
    //*/
    //.concatMap(rxJSONStream.stringify())
    /*
    .flatMap(Rx.Observable.pairs)
    .concatMap(rxJSONStream.stringifyObject())
    //*/
    .subscribe(function(data) {
      console.log('subscribed data');
      console.log(data);
      //console.log(JSON.parse(data));
      //console.log(JSON.stringify(JSON.parse(data)), null, '  ');
    }, function(err) {
      throw err;
    }, function() {
      console.log('complete');
    });
  /*
  fs.createReadStream('./package.json')
    .pipe(JSONStream.parse())
    .pipe(JSONStream.stringify())
    .pipe(process.stdout);
  //*/
}

bumpPackageJson('1.0.0', '2.0.0');

/*
var EventEmitter = require('events').EventEmitter;
var e = new EventEmitter();

var source = RxNode.fromUnpauseableStream(e);

var subscription = source.subscribe(
  function(result) {
    console.log('Next: %s', result);
  },
  function(err) {
    console.log('Error: ' + err);
  },
  function() {
    console.log('Completed');
  });

e.emit('data', 'foo', 'bar');
e.emit('data', 'foo1', 'bar1');
e.emit('end');
// => Next: foo,bar
//*/

/*
function isEven(x) { return x % 2 === 0; }
function mul10(x) { return x * 10; }

//var t = require('transducers-js');

var source = Rx.Observable.range(1, 5)
  .map(function(x) {
    console.log('x: ' + x);
    return x;
  })
  .transduce(t.comp(t.filter(isEven), t.map(mul10)));
  //.transduce(t.map(mul10));

var subscription = source.subscribe(
  function(x) {
    console.log('Next: %s', x);
  },
  function(err) {
    console.log('Error: %s', err);
  },
  function() {
    console.log('Completed');
  });
//*/

/*
var map    = t.map,
    filter = t.filter,
    comp   = t.comp,
    into   = t.into;

var inc = function(n) { return n + 1; };
var isEven = function(n) { return n % 2 == 0; };
var xf = comp(map(inc), filter(isEven));

console.log(into([], xf, [0,1,2,3,4])); // [2,4]
//*/

/*
function parseIt() {
  return function(o) {
    return o.concat(o);
  };
}

var obs = Rx.Observable.range(1, 3);

var source = obs.let(parseIt());

var subscription = source.subscribe(
    function (x) {
        console.log('Next: ' + x);
    },
    function (err) {
        console.log('Error: ' + err);
    },
    function () {
        console.log('Completed');
    });

var subscription = source.subscribe(
    function (x) {
        console.log('Next: ' + x);
    },
    function (err) {
        console.log('Error: ' + err);
    },
    function () {
        console.log('Completed');
    });
//*/
