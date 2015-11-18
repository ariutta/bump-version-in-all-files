/**
 * Test Prompt public APIs
 */

var bddStdin = require('bdd-stdin');
var getNewVersion = require('../../get-new-version.js');
var expect = require('chai').expect;
var sinon = require('sinon');
var _ = require('lodash');
var inquirer = require('inquirer');
var Rx = require('rx');

var semver = require('semver');

var bumpOptions = [{
  oldVersion: '2.0.0-alpha.2',
  revisionType: 'build',
  bddStdinBound: bddStdin.bind(null, '\n'),
  expectedNewVersion: '2.0.0-alpha.2'
}, {
  oldVersion: '2.0.0-alpha.2',
  revisionType: 'alpha',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.0-alpha.3'
}, {
  oldVersion: '2.0.0-alpha.2',
  revisionType: 'beta',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.0-beta.0'
}, {
  oldVersion: '2.0.0-alpha.2',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.0-rc.0'
}, {
  oldVersion: '2.0.0-beta.0',
  revisionType: 'build',
  bddStdinBound: bddStdin.bind(null, '\n'),
  expectedNewVersion: '2.0.0-beta.0'
}, {
  oldVersion: '2.0.0-beta.0',
  revisionType: 'beta',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.0-beta.1'
}, {
  oldVersion: '2.0.0-beta.0',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.0-rc.0'
}, {
  oldVersion: '2.0.0-rc.1',
  revisionType: 'build',
  bddStdinBound: bddStdin.bind(null, '\n'),
  expectedNewVersion: '2.0.0-rc.1'
}, {
  oldVersion: '2.0.0-rc.1',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.0-rc.2'
}, {
  oldVersion: '2.0.0',
  revisionType: 'build/production',
  bddStdinBound: bddStdin.bind(null,
                               '\n',
                               '\n'),
  expectedNewVersion: '2.0.0'
}, {
  oldVersion: '2.0.0',
  revisionType: 'alpha',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, '\n',
                               bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.1-alpha.0'
}, {
  oldVersion: '2.0.0',
  revisionType: 'beta',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, '\n',
                               bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.1-beta.0'
}, {
  oldVersion: '2.0.0',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, '\n',
                               bddStdin.keys.down, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.1-rc.0'
}, {
  oldVersion: '2.0.0',
  revisionType: 'patch/production',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, '\n',
                               '\n'),
  expectedNewVersion: '2.0.1'
}, {
  oldVersion: '2.0.0',
  revisionType: 'minor/production',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, bddStdin.keys.down, '\n',
                               '\n'),
  expectedNewVersion: '2.1.0'
}, {
  oldVersion: '2.0.0',
  revisionType: 'major/production',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, bddStdin.keys.down, bddStdin.keys.down, '\n',
                               '\n'),
  expectedNewVersion: '3.0.0'
}, {
  oldVersion: '2.0.10-alpha.0',
  revisionType: 'build',
  bddStdinBound: bddStdin.bind(null, '\n'),
  expectedNewVersion: '2.0.10-alpha.0'
}, {
  oldVersion: '2.0.10-alpha.0',
  revisionType: 'alpha',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.10-alpha.1'
}, {
  oldVersion: '2.0.10-alpha.0',
  revisionType: 'beta',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.10-beta.0'
}, {
  oldVersion: '2.0.10-alpha.0',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.10-rc.0'
}, {
  oldVersion: '2.0.10-beta.21',
  revisionType: 'build',
  bddStdinBound: bddStdin.bind(null, '\n'),
  expectedNewVersion: '2.0.10-beta.21'
}, {
  oldVersion: '2.0.10-beta.21',
  revisionType: 'beta',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.10-beta.22'
}, {
  oldVersion: '2.0.10-beta.21',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.10-rc.0'
}, {
  oldVersion: '2.0.10-rc.0',
  revisionType: 'build',
  bddStdinBound: bddStdin.bind(null, '\n'),
  expectedNewVersion: '2.0.10-rc.0'
}, {
  oldVersion: '2.0.10-rc.0',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.0.10-rc.1'
}, {
  oldVersion: '2.0.10',
  revisionType: 'patch/production',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, '\n',
                               '\n'),
  expectedNewVersion: '2.0.11'
}, {
  oldVersion: '2.0.10',
  revisionType: 'minor/production',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, bddStdin.keys.down, '\n',
                               '\n'),
  expectedNewVersion: '2.1.0'
}, {
  oldVersion: '2.0.10',
  revisionType: 'major/production',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, bddStdin.keys.down, bddStdin.keys.down, '\n',
                               '\n'),
  expectedNewVersion: '3.0.0'
}, {
  oldVersion: '2.1.0-alpha.0',
  revisionType: 'build',
  bddStdinBound: bddStdin.bind(null, '\n'),
  expectedNewVersion: '2.1.0-alpha.0'
}, {
  oldVersion: '2.1.0-alpha.0',
  revisionType: 'alpha',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.1.0-alpha.1'
}, {
  oldVersion: '2.1.0-alpha.0',
  revisionType: 'beta',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.1.0-beta.0'
}, {
  oldVersion: '2.1.0-alpha.0',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.1.0-rc.0'
}, {
  oldVersion: '2.1.0-beta.0',
  revisionType: 'build',
  bddStdinBound: bddStdin.bind(null, '\n'),
  expectedNewVersion: '2.1.0-beta.0'
}, {
  oldVersion: '2.1.0-beta.0',
  revisionType: 'beta',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.1.0-beta.1'
}, {
  oldVersion: '2.1.0-beta.0',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.1.0-rc.0'
}, {
  oldVersion: '2.1.0-rc.0',
  revisionType: 'build',
  bddStdinBound: bddStdin.bind(null, '\n'),
  expectedNewVersion: '2.1.0-rc.0'
}, {
  oldVersion: '2.1.0-rc.10',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.1.0-rc.11'
}, {
  oldVersion: '2.1.0',
  revisionType: 'alpha',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, '\n',
                               bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.1.1-alpha.0'
}, {
  oldVersion: '2.1.0',
  revisionType: 'beta',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, '\n',
                               bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.1.1-beta.0'
}, {
  oldVersion: '2.1.0',
  revisionType: 'rc',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, '\n',
                               bddStdin.keys.down, bddStdin.keys.down, bddStdin.keys.down, '\n'),
  expectedNewVersion: '2.1.1-rc.0'
}, {
  oldVersion: '2.1.0',
  revisionType: 'patch/production',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, '\n',
                               '\n'),
  expectedNewVersion: '2.1.1'
}, {
  oldVersion: '2.1.0',
  revisionType: 'minor/production',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, bddStdin.keys.down, '\n',
                               '\n'),
  expectedNewVersion: '2.2.0'
}, {
  oldVersion: '2.1.0',
  revisionType: 'major/production',
  bddStdinBound: bddStdin.bind(null,
                               bddStdin.keys.down, bddStdin.keys.down, bddStdin.keys.down, '\n',
                               '\n'),
  expectedNewVersion: '3.0.0'
}];

function run(bumpOption) {
  var oldVersion = bumpOption.oldVersion;
  var revisionType = bumpOption.revisionType;
  var expectedNewVersion = bumpOption.expectedNewVersion;
  it('should bump ' + oldVersion + ' to ' + expectedNewVersion + ' for a new ' + revisionType, function(done) {
    bumpOption.bddStdinBound();
    getNewVersion(oldVersion)
      .first()
      .subscribe(function(result) {
        expect(result).to.equal(bumpOption.expectedNewVersion);
        done();
      }, done);
  });
}

// Run tests
describe('Public API', function() {
  _.each(bumpOptions, function(bumpOption) {
    run(bumpOption);
  }, this);
});
