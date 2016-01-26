// semver-bumper-for-file-text/index.js
// Update bower.json, component.json, package.json,
// README.md, etc., all with one command

'use strict';
require('pretty-error').start();
var _ = require('lodash');
var colors = require('colors');
var fileLineUpdater = require('./file-line-updater.js');
var FN = require('fstream-npm');
var getNewVersion = require('semver-inc-wizard');
var inquirer = require('inquirer');
var path = require('path');
var RxNode = require('rx-node-extra');
var Rx = RxNode.Rx;
var RxFs = require('rx-fs');
var rxJSONStream = require('rx-json-stream');
var semverBumperByFindAndReplace = require('./semver-bumper-by-find-and-replace.js');
var VError = require('verror');

var bumpByFindAndReplace = semverBumperByFindAndReplace.bump;

function getGrepOptionsPrompts() {
  var includeQuestion = {
    type: 'text',
    name: 'include',
    message: 'Specify files to include, separated by commas, e.g.:\n' +
          '  \t./docs/README.md,./config/config.txt\n'
  };

  var excludeQuestion = {
    type: 'text',
    name: 'exclude',
    message: 'Specify files to exclude, separated by commas, e.g.:\n' +
          '  \t./config.js\n'
  };

  var excludeDirQuestion = {
    type: 'text',
    name: 'excludeDir',
    message: 'Specify directories to exclude, separated by commas, e.g.:\n' +
          '  \t./bower_components,./dist,./docs,./gulp,./jspm_packages,./lib,./test,./tmp\n'
  };

  return [
    includeQuestion,
    excludeQuestion,
    excludeDirQuestion
  ];
}

// Would be more accurate to name it "getJsonFilepathsPrompts"
function getJsonFilesPrompts() {
  var presetQuestion = {
    type: 'checkbox',
    name: 'presetJsonFiles',
    message: 'Select the JSON file(s) in your project that contain version metadata:',
    choices: [{
      name: 'package.json',
      checked: true
    }, {
      name: 'bower.json'
    }, {
      name: 'component.json'
    }],
    default: 0
  };

  var otherQuestion = {
    type: 'text',
    name: 'otherJsonFiles',
    message: 'Any other JSON file(s) with version metadata?\n' +
          '  \tYES: specify as "filepath,versionkey;filepath,versionkey", e.g.:\n' +
          '  \t      ./myfile1.json,version;./config/myfile1.json,revision\n' +
          '  \tNO: just hit "Enter"\n'
  };

  return [presetQuestion, otherQuestion];
}

function splitStringAndSetAsPropertyValue(accumulator, name, value) {
  var items;
  if (!!value) {
    items = value.split(',');
  } else {
    items = [];
  }
  accumulator[name] = items;
  return accumulator;
}

function formatSemverBumperAnswers(answers, starter) {
  starter = starter || {jsonFiles: [], grepOptions: {}};
  var answerNameToSemverBumperKeyMappings = {
    presetJsonFiles: 'jsonFiles',
    otherJsonFiles: 'jsonFiles',
    include: 'grepOptions',
    exclude: 'grepOptions',
    excludeDir: 'grepOptions'
  };

  var answerNameToSemverBumperHandlerMappings = {
    jsonFiles: {
      presetJsonFiles: function(jsonFiles, name, filepaths) {
        if (_.isEmpty(filepaths)) {
          return jsonFiles;
        }

        return jsonFiles.concat(
          filepaths
            .map(function(filepath) {
              return {
                filepath: filepath,
                key: presetJsonFileNameToVersionKeyMappings[filepath]
              };
            })
        );
      },
      otherJsonFiles: function(jsonFiles, name, value) {
        if (!value) {
          return jsonFiles;
        }

        return jsonFiles.concat(
          value
            .split(';')
            .map(function(x) {
              var keyValue = x.split(',');
              return {
                filepath: keyValue[0],
                key: keyValue[1]
              };
            })
        );
      }
    },
    grepOptions: {
      include: splitStringAndSetAsPropertyValue,
      exclude: splitStringAndSetAsPropertyValue,
      excludeDir: splitStringAndSetAsPropertyValue
    }
  };

  var presetJsonFileNameToVersionKeyMappings = {
    'package.json': 'version',
    'bower.json': 'version',
    'component.json': 'version'
  };

  return _.pairs(answers)
    .reduce(function(accumulator, pair) {
      var name = pair[0];
      var value = pair[1];
      var key = answerNameToSemverBumperKeyMappings[name];
      var handler = answerNameToSemverBumperHandlerMappings[key][name];
      accumulator[key] = handler(accumulator[key], name, value);
      return accumulator;
    }, starter);
}

