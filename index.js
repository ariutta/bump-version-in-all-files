'use strict';
var inquirer = require('inquirer');
var resolveFrom = require('resolve-from');
var Rx = require('rx');
var RxNode = require('rx-node');
var semver = require('semver');

// ordered by how they are read (major.minor.patch)
var versionNumberTypes = ['major', 'minor', 'patch'];

var prereleaseTypeDetails = [{
  short: 'alpha',
  description: 'just proof of concept/exploration level'
}, {
  short: 'beta',
  description: 'API changes not expected but still possible. No known show-stopper bugs.'
}, {
  short: 'rc',
  description: 'release-candidate. API frozen. No known show-stopper bugs.'
}];

// ordered chronologically
var prereleaseTypes = prereleaseTypeDetails.map(function(prereleaseType) {
  return prereleaseType.short;
});

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
  // TODO these is just for testing below

  var oldVersion = '2.0.0-alpha.0';
  //var oldVersion = '2.0.0';

  //var oldVersion = '2.0.1';
  //var oldVersion = '2.0.1-rc.0';
  //var oldVersion = '2.0.1-alpha.0';

  //var oldVersion = '2.1.0';
  //var oldVersion = '2.1.0-alpha.0';

  var oldVersionPrereleaseTag = semver.prereleaseTag(oldVersion);
  var oldVersionSanPrereleaseTag = semver.stripPreleaseTag(oldVersion);

  var releaseTypeQuestions = {
    type: 'list',
    name: 'releaseType',
    message: 'Choose a version type below.',
    choices: [{
      name: 'build: just re-building (no code changes)',
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
    // least significant release with a non-zero version number.
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

    releaseTypeQuestions.choices = prereleaseTypeDetails.map(function(prereleaseTypeDetail) {
      var result = {};
      var short = prereleaseTypeDetail.short;
      var description = prereleaseTypeDetail.description;
      result.value = result.short = short;
      result.name = short + ': ' + description;
      return result;
    })
    .filter(function(choice) {
      var short = choice.short;
      var choicePrereleaseIndex = prereleaseTypes.indexOf(short);
      return choicePrereleaseIndex >= prereleaseIndex;
    })
    .map(function(choice) {
      var short = choice.short;
      var name = choice.name;
      var updatedVersion = semver.inc(oldVersion, 'prerelease', short);
      choice.value = updatedVersion;
      if (short === prereleaseType) {
        choice.name = 'continue pre-' + oldVersionSmallestRevisionType + ': ' +
          'stay in ' + short;
      } else {
        var choicePrereleaseIndex = prereleaseTypes.indexOf(short);
        if (choicePrereleaseIndex > prereleaseIndex) {
          choice.name = 'bump up to ' + name;
        }
      }
      return choice;
    })
    .concat(releaseTypeQuestions.choices
              .map(function(choice) {
                var short = choice.short;
                var name = choice.name;
                if (oldVersionSmallestRevisionType === short && prereleaseType === 'rc') {
                  choice.name = 'go to production: upgrade current prerelease ' + short;
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

  releaseTypeQuestions.choices = releaseTypeQuestions.choices.map(function(choice) {
    choice.name = choice.name + ' (' + oldVersion + ' -> ' + choice.value + ')';
    return choice;
  });

  createPromptObservable(releaseTypeQuestions)
    .flatMap(function(versionNumberAnswers) {
      var versionNumber = versionNumberAnswers.releaseType;
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
          }].concat(prereleaseTypeDetails.map(function(prereleaseTypeDetail) {
            var result = {};
            var short = prereleaseTypeDetail.short;
            var description = prereleaseTypeDetail.description;
            result.value = result.short = short;
            result.name = 'Yes - ' + short + ': ' + description;
            return result;
          })),
          default: 0
        };

        return createPromptObservable(prereleaseQuestion)
          .map(function(prereleaseAnswers) {
            var prerelease = prereleaseAnswers.prerelease;
            var updatedVersion;
            if (prerelease) {
              var releaseType = semver.diff(oldVersion, versionNumber);
              if (releaseType.indexOf('pre') === -1) {
                releaseType = 'pre' + releaseType;
              }
              updatedVersion = semver.inc(oldVersion, releaseType, prerelease);
            } else {
              updatedVersion = versionNumber;
            }
            return updatedVersion;
          });
      }
    })
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
    .concatMap(function(releaseType) {
      console.log('releaseType');
      console.log(releaseType);
      //return Rx.Observable.return(releaseType);
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
      var releaseTypeSource = Rx.Observable.return({
        releaseType: releaseType
      });
      //*/

      /*
      if (releaseType === 'build') {
        return releaseTypeSource;
      } else {
        return releaseTypeSource.concat(prereleaseSource);
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
        name: 'releaseType',
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
    name: 'releaseType',
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
      var releaseType = result.releaseType;
      var prerelease = result.prerelease;
      var updatedVersion;
      if (releaseType === 'build') {
        if (prerelease) {
          updatedVersion = semver.inc(currentVersion, 'prerelease');
        } else {
          updatedVersion = semver.inc(currentVersion, 'patch');
        }
      } else {
        if (prerelease) {
          updatedVersion = semver.inc(currentVersion, releaseType, prerelease);
        } else {
          updatedVersion = semver.inc(currentVersion, releaseType);
        }
      }
      console.log('updated from ' + currentVersion + ' to ' + updatedVersion);
    }, function(err) {
      throw err;
    });

  //var promptSource = Rx.Observable.fromCallback(inquirer.prompt);

  /*
  var releaseTypeSource = promptSource({
    type: 'list',
    name: 'releaseType',
    message: 'Choose a version type below.',
    choices: ['patch', 'minor', 'major', 'prerelease', 'none']
  })
  .map(function(res) {
    return res.releaseType;
  });

  releaseTypeSource
  .subscribe(function(result) {
    console.log('result');
    console.log(result);
  }, function(err) {
    throw err;
  });

  /*
  var resultObservable = releaseTypeSource.map(function(releaseType) {
    console.log('releaseType');
    console.log(releaseType);
    if (releaseType === 'none') {
      return;
    }

    return gulp.src(metadataFiles)
      .pipe(bump({type: releaseType}))
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
