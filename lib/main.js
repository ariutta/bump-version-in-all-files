// semver-in-file-text-bumper/index.js
// Update bower.json, component.json, package.json,
// README.md, etc., all with one command

'use strict';
var bumpFilesByFindAndReplace = require('./bump-files-by-find-and-replace.js');
var colors = require('colors');
var FN = require('fstream-npm');
var getNewVersion = require('semver-inc-wizard');
var inquirer = require('inquirer');
var path = require('path');
var Rx = require('rx');
var rxFs = require('rx-fs');
var rxJSONStream = require('rx-json-stream');
var updateFileLines = require('./update-file-lines.js');

var semverInFileTextBumper = {};

function getPackageMetadata() {
  var topLevelDir = process.cwd();
  var packageJsonPath = path.join(topLevelDir, '/package.json');

  return rxFs.stat(packageJsonPath)
    .doOnError(function(err) {
      if (err.code === 'ENOENT') {
        console.error(colors.red('Error: no package.json found. ' +
          'Create a package.json file or move to ' +
          'the directory where package.json is located and try again.\n'));
      } else {
        throw err;
      }
    })
    .flatMap(function(stat) {
      // we don't really care about stat at this point.
      // We just wanted to make sure the file exists.
      return rxFs.createReadObservable(packageJsonPath, {
          flags: 'r'
        })
        .let(rxJSONStream.parse())
        .map(function(packageJson) {
          packageJson.topLevelDir = topLevelDir;
          packageJson.packageJsonPath = packageJsonPath;
          return packageJson;
        });
    });
}

semverInFileTextBumper.set = function(opts) {
  // TODO
  // set JSON metadata files
  //   look for package.json, bower.json, component.json
  // set overrides from what npm includes/excludes:
  //   set files to include
  //   set files to exclude
  //   set dirs to exclude
  // set defaults for what should be done w/out prompting, e.g.:
  //          rel-filepath:line#:occurance#:line-code
  //   location: './README.md:80:2:4893',
  //
  //   the line code at the end could be the non-semver md5sum,
  //   but why not use something small/easy like the sum of the
  //   charCodes san the semvers?
  //   'pvjs-4.1.5 is the latest commit of this project.'
  //     .replace(/jsVersionRe/g, '')
  //     .split('')
  //     .map(function(character) {
  //       return character
  //     })
  //     .reduce(function(acc, char) {
  //       return acc + char.charCodeAt();
  //     }, 0)
};

function getJsonFiles() {
  var jsonFilesSource = Rx.Observable.return({}).concat(
    inquirer.prompt(prompts).process
  )
  .reduce(function(accumulator, response) {
    accumulator[response.name] = response.answer;
    return accumulator;
  });

  /*
  if (jsonFiles.length === 0) {
    // at least update package.json
    jsonFiles.push({
      filepath: packageJsonPath,
      key: 'version'
    });
  }
  //*/
}

semverInFileTextBumper.bump = function(opts) {
  opts = opts || {};
  var newVersion = opts.newVersion;

  return getPackageMetadata()
    .flatMap(function(packageMetadata) {
      var topLevelDir = packageMetadata.topLevelDir;
      var packageJsonPath = packageMetadata.packageJsonPath;
      var jsonFiles = opts.jsonFiles || packageMetadata.jsonFiles;

      return Rx.Observable.if(
          function() {
            return jsonFiles;
          },
          // if jsonFiles provided
          Rx.Observable.return(jsonFiles),
          // otherwise, ask user to specify jsonFiles
          Rx.Observable.return(packageMetadata.version)
            .flatMap(getNewVersion)
        )


      return Rx.Observable.if(
          function() {
            return newVersion;
          },
          // if new version provided, use it
          Rx.Observable.return(newVersion),
          // otherwise, get old version and ask how to bump it
          Rx.Observable.return(packageMetadata.version)
            .flatMap(getNewVersion)
        )
        .flatMap(function(newVersion) {
          // TODO skip everything if the newVersion === oldVersion

          // TODO is there a better way to get the absolute filepath without
          // this kludge of assuming npm-fstream will always use '/package/'?
          var genericPackageDirPathStubLength = '/package/'.length;

          var fnEmitter = FN({path: topLevelDir});
          // TODO what's the difference between 'child' and 'entry' events?
          var entries = Rx.Observable.fromEvent(fnEmitter, 'entry');
          var end = Rx.Observable.fromEvent(fnEmitter, 'end');

          return Rx.Observable.forkJoin(
            jsonFiles.map(function(file) {
              function updater(o) {
                return o.let(rxJSONStream.parse(true))
                  .map(function(metadataFileJson) {
                    metadataFileJson[file.key] = newVersion;
                    return JSON.stringify(metadataFileJson, null, '  ');
                  });
              }
              return updateFileLines(file.filepath, updater);
            })
          )
          .concat(
            entries
              .takeUntil(end)
              .map(function(entry) {
                var cutPoint = entry.root.dirname.length + genericPackageDirPathStubLength;
                var relativeFilepath = entry.path.substr(cutPoint);
                return path.resolve(topLevelDir, relativeFilepath);
              })
              .toArray()
              .concatMap(function(include) {
                return bumpFilesByFindAndReplace(newVersion, topLevelDir, {
                  include: include,
                  exclude: jsonFiles
                    .map(function(file) {
                      return file.filepath;
                    }),
                  // TODO read these from package.json as
                    // .semverInFileTextBumper: {
                    //   include: [],
                    //   exclude: [],
                    //   excludeDir: []
                    // }
                    //
                    // If the entry is not in package.json,
                    // prompt the user to specify whether the
                    // change should happen just this once or
                    // always.
                    //
                    // Also, create a command to allow the user
                    // to save their settings.
                  excludeDir: [
                      './lib',
                      './test'
                    ]
                    .map(function(filepath) {
                      return path.resolve(topLevelDir, filepath);
                    })
                });
              })
          );
        });
    });
};

module.exports = semverInFileTextBumper;