function getSemverBumperSettings(semverBumperSettings) {
  var jsonFiles = semverBumperSettings.jsonFiles;
  var grepOptions = semverBumperSettings.grepOptions;

  if (jsonFiles && grepOptions) {
    return Rx.Observable.return(semverBumperSettings);
  } else if (jsonFiles) {
    return Rx.Observable.return(jsonFiles)
      .ask(getGrepOptionsPrompts, function(x) {return [x];})
      .doOnError(function(err) {
        var newError = new VError(err, 'Error getting grep options in getSemverBumperSettings');
        console.error(newError.stack);
      })
      .map(function(valueAndAnswers) {
        var starter = {
          jsonFiles: valueAndAnswers.value,
          grepOptions: {}
        };
        return formatSemverBumperAnswers(valueAndAnswers.answers, starter);
      });
  } else if (grepOptions) {
    return Rx.Observable.return(grepOptions)
      .ask(getJsonFilesPrompts, function(x) {return [x];})
      .doOnError(function(err) {
        var newError = new VError(err, 'Error getting JSON files in getSemverBumperSettings');
        console.error(newError.stack);
      })
      .map(function(valueAndAnswers) {
        var starter = {
          jsonFiles: {},
          grepOptions: valueAndAnswers.value
        };
        return formatSemverBumperAnswers(valueAndAnswers.answers, starter);
      });
  } else {
    return RxNode.ask(function() {
      return getJsonFilesPrompts().concat(getGrepOptionsPrompts());
    })
      .doOnError(function(err) {
        var newError = new VError(err, 'Error in getSemverBumperSettings');
        console.error(newError.stack);
      })
      .map(formatSemverBumperAnswers);
  }
}

function getPackageMetadata() {
  var cwd = process.cwd();
  var npmPackageFilepath = path.join(cwd, '/package.json');

  return RxFs.stat(npmPackageFilepath)
    .doOnError(function(err) {
      var message;
      if (err.code === 'ENOENT') {
        message = 'Error: no package.json found. ' +
          'Create a package.json file or move to ' +
          'the directory where package.json is located and try again.\n';
      } else {
        message = 'Error with RxFs.stat in getPackageMetadata';
      }
      var newError = new VError(err, message);
      console.error(newError.stack);
    })
    .concatMap(function(stat) {
      // We actually ignore stat this point, because if we get it without
      // any errors being thrown, we know the file exists.
      return RxFs.createReadObservable(npmPackageFilepath, {
          flags: 'r'
        })
        .let(rxJSONStream.parse())
        .map(function(npmPackage) {
          return {
            npmPackage: npmPackage,
            npmPackageFilepath: npmPackageFilepath,
            cwd: cwd
          };
        });
    })
    .doOnError(function(err) {
      var newError = new VError(err, 'Error with getPackageMetadata');
      console.error(newError.stack);
    });
}

