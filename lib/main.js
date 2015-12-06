// bump-version-in-all-files/index.js
// Update bower.json, component.json, package.json,
// README.md, etc., all with one command

'use strict';
var bumpFilesByFindAndReplace = require('./bump-files-by-find-and-replace.js');
var getNewVersion = require('semver-inc-wizard');
var Rx = require('rx');
var rxFs = require('rx-fs');
var rxJSONStream = require('rx-json-stream');
var updateFileLines = require('./update-file-lines.js');

function bumpVersionInAllFiles(opts) {

  // TODO allow for finding this if the user is in a sub-dir
  var topLevelDir = process.cwd();

  opts = opts || {};
  var jsonFiles = opts.jsonFiles || [];
  if (jsonFiles.length === 0) {
    // at least update package.json
    jsonFiles.push({
      path: topLevelDir + '/package.json',
      key: 'version'
    });
  }

  var newVersion = opts.newVersion;

  var newVersionSource = Rx.Observable.if(
    function() {
      return newVersion;
    },
    // if new version provided, use it
    Rx.Observable.return(newVersion),
    // otherwise, get old version and ask how to bump it
    rxFs.createReadObservable(topLevelDir + '/package.json', {
        flags: 'r'
      })
      .let(rxJSONStream.parse('version'))
      .flatMap(getNewVersion)
  )
    .flatMap(function(newVersion) {
      return Rx.Observable.forkJoin(
        jsonFiles.map(function(file) {
          function updater(o) {
            return o.let(rxJSONStream.parse(true))
              .map(function(metadataFileJson) {
                metadataFileJson[file.key] = newVersion;
                return JSON.stringify(metadataFileJson, null, '  ');
              });
          }
          return updateFileLines(file.path, updater);
        })
      )
      .concat(
        bumpFilesByFindAndReplace(newVersion, topLevelDir, {
          exclude: jsonFiles.map(function(file) {
            return file.path;
          }).concat([
            topLevelDir + '/run-inc.js'
          ]),
          excludeDir: [
            topLevelDir + '/.git',
            topLevelDir + '/.svn',
            topLevelDir + '/.hg',
            topLevelDir + '/node_modules',
            topLevelDir + '/src',
            topLevelDir + '/lib',
            topLevelDir + '/test'
          ]
        })
      );
    })
    .subscribe(function(result) {
      // do something
    }, function(err) {
      throw err;
    }, function() {
      console.log('Successfully bumped version in all files.');
    });
}

module.exports = bumpVersionInAllFiles;
