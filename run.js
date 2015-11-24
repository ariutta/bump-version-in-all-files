var bumpVersionInAllFiles = require('./index.js');
//bumpVersionInAllFiles();

var rxQuest = require('./rx-quest.js');
var rxFs = require('./rx-fs.js');
var Rx = require('rx');
var RxNode = require('./rx-node-plus.js');

function bumpPackageJson(oldVersion, newVersion) {
  //var dataSource = rxFs.createReadObservable('./testfile.json');
  //*
  var dataSource = rxFs.createReadObservable('./testfile.json', {
    json: true
  });
  //*/
  //var dataSource = rxFs.createReadObservable('./package.json');
  /*
  var dataSource = rxFs.createReadObservable('./package.json', {
    json: true
  });
  //*/
  /*
  var dataSource = rxQuest.get('https://publicdata-weather.firebaseio.com/sanfrancisco\.json', {
    json: true
  });
  //*/

  /*
  var dataSource = rxQuest('https://publicdata-weather.firebaseio.com/sanfrancisco\.json', {
    json: true
  });
  //*/

  /*
  var dataSource = rxQuest.get({
    uri: 'https://publicdata-weather.firebaseio.com/sanfrancisco\.json',
    json: true
  });
  //*/

  /*
  var dataSource = rxQuest({
    uri: 'https://publicdata-weather.firebaseio.com/sanfrancisco\.json',
    json: true
  });
  //*/

  /*
  var dataSource = rxQuest({
    uri: 'https://publicdata-weather.firebaseio.com/sanfrancisco\.json',
    json: '*.data'
  });
  //*/

  dataSource
    .map(function(packageJson) {
      console.log('packageJson');
      console.log(packageJson);
      packageJson.version = '5.6.8';
      return packageJson;
    })
    .doOnNext(rxFs.createWriteObservable('./testfile.json'))
    .subscribe(function(data) {
      console.log('data');
      console.log(data);
      //console.log(JSON.parse(data));
      //console.log(JSON.stringify(JSON.parse(data)), null, '  ');
    }, function(err) {
      throw err;
    }, function() {
      console.log('complete');
    });
}

bumpPackageJson('1.0.0', '2.0.0');
