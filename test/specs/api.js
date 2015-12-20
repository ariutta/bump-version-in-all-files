/**
 * Test Prompt public APIs
 */

var _ = require('lodash');
var bddStdin = require('bdd-stdin');
var expect = require('chai').expect;
var fileLineUpdater = require('../../lib/file-line-updater.js');
var fs = require('fs');
var grepObservable = require('../../lib/grep-observable.js');
var expectedPromptSetCollection = require('../expected-prompt-sets-collection.json');
var grepResults = require('../grep-results.json');
var path = require('path');
var RxNode = require('rx-node-extra');
var Rx = RxNode.Rx;
var rxFs = require('rx-fs');
var sinon = require('sinon');

var semverBumperByFindAndReplace = require('../../lib/semver-bumper-by-find-and-replace.js');

var bumpOptions = {
  newVersion: '2.3.0',
  filepath: path.resolve(__dirname, '..', 'inputs'),
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

// Run tests
describe('Public API', function() {
  before(function(done) {
    sinon
      .stub(grepObservable, 'grep', function() {
        return Rx.Observable.from(grepResults);
      });

    sinon
      .stub(fileLineUpdater, 'update', function(file, updater) {
        var dataSource = rxFs.createReadObservable(file, {
            flags: 'r'
          })
          .flatMap(function(data) {
            var lines = data.toString().split('\n');
            // NOTE On at least OS/X, the last line will be empty, but we
            // still want to keep it.
            // TODO check whether this is cross-platform compatible.
            return Rx.Observable.from(lines);
          });

        return dataSource
          .let(updater)
          .map(function(fileString) {
            return {
              actual: fileString,
              expected: fs.readFileSync(file.replace('inputs', 'expected'), {
                encoding: 'utf8'
              })
            };
          });
      });

    done();
  });

  after(function(done) {
    grepObservable.grep.restore();
    fileLineUpdater.update.restore();
    done();
  });

  var newVersion = bumpOptions.newVersion;
  var filepath = bumpOptions.filepath;
  var args = bumpOptions.args;
  var bddStdinBound = bumpOptions.bddStdinBound;

  it('should create list of bumpable semvers & create prompt set for each one', function() {
    var getPromptSet = semverBumperByFindAndReplace._getPromptSet;
    var createIterable = semverBumperByFindAndReplace._createIterable;

    var grepResultsClone = _.cloneDeep(grepResults);

    var actualPromptSetCollection = _.pairs(_.groupBy(grepResultsClone, 'file'))
    .map(function(pair) {
      var grepResultsByFile = pair[1];
      var iterable = createIterable(grepResultsByFile);
      return iterable.map(function(item) {
        return getPromptSet(newVersion, filepath, item);
      });
    });

    expect(actualPromptSetCollection).to.deep.equal(expectedPromptSetCollection);
  });

  it('should bump files by find & replace (no actual side-effects in the test)', function(done) {
    bddStdinBound();
    semverBumperByFindAndReplace.bump(newVersion, filepath, args)
      .subscribe(function(result) {
        expect(result.actual).to.equal(result.expected);
      }, done, done);
  });

});
