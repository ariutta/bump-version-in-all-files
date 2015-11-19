var bumpVersionInAllFiles = require('./index.js');
//bumpVersionInAllFiles();

var hyperquest = require('hyperquest');
var rxFs = require('./rx-fs.js');
var rxJSONStream = require('./rx-json-stream.js');
var Rx = require('rx');
var RxNode = require('rx-node');

function bumpPackageJson(oldVersion, newVersion) {
  //var dataSource = rxFs.readFile('./package.json')
  //*
  var stream = hyperquest('https://publicdata-weather.firebaseio.com/sanfrancisco\.json');
  var endSource = Rx.Observable.fromEvent(stream, 'end');
  var dataSource = Rx.Observable.fromEvent(stream, 'data')
    .takeUntil(endSource);

  dataSource
    /*
    .concatMap(rxJSONStream.parse('*', function(value) {
      return value;
    }))
    //*/
    /*
    .concatMap(rxJSONStream.parse('timezone', function(value) {
      return value;
    }))
    //*/
    /*
    .concatMap(rxJSONStream.parse(true, function(value) {
      return value;
    }))
    //*/
    //*
    //.concatMap(rxJSONStream.parse('*'))
    //.concatMap(rxJSONStream.parse('timezone'))
    //.concatMap(rxJSONStream.parse('*.data'))
    .concatMap(rxJSONStream.parse(true))
    //*/
    //.concatMap(rxJSONStream.stringify())
    /*
    .concatMap(function(data) {
      console.log('concatMaprunlength:' + JSON.stringify(data).length);
      return rxJSONStream.stringifyObject()(data);
    })
    //*/
    //.flatMap(rxJSONStream.stringifyObject())
    //.concatMap(rxJSONStream.stringifyObject())
    //.concatMap(rxJSONStream.stringify())
    .subscribe(function(data) {
      console.log('**');
      console.log('**');
      console.log('** subscribed data');
      console.log(data);
      console.log('**');
      console.log('**');
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
