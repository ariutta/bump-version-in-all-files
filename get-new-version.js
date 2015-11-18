'use strict';
var inquirer = require('inquirer');
var Rx = require('rx');
var RxNode = require('rx-node');
var semver = require('semver');

// as they are read in a version number (major.minor.patch)
var versionNumberComponents = ['major', 'minor', 'patch'];

// ordered by how we want them to appear in the selection list. correspond to choice.short.
var revisionTypesByListOrder = ['build', 'alpha', 'beta', 'rc', 'patch', 'minor', 'major'];

var prereleaseTypeDetails = [{
  short: 'alpha',
  description: 'just proof of concept/exploration level.'
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
  return versionNumberComponents
    .map(function(versionNumberComponent) {
      return parsed[versionNumberComponent];
    })
    .join('.');
};

var createPromptObservable = Rx.Observable.fromCallback(inquirer.prompt);

function askPrerelease() {
  var prereleaseQuestion = {
    type: 'list',
    name: 'prerelease',
    message: 'Is this a prerelease (version is unstable and might ' +
             'not satisfy the intended compatibility requirements)?',
    choices: [{
      name: 'No, this is a production release.',
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

  return createPromptObservable(prereleaseQuestion);
}

function askReleaseType(oldVersion) {
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
    var oldVersionSmallestRevisionType = versionNumberComponents
      .filter(function(versionNumberComponent) {
        return parsedOldVersion[versionNumberComponent] !== 0;
      })
      .pop();
    var versionNumberIndex = versionNumberComponents.indexOf(oldVersionSmallestRevisionType);

    var prereleaseTypeRegexResults = oldVersionPrereleaseTag.match(/\w+/);
    var prereleaseType = !!prereleaseTypeRegexResults && prereleaseTypeRegexResults.length > 0 &&
      prereleaseTypeRegexResults[0];
    var prereleaseIndex = prereleaseTypes.indexOf(prereleaseType);

    releaseTypeQuestions.choices = releaseTypeQuestions.choices
      .map(function(choice) {
        var short = choice.short;
        var name = choice.name;
        if (oldVersionSmallestRevisionType === short && prereleaseType === 'rc') {
          choice.name = 'go to production: upgrade current prerelease ' + short;
          choice.value = oldVersionSanPrereleaseTag;
        } else {
          choice.name = 'new ' + name;
          if (versionNumberComponents.indexOf(short) > -1) {
            choice.value = semver.inc(oldVersion, short);
          }
        }
        return choice;
      })
      .filter(function(choice) {
        var short = choice.short;
        var choiceVersionNumberIndex = versionNumberComponents.indexOf(short);
        return versionNumberIndex > choiceVersionNumberIndex;
      })
      .concat(
          prereleaseTypeDetails.map(function(prereleaseTypeDetail) {
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
                choice.name = 'continue pre-' + oldVersionSmallestRevisionType +
                  ': bump up to ' + name;
              }
            }
            return choice;
          })
      )
      .sort(function(a, b) {
        var indexA = revisionTypesByListOrder.indexOf(a.short);
        var indexB = revisionTypesByListOrder.indexOf(b.short);
        return indexA > indexB;
      });
  }

  releaseTypeQuestions.choices = releaseTypeQuestions.choices.map(function(choice) {
    choice.name = choice.name + ' (' + oldVersion + ' -> ' + choice.value + ')';
    return choice;
  });

  return createPromptObservable(releaseTypeQuestions);
}

function bump(oldVersion, versionNumberAnswers) {
  var versionNumber = versionNumberAnswers.releaseType;
  if (versionNumber === oldVersion) {
    console.warn('Warning: npm does not support semver build numbers. ' +
                 'Keeping version unchanged at ' + oldVersion + '.');
    return Rx.Observable.return(oldVersion);
  } else if (versionNumber !== semver.stripPreleaseTag(versionNumber)) {
    return Rx.Observable.return(versionNumber);
  } else {
    return askPrerelease()
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
}

function getNewVersion(oldVersion) {
  return askReleaseType(oldVersion)
    .flatMap(bump.bind(null, oldVersion));
}

module.exports = getNewVersion;