function bump(opts) {
  opts = opts || {};
  var newVersion = opts.newVersion;

  return getPackageMetadata()
    .concatMap(function(packageMetadata) {
      var cwd = packageMetadata.cwd;
      var npmPackageFilepath = packageMetadata.npmPackageFilepath;
      var npmPackage = packageMetadata.npmPackage;
      npmPackage.semverBumper = npmPackage.semverBumper || {};
      var jsonFiles = opts.jsonFiles || npmPackage.semverBumper.jsonFiles;

      return Rx.Observable.if(
          function() {
            return newVersion;
          },
          // if new version provided, use it
          Rx.Observable.return(newVersion),
          // otherwise, get old version and ask how to bump it
          Rx.Observable.return(npmPackage.version)
            .concatMap(getNewVersion)
        )
        .concatMap(function(newVersion) {
          if (newVersion && (newVersion === npmPackage.version)) {
            // skip everything if the version is unchanged.
            return Rx.Observable.empty();
          }

          // TODO is there a better way to get the absolute filepath without
          // this kludge of assuming npm-fstream will always use '/package/'
          // as a placeholder for the actual directory name?
          var genericPackageDirPathStubLength = '/package/'.length;

          var fnEmitter = FN({path: cwd});
          // TODO what's the difference between 'child' and 'entry' events?
          var entries = Rx.Observable.fromEvent(fnEmitter, 'entry');
          var end = Rx.Observable.fromEvent(fnEmitter, 'end');

          return Rx.Observable.zip(
            entries
              .takeUntil(end)
              .map(function(entry) {
                var cutPoint = entry.root.dirname.length + genericPackageDirPathStubLength;
                var relativeFilepath = entry.path.substr(cutPoint);
                return path.resolve(cwd, relativeFilepath);
              })
              .toArray(),
            getSemverBumperSettings(npmPackage.semverBumper)
          )
          .concatMap(function(pair) {
            var npmInclude = pair[0];
            var semverBumperSettings = pair[1];
            npmPackage.semverBumper = semverBumperSettings;
            var grepOptions = semverBumperSettings.grepOptions;
            var jsonFiles = semverBumperSettings.jsonFiles;

            var include = grepOptions.include.map(function(filepath) {
              return path.resolve('', filepath);
            });
            var exclude = grepOptions.exclude.map(function(filepath) {
              return path.resolve('', filepath);
            });
            // NOTE: grep-observable does not support glob patterns, so every one
            // of these will be actual directory paths.
            var excludeDir = grepOptions.excludeDir.map(function(dirpath) {
              return path.resolve('', dirpath);
            });
            var jsonFilepaths = jsonFiles.map(function(file) {
              return path.resolve('', file.filepath);
            });

            // still need to make the user inputs absolute for comparison here
            var mergedExclude = _.union(jsonFilepaths, exclude);

            // NOTE: We use union to merge the two "include" variables into one
            //       to be used as the grep "include" option.
            // NOTE: exclude trumps include, just like it does for egrep.
            var mergedInclude = _.difference(_.union(npmInclude, include), mergedExclude);

            var findAndReplaceSource = bumpByFindAndReplace(newVersion, cwd, {
              include: mergedInclude,
              exclude: mergedExclude
                .map(function(file) {
                  return file.filepath;
                }),
                // TODO read these from package.json as
                // .semverBumper: {
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
              excludeDir: excludeDir
            });

            var jsonFilesSource = Rx.Observable.from(jsonFiles)
              .concatMap(function(file) {
                var key = file.key;
                var filepath = file.filepath;

                function defaultUpdater(o) {
                  return o.let(rxJSONStream.parse(true))
                    .map(function(metadataFileJson) {
                      metadataFileJson[key] = newVersion;
                      return JSON.stringify(metadataFileJson, null, '  ');
                    });
                }

                var customUpdaters = {
                  'package.json': function(o) {
                    npmPackage[key] = newVersion;
                    var npmPackageString = JSON.stringify(npmPackage, null, '  ');
                    return o.last().map(function(x) {
                      return npmPackageString;
                    });
                  }
                };

                var updater = customUpdaters[filepath] || defaultUpdater;
                // TODO shouldn't this be called in a ".doOnNext()"?
                return fileLineUpdater.update(filepath, updater);
              });

            return Rx.Observable.merge(findAndReplaceSource, jsonFilesSource).defaultIfEmpty();
          })
          .doOnError(function(err) {
            var newError = new VError(err, 'Error bumping in semverBumperForFileText.bump');
            console.error(newError.stack);
          })
          .last()
          .map(function() {
            return colors.green('Bumped to ' + newVersion + '\n');
          });
        });
    })
    .doOnError(function(err) {
      var newError = new VError(err, 'Error in semverBumperForFileText.bump');
      console.error(newError.stack);
    });
}

function set(opts) {
  // TODO
  // set JSON files
  // set overrides from what npm includes/excludes:
  //   set files to include
  //   set files to exclude
  //   set dirs to exclude
  // set defaults for what should be done w/out prompting, e.g.:
  //          rel-filepath:line#:occurance#:line-code
  //   location: './README.md:80:2:4893',
  //
  //   the line code at the end could be the md5sum of the text (stripped of semvers),
  //   but why not use something small/easy like the sum of the
  //   charCodes of the text stripped of semvers?
  //   'pvjs-5.0.4-beta.21 is the latest commit of this project.'
  //     .replace(/jsVersionRe/g, '')
  //     .split('')
  //     .map(function(character) {
  //       return character
  //     })
  //     .reduce(function(acc, char) {
  //       return acc + char.charCodeAt();
  //     }, 0)
}

module.exports = {
  bump: bump,
  getSemverBumperSettings: getSemverBumperSettings,
  set: set
};
