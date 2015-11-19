'use strict';
// TODO don't use local version
var getNewVersion = require('../semver-inc-wizard/index.js');
var inquirer = require('inquirer');
var resolveFrom = require('resolve-from');
var Rx = require('rx');
var RxNode = require('rx-node');

var createPromptObservable = Rx.Observable.fromCallback(inquirer.prompt);

// Update bower, component, npm, README, etc. in one step

function bumpVersionInAllFiles(opts) {

  // TODO allow for finding this if the user is in a sub-dir
  var topLevelDir = process.cwd();

  opts = opts || {};
  opts.require = opts.require || [];
  opts.require = opts.require.concat([
    //'highland',
    'JSONStream'
  ]);

  opts.metadataFiles = opts.metadataFiles || [topLevelDir + '/package.json'];

  var cache = {};

  for (var key in require.cache) {
    cache[key] = true;
  }

  var newVersion = opts.newVersion;

  function clearCache() {
    for (var key in require.cache) {
      if (!cache[key] && !/\.node$/.test(key)) {
        delete require.cache[key];
      }
    }
  }

  if (Array.isArray(opts.require) && opts.require.length) {
    opts.require.forEach(function(x) {
      require(resolveFrom(process.cwd(), x));
    });
  }

  var oldPackageJson = require(resolveFrom(topLevelDir, './package.json'));
  var oldVersion = oldPackageJson.version;

  var newVersionSource = Rx.Observable.if(
    function() {
      return newVersion;
    },
    Rx.Observable.return(newVersion),
    getNewVersion(oldVersion)
  );

  function bumpPackageJson(oldVersion, newVersion) {
    var fs = require('fs');
    var JSONStream = require('JSONStream');

    fs.createReadStream('./package.json')
      .pipe(JSONStream.parse('*'))
      .pipe(process.stdout);

  }

  newVersionSource
    .flatMap(function(newVersion) {
      return newVersion;
    })
    .subscribe(function(newVersion) {
      console.log('     Updated from ' + oldVersion + ' to ' + newVersion);
    }, function(err) {
      throw err;
    });
}

module.exports = bumpVersionInAllFiles;
