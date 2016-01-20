/**
 * Test Prompt public APIs
 */

// allow expect(...).to.be.false or ...to.be.true
/*jshint expr: true*/

var _ = require('lodash');
var bddStdin = require('bdd-stdin');
var expect = require('chai').expect;
var fileLineUpdater = require('../../lib/file-line-updater.js');
var fs = require('fs');
var grepObservable = require('../../lib/grep-observable.js');
var allGrepResults = require('../inputs/grep-results.json');
var path = require('path');
var RxNode = require('rx-node-extra');
var Rx = RxNode.Rx;
var RxFs = require('rx-fs');
var sinon = require('sinon');

var semverBumperByFindAndReplace = require('../../lib/semver-bumper-by-find-and-replace.js');

var commonBumpOptions = {
  newVersion: '2.3.0',
  filepath: path.resolve(__dirname, '..', 'inputs')
};

// Run tests
describe('Public API', function() {
  describe('create list of bumpable semvers & create prompt set for each one', function() {
    afterEach(function() {
      grepObservable.grep.restore();
    });

    var bumpOptions = {
      args: {
        include: ['sample-README.md', 'sample-OTHER.md', 'sub/sample-OTHER.md'],
        exclude: ['sample-package.json', 'ignore.md'],
        excludeDir: ['ignore']
      }
    };
    _.defaults(bumpOptions, commonBumpOptions);

    var newVersion = bumpOptions.newVersion;
    var filepath = bumpOptions.filepath;
    var args = bumpOptions.args;

    it('should create many', function() {
      sinon
        .stub(grepObservable, 'grep', function() {
          var allGrepResultsClone = _.cloneDeep(allGrepResults);
          return Rx.Observable.from(allGrepResultsClone);
        });
      var getPromptSet = semverBumperByFindAndReplace._getPromptSet;
      var createIterable = semverBumperByFindAndReplace._createIterable;

      var grepResults = _.cloneDeep(allGrepResults);

      var actualPromptSetCollection = _.pairs(_.groupBy(grepResults.map(function(grepResult) {
        var parentDir = path.resolve(__dirname, '..', '..');
        // The input is specific to my file system. This step corrects that to
        // not make it specific to my system.
        grepResult.file = grepResult.file.replace(
            '/Users/andersriutta/Sites/semver-bumper-for-file-text', parentDir);
        return grepResult;
      }), 'file'))
      .map(function(pair) {
        var grepResultsByFile = pair[1];
        var iterable = createIterable(grepResultsByFile);
        return iterable.map(function(item) {
          return getPromptSet(newVersion, filepath, item);
        });
      });

      var expectedPromptSetCollection = require('../expected/prompt-sets-collection.json');
      expect(actualPromptSetCollection).to.deep.equal(expectedPromptSetCollection);
    });
  });

  describe('bump files by find & replace (many grep results)', function() {
    beforeEach(function() {
      sinon
        .stub(grepObservable, 'grep', function() {
          var allGrepResultsClone = _.cloneDeep(allGrepResults);
          return Rx.Observable.from(allGrepResultsClone);
        });

      sinon
        .stub(fileLineUpdater, 'update', function(filepath, updater) {
          expect(typeof filepath).to.equal('string');
          expect(typeof updater).to.equal('function');
        });
    });

    afterEach(function() {
      grepObservable.grep.restore();
      fileLineUpdater.update.restore();
    });

    it('should answer with a mix of yes and no', function(done) {
      var bumpOptions = {
        args: {
          include: ['sample-README.md', 'sample-OTHER.md', 'sub/sample-OTHER.md'],
          exclude: ['sample-package.json', 'ignore.md'],
          excludeDir: ['ignore']
        },
        bddStdinBound: bddStdin.bind(null,
          '\n',
          '\n',
          '\n',
          '\n',
          'n', '\n',
          'n', '\n',
          '\n',
          '\n')
      };
      _.defaults(bumpOptions, commonBumpOptions);

      var newVersion = bumpOptions.newVersion;
      var filepath = bumpOptions.filepath;
      var args = bumpOptions.args;
      var bddStdinBound = bumpOptions.bddStdinBound;

      bddStdinBound();
      semverBumperByFindAndReplace.bump(newVersion, filepath, args)
        .toArray()
        .subscribe(function(result) {
          var resultString = JSON.stringify(result, null, '  ');
          var expectedPath = path.join(__dirname, '..', 'expected', 'bump-many-yes-no.json');
          //fs.writeFileSync(expectedPath, resultString, 'utf8');
          var expected = require(expectedPath);
          expect(result).to.eql(expected);
        }, done, function() {
          // three different files
          expect(fileLineUpdater.update.callCount).to.equal(3);
          done();
        });
    });

    it('should just answer no', function(done) {
      var bumpOptions = {
        args: {
          include: ['sample-README.md', 'sample-OTHER.md', 'sub/sample-OTHER.md'],
          exclude: ['sample-package.json', 'ignore.md'],
          excludeDir: ['ignore']
        },
        // Answer no to everything
        bddStdinBound: bddStdin.bind(null,
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n')
      };
      _.defaults(bumpOptions, commonBumpOptions);

      var newVersion = bumpOptions.newVersion;
      var filepath = bumpOptions.filepath;
      var args = bumpOptions.args;
      var bddStdinBound = bumpOptions.bddStdinBound;
      bddStdinBound();
      semverBumperByFindAndReplace.bump(newVersion, filepath, args)
        .subscribe(function(result) {
          throw new Error('Results should have all been filtered out');
        }, done, function() {
          expect(fileLineUpdater.update.called).to.be.false;
          done();
        });
    });
  });

  describe('bump files by find & replace (two grep results)', function() {
    beforeEach(function() {
      sinon
        .stub(grepObservable, 'grep', function() {
          var grepResults = _.cloneDeep(allGrepResults).slice(0, 2);
          return Rx.Observable.from(grepResults);
        });

      sinon
        .stub(fileLineUpdater, 'update', function(filepath, updater) {
          expect(typeof filepath).to.equal('string');
          expect(typeof updater).to.equal('function');
        });
    });

    afterEach(function() {
      grepObservable.grep.restore();
      fileLineUpdater.update.restore();
    });

    it('should answer with a mix of yes and no', function(done) {
      var bumpOptions = {
        args: {
          include: ['sample-README.md', 'sample-OTHER.md', 'sub/sample-OTHER.md'],
          exclude: ['sample-package.json', 'ignore.md'],
          excludeDir: ['ignore']
        },
        bddStdinBound: bddStdin.bind(null,
          '\n',
          '\n',
          '\n',
          '\n',
          'n', '\n',
          'n', '\n',
          '\n',
          '\n')
      };
      _.defaults(bumpOptions, commonBumpOptions);

      var newVersion = bumpOptions.newVersion;
      var filepath = bumpOptions.filepath;
      var args = bumpOptions.args;
      var bddStdinBound = bumpOptions.bddStdinBound;

      bddStdinBound();
      semverBumperByFindAndReplace.bump(newVersion, filepath, args)
        .toArray()
        .subscribe(function(result) {
          var resultString = JSON.stringify(result, null, '  ');
          var expectedPath = path.join(__dirname, '..', 'expected', 'bump-2-yes-no.json');
          //fs.writeFileSync(expectedPath, resultString, 'utf8');
          var expected = require(expectedPath);
          expect(result).to.eql(expected);
        }, done, function() {
          expect(fileLineUpdater.update.callCount).to.equal(2);
          done();
        });
    });

    it('should just answer no', function(done) {
      var bumpOptions = {
        args: {
          include: ['sample-README.md', 'sample-OTHER.md', 'sub/sample-OTHER.md'],
          exclude: ['sample-package.json', 'ignore.md'],
          excludeDir: ['ignore']
        },
        // Answer no to everything
        bddStdinBound: bddStdin.bind(null,
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n')
      };
      _.defaults(bumpOptions, commonBumpOptions);

      var newVersion = bumpOptions.newVersion;
      var filepath = bumpOptions.filepath;
      var args = bumpOptions.args;
      var bddStdinBound = bumpOptions.bddStdinBound;
      bddStdinBound();
      semverBumperByFindAndReplace.bump(newVersion, filepath, args)
        .subscribe(function(result) {
          throw new Error('Results should have all been filtered out');
        }, done, function() {
          expect(fileLineUpdater.update.called).to.be.false;
          done();
        });
    });
  });

  describe('bump files by find & replace (no grep results)', function() {
    beforeEach(function() {
      sinon
        .stub(grepObservable, 'grep', function() {
          return Rx.Observable.empty();
          //return Rx.Observable.from([]);
        });

      sinon
        .stub(fileLineUpdater, 'update', function(filepath, updater) {
          expect(typeof filepath).to.equal('string');
          expect(typeof updater).to.equal('function');
        });
    });

    afterEach(function() {
      grepObservable.grep.restore();
      fileLineUpdater.update.restore();
    });

    it('should answer with a mix of yes and no', function(done) {
      var bumpOptions = {
        args: {
          include: ['sample-README.md', 'sample-OTHER.md', 'sub/sample-OTHER.md'],
          exclude: ['sample-package.json', 'ignore.md'],
          excludeDir: ['ignore']
        },
        bddStdinBound: bddStdin.bind(null,
          '\n',
          '\n',
          '\n',
          '\n',
          'n', '\n',
          'n', '\n',
          '\n',
          '\n')
      };
      _.defaults(bumpOptions, commonBumpOptions);

      var newVersion = bumpOptions.newVersion;
      var filepath = bumpOptions.filepath;
      var args = bumpOptions.args;
      var bddStdinBound = bumpOptions.bddStdinBound;

      bddStdinBound();
      semverBumperByFindAndReplace.bump(newVersion, filepath, args)
        .toArray()
        .subscribe(function(result) {
          expect(result).to.eql([]);
        }, done, function() {
          expect(fileLineUpdater.update.called).to.be.false;
          done();
        });
    });

    it('should just answer no', function(done) {
      var bumpOptions = {
        args: {
          include: ['sample-README.md', 'sample-OTHER.md', 'sub/sample-OTHER.md'],
          exclude: ['sample-package.json', 'ignore.md'],
          excludeDir: ['ignore']
        },
        // Answer no to everything
        bddStdinBound: bddStdin.bind(null,
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n',
            'n', '\n')
      };
      _.defaults(bumpOptions, commonBumpOptions);

      var newVersion = bumpOptions.newVersion;
      var filepath = bumpOptions.filepath;
      var args = bumpOptions.args;
      var bddStdinBound = bumpOptions.bddStdinBound;
      bddStdinBound();
      semverBumperByFindAndReplace.bump(newVersion, filepath, args)
        .subscribe(function(result) {
          throw new Error('Results should have all been filtered out');
        }, done, function() {
          expect(fileLineUpdater.update.called).to.be.false;
          done();
        });
    });
  });

  // TODO test all combinations of the following:
  // 1) semverBumper field in package.json has/has NOT been set
  // 2) there are zero/one/two/many grep results.
  //
  // semverBumper field NOT set && zero grep results
  // semverBumper field NOT set && one grep result
  // semverBumper field NOT set && two grep results
  // semverBumper field NOT set && many grep results
  // semverBumper field IS set && zero grep results
  // semverBumper field IS set && one grep result
  // semverBumper field IS set && two grep results
  // semverBumper field IS set && many grep results

});
