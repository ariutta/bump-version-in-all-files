'use strict';
var getNewVersion = require('./get-new-version.js');
var inquirer = require('inquirer');
var resolveFrom = require('resolve-from');
var Rx = require('rx');
var RxNode = require('rx-node');

var createPromptObservable = Rx.Observable.fromCallback(inquirer.prompt);

// Update bower, component, npm, README, etc. in one step

function bumpVersionInAllFiles(opts) {
  opts = opts || {};
  opts.require = opts.require || [];
  opts.require = opts.require.concat([
    //'gulp',
    //'gulp-bump',
    //'highland',
    'JSONStream',
    //'gulp-regex-replace',
    './package.json'
  ]);

  opts.metadataFiles = opts.metadataFiles || ['./package.json'];

  var cache = {};

  for (var key in require.cache) {
    cache[key] = true;
  }

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

  var oldPackageJson = require(resolveFrom(process.cwd(), './package.json'));
  //var oldVersion = oldPackageJson.version;
  // TODO these is just for testing below

  //var oldVersion = '2.0.0-alpha.2';
  var oldVersion = '2.0.0';

  //var oldVersion = '2.0.1';
  //var oldVersion = '2.0.1-rc.0';
  //var oldVersion = '2.0.1-alpha.0';

  //var oldVersion = '2.1.0';
  //var oldVersion = '2.1.0-alpha.0';
  getNewVersion(oldVersion)
    .subscribe(function(updatedVersion) {
      console.log('updated from ' + oldVersion + ' to ' + updatedVersion);
    }, function(err) {
      throw err;
    });
}

bumpVersionInAllFiles();

module.exports = bumpVersionInAllFiles;
