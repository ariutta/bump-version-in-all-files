'use strict';
var inquirer = require('inquirer');
var resolveFrom = require('resolve-from');
var Rx = require('rx');
var RxNode = require('rx-node');
var semver = require('semver');

// ordered by how they are read (major.minor.patch)
var versionNumberTypes = ['major', 'minor', 'patch'];
// ordered chronologically
var prereleaseTypes = ['alpha', 'beta', 'rc'];

semver.prereleaseTag = function(version) {
  var prereleaseTagRegexResult = version.match(/(-)(\w*\.?\d*)/);
  var prereleaseTag;
  if (!!prereleaseTagRegexResult && prereleaseTagRegexResult.length > 2) {
    prereleaseTag = prereleaseTagRegexResult[2];
  }
  return prereleaseTag;
};

semver.parse = function(version) {
  var major = semver.major(version);
  var minor = semver.minor(version);
  var patch = semver.patch(version);
  var prereleaseTag = semver.prereleaseTag(version);
  return {
    major: major,
    minor: minor,
    patch: patch,
    prereleaseTag: prereleaseTag
  };
};

semver.stripPreleaseTag = function(version) {
  var parsed = semver.parse(version);
  return versionNumberTypes
    .map(function(versionNumberType) {
      return parsed[versionNumberType];
    })
    .join('.');
};

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
  // TODO this is just for testing below
  var oldVersion = '2.0.1-rc.0';
  var oldVersionPrereleaseTag = semver.prereleaseTag(oldVersion);
  var oldVersionSanPrereleaseTag = semver.stripPreleaseTag(oldVersion);

  var revisionTypeQuestions = {
    type: 'list',
    name: 'revisionType',
    message: 'Choose a version type below.',
    choices: [{
      name: 'build: just re-building (no code changes -- version stays unchanged)',
      short: 'build',
      value: oldVersion
    }, {
      name: 'patch: bug fixes (backwards-compatible)',
      short: 'patch',
      value: semver.inc(oldVersion, 'patch')
    }, {
      name: 'minor: additions to API (backwards-compatible)',
      short: 'minor',
      value: semver.inc(oldVersion, 'minor')
    }, {
      name: 'major: changes break API (backwards-INCOMPATIBLE)',
      short: 'major',
      value: semver.inc(oldVersion, 'major')
    }],
    default: 0
  };

  if (oldVersionPrereleaseTag) {
    var parsedOldVersion = semver.parse(oldVersion);
    // least significant revision with a non-zero version number.
    var oldVersionSmallestRevisionType = versionNumberTypes
      .filter(function(versionNumberType) {
        return parsedOldVersion[versionNumberType] !== 0;
      })
      .pop();
    var versionNumberIndex = versionNumberTypes.indexOf(oldVersionSmallestRevisionType);

    var prereleaseTypeRegexResults = oldVersionPrereleaseTag.match(/\w+/);
    var prereleaseType = !!prereleaseTypeRegexResults && prereleaseTypeRegexResults.length > 0 &&
      prereleaseTypeRegexResults[0];
    var prereleaseIndex = prereleaseTypes.indexOf(prereleaseType);
    revisionTypeQuestions.choices = [{
      name: 'alpha: just proof of concept/exploration level',
      short: 'alpha'
    }, {
      name: 'beta: API changes avoided but still possible. No known show-stopper bugs.',
      short: 'beta'
    }, {
      name: 'rc (release-candidate): API frozen. No known show-stopper bugs.',
      short: 'rc'
    }]
    .filter(function(choice) {
      var short = choice.short;
      var choicePrereleaseIndex = prereleaseTypes.indexOf(short);
      return choicePrereleaseIndex >= prereleaseIndex;
    })
    .map(function(choice) {
      var short = choice.short;
      var name = choice.name;
      var updatedVersion = semver.inc(oldVersion, 'prerelease', prereleaseType);
      choice.value = updatedVersion;
      if (short === prereleaseType) {
        choice.name = 'continue pre-' + oldVersionSmallestRevisionType + ': ' +
          'stay in prerelease, incrementing from ' + oldVersion + ' to ' + updatedVersion;
      } else {
        updatedVersion = semver.inc(oldVersion, 'prerelease', prereleaseType);
        var choicePrereleaseIndex = prereleaseTypes.indexOf(short);
        if (choicePrereleaseIndex > prereleaseIndex) {
          choice.name = 'bump up to ' + name;
        }
      }
      return choice;
    })
    .concat(revisionTypeQuestions.choices
              .map(function(choice) {
                var short = choice.short;
                var name = choice.name;
                if (oldVersionSmallestRevisionType === short && prereleaseType === 'rc') {
                  choice.name = 'go to production: upgrade current prerelease ' +
                    short + ' revision from ' +
                    oldVersion + ' to ' + oldVersionSanPrereleaseTag;
                  choice.value = oldVersionSanPrereleaseTag;
                } else {
                  choice.name = 'new ' + name;
                  if (versionNumberTypes.indexOf(short) > -1) {
                    choice.value = semver.inc(oldVersion, short);
                  }
                }
                return choice;
              })
              .filter(function(choice) {
                var short = choice.short;
                var choiceVersionNumberIndex = versionNumberTypes.indexOf(short);
                return versionNumberIndex > choiceVersionNumberIndex;
              })
    );
  }

  console.log('revisionTypeQuestions');
  console.log(revisionTypeQuestions);

  createPromptObservable(revisionTypeQuestions)
    .flatMap(function(versionNumberAnswers) {
      var versionNumber = versionNumberAnswers.revisionType;
      if (versionNumber === oldVersion) {
        console.warn('Warning: npm does not support semver build numbers. ' +
                     'Keeping version unchanged at ' + oldVersion + '.');
        return Rx.Observable.return(oldVersion);
      } else if (versionNumber !== semver.stripPreleaseTag(versionNumber)) {
        return Rx.Observable.return(versionNumber);
      } else {
        var prereleaseQuestion = {
          type: 'list',
          name: 'prerelease',
          message: 'Is this a prerelease (version is unstable and might ' +
                   'not satisfy the intended compatibility requirements)?',
          choices: [{
            name: 'No',
            value: false
          }, {
            name: 'Yes: alpha (just proof of concept/exploration level)',
            short: 'alpha',
            value: 'alpha'
          }, {
            name: 'Yes: beta (API changes possible but to be avoided. No known show-stopper bugs.)',
            short: 'beta',
            value: 'beta'
          }, {
            name: 'Yes: rc (release-candidate: API frozen. No known show-stopper bugs.)',
            short: 'rc',
            value: 'rc'
          }],
          default: 0
        };

        return createPromptObservable(prereleaseQuestion)
          .map(function(prereleaseAnswers) {
            var prerelease = prereleaseAnswers.prerelease;
            console.log('prerelease');
            console.log(prerelease);
            var updatedVersion;
            if (prerelease) {
              updatedVersion = semver.inc(versionNumber, 'prerelease', prerelease);
            } else {
              updatedVersion = versionNumber;
            }
            return updatedVersion;
          });
      }
    })
    /*
    .flatMap(function(revisionTypeAnswers) {
      var revisionType = revisionTypeAnswers.revisionType;
      if (revisionType === 'build') {
        console.warn('Warning: npm does not support semver build numbers. ' +
                     'Keeping version unchanged at ' + oldVersion + '.');
        return Rx.Observable.return(oldVersion);
      } else if (prereleaseTypes.indexOf(revisionType) > -1) {
        return Rx.Observable.return(semver.inc(oldVersion, 'prerelease', revisionType));
      } else if (revisionType === oldVersionSmallestRevisionType) {
        return Rx.Observable.return(semver.inc(oldVersion, revisionType));
      } else {
        var prereleaseQuestion = {
          type: 'list',
          name: 'prerelease',
          message: 'Is this a prerelease (version is unstable and might ' +
                   'not satisfy the intended compatibility requirements)?',
          choices: [{
            name: 'No',
            value: false
          }, {
            name: 'Yes: alpha (just proof of concept/exploration level)',
            short: 'alpha',
            value: 'alpha'
          }, {
            name: 'Yes: beta (API changes possible but to be avoided. No known show-stopper bugs.)',
            short: 'beta',
            value: 'beta'
          }, {
            name: 'Yes: rc (release-candidate: API frozen. No known show-stopper bugs.)',
            short: 'rc',
            value: 'rc'
          }],
          default: 0
        };

        return createPromptObservable(prereleaseQuestion)
          .map(function(prereleaseAnswers) {
            var prerelease = prereleaseAnswers.prerelease;
            console.log('prerelease');
            console.log(prerelease);
            var updatedVersion;
            if (prerelease) {
              updatedVersion = semver.inc(oldVersion, 'prerelease', prerelease);
            } else {
              updatedVersion = semver.inc(oldVersionSanPrereleaseTag, revisionType);
            }
            return updatedVersion;
          });
      }
    })
    //*/
    .subscribe(function(updatedVersion) {
      console.log('updated from ' + oldVersion + ' to ' + updatedVersion);
    }, function(err) {
      throw err;
    });

    /*
    Rx.Observable.create(inquirer.prompt({
      type: "list",
      name: "chocolate",
      message: "What's your favorite chocolate?",
      choices: [ "Mars", "Oh Henry", "Hershey" ]
    }, function( answers ) {
      console.log('answers');
      console.log(answers);
      inquirer.prompt({
        type: "list",
        name: "reason",
        message: "why do you like " + answers.chocolate + "?",
        choices: [ "taste", "price", "cool" ]
      });
    }));
    //*/

    /*
    .concatMap(function(revisionType) {
      console.log('revisionType');
      console.log(revisionType);
      //return Rx.Observable.return(revisionType);
      //*
      var prereleaseSource = inquirer.prompt(Rx.Observable.return({
        type: 'list',
        name: 'prerelease',
        message: 'Is this a prerelease (version is unstable and might ' +
                 'not satisfy the intended compatibility requirements)?',
        choices: [{
            name: 'No',
            value: false
          }, {
            name: 'Yes: alpha (just proof of concept/exploration level)',
            short: 'alpha',
            value: 'alpha'
          }, {
            name: 'Yes: beta (API changes possible but to be avoided. No known show-stopper bugs.)',
            short: 'beta',
            value: 'beta'
          }, {
            name: 'Yes: rc (release-candidate: API frozen. No known show-stopper bugs.)',
            short: 'rc',
            value: 'rc'
        }],
        default: 0
      }));

      return prereleaseSource;

      //*
      var revisionTypeSource = Rx.Observable.return({
        revisionType: revisionType
      });
      //*/

      /*
      if (revisionType === 'build') {
        return revisionTypeSource;
      } else {
        return revisionTypeSource.concat(prereleaseSource);
      }
      //*/
    //*/

  /*
  var prompts = Rx.Observable.create(function(obs) {
    obs.onNext({
      type: 'list',
      name: 'prerelease',
      message: 'Is this a prerelease (version is unstable and might ' +
               'not satisfy the intended compatibility requirements)?',
      choices: [{
        name: 'No',
        value: false
      }, {
        name: 'Yes: alpha (just proof of concept/exploration level)',
        short: 'alpha',
        value: 'alpha'
      }, {
        name: 'Yes: beta (API changes possible but to be avoided. No known show-stopper bugs.)',
        short: 'beta',
        value: 'beta'
      }, {
        name: 'Yes: rc (release-candidate: API frozen. No known show-stopper bugs.)',
        short: 'rc',
        value: 'rc'
      }],
      default: 0
    });

    setTimeout(function() {
      obs.onNext({
        type: 'list',
        name: 'revisionType',
        message: 'Choose a version type below.',
        choices: [{
          name: 'build: just re-building (no code changes)',
          short: 'build',
          value: 'build'
        }, {
          name: 'patch: bug fixes (backwards-compatible)',
          short: 'patch',
          value: 'patch'
        }, {
          name: 'minor: additions to API (backwards-compatible)',
          short: 'minor',
          value: 'minor'
        }, {
          name: 'major: changes break API (backwards-INCOMPATIBLE)',
          short: 'major',
          value: 'major'
        }],
        default: 0
      });
      obs.onCompleted();
    });
  });
  //*/

  /*
  var prompts = Rx.Observable.create(function(obs) {
    obs.onNext({
    type: 'list',
    name: 'revisionType',
    message: 'Choose a version type below.',
    choices: [{
      name: 'build: just re-building (no code changes)',
      short: 'build',
      value: 'build'
    }, {
      name: 'patch: bug fixes (backwards-compatible)',
      short: 'patch',
      value: 'patch'
    }, {
      name: 'minor: additions to API (backwards-compatible)',
      short: 'minor',
      value: 'minor'
    }, {
      name: 'major: changes break API (backwards-INCOMPATIBLE)',
      short: 'major',
      value: 'major'
    }],
    default: 0
  });
    setTimeout(function() {
      obs.onNext({
        type: 'list',
        name: 'prerelease',
        message: 'Is this a prerelease (version is unstable and might ' +
                 'not satisfy the intended compatibility requirements)?',
        choices: [{
          name: 'No',
          value: false
        }, {
          name: 'Yes: alpha (just proof of concept/exploration level)',
          short: 'alpha',
          value: 'alpha'
        }, {
          name: 'Yes: beta (no known show-stopper bugs; API changes possible but not expected)',
          short: 'beta',
          value: 'beta'
        }],
        default: 0
      });
      obs.onCompleted();
    });
  });
  //*/

 /*
  answers.process
    .subscribe(function(result) {
      console.log('result');
      console.log(result);
    }, function(err) {
      throw err;
    });
  /*
  inquirer.prompt(prompts).process
    .reduce(function(accumulator, currentValue) {
      accumulator[currentValue.name] = currentValue.answer;
      return accumulator;
    }, {})
    .subscribe(function(result) {
      var currentVersion = '2.0.0-0';
      console.log('result');
      console.log(result);
      var revisionType = result.revisionType;
      var prerelease = result.prerelease;
      var updatedVersion;
      if (revisionType === 'build') {
        if (prerelease) {
          updatedVersion = semver.inc(currentVersion, 'prerelease');
        } else {
          updatedVersion = semver.inc(currentVersion, 'patch');
        }
      } else {
        if (prerelease) {
          updatedVersion = semver.inc(currentVersion, revisionType, prerelease);
        } else {
          updatedVersion = semver.inc(currentVersion, revisionType);
        }
      }
      console.log('updated from ' + currentVersion + ' to ' + updatedVersion);
    }, function(err) {
      throw err;
    });

  //var promptSource = Rx.Observable.fromCallback(inquirer.prompt);

  /*
  var revisionTypeSource = promptSource({
    type: 'list',
    name: 'revisionType',
    message: 'Choose a version type below.',
    choices: ['patch', 'minor', 'major', 'prerelease', 'none']
  })
  .map(function(res) {
    return res.revisionType;
  });

  revisionTypeSource
  .subscribe(function(result) {
    console.log('result');
    console.log(result);
  }, function(err) {
    throw err;
  });

  /*
  var resultObservable = revisionTypeSource.map(function(revisionType) {
    console.log('revisionType');
    console.log(revisionType);
    if (revisionType === 'none') {
      return;
    }

    return gulp.src(metadataFiles)
      .pipe(bump({type: revisionType}))
      .pipe(gulp.dest('./'))
      .pipe(highland.pipeline(function(s) {
        return s.map(function(file) {
          return file.contents;
          // TODO we should be able to use something like this
          // to make this code simpler, but it's not working:
          //return file.pipe(JSONStream.parse('*'));
        })
        .head()
        .pipe(JSONStream.parse())
        // This is needed to turn the stream into a highland stream
        .pipe(highland.pipeline())
        .flatMap(function(newPackageJson) {

          // TODO do we need to pollute the global namespace?
          global.newPackageJson = newPackageJson;

          var version = {};
          version.old = oldPackageJson.version;
          version.new = newPackageJson.version;
          console.log('files bumping from ' + version.old + ' to ' + version.new);

          function replaceVersionedName() {
            return replace({
              regex: oldPackageJson.name + '-\\d+\\.\\d+\\.\\d+',
              replace: oldPackageJson.name + '-' + version.new
            });
          }

          // TODO how can we use a dest that just matches where
          // the file was found?
          return highland(gulp.src([
            'README.md'
          ])
          .pipe(replaceVersionedName())
          .pipe(gulp.dest('./'))
          )
          .concat(
            gulp.src([
              './test/*.html'
            ])
            .pipe(replaceVersionedName())
            .pipe(gulp.dest('./test/'))
          )
          .concat(
            gulp.src([
              './demo/*.html'
            ])
            .pipe(replaceVersionedName())
            .pipe(gulp.dest('./demo/'))
          )
          .concat(
            // gulp-bump does not update the dist file name
            gulp.src(metadataFiles)
            .pipe(replaceVersionedName())
            .pipe(gulp.dest('./'))
          );
        });
    }));
  })
  .doOnError(function(err) {
    clearCache();
    throw new Error('error', new gutil.PluginError('bumpVersionNumberInAllFiles', err, {
      stack: err.stack,
      showStack: true
    }));
  }));

  RxNode.writeToStream(resultObservable, stream);
  //*/
}

bumpVersionInAllFiles();

module.exports = bumpVersionInAllFiles;
