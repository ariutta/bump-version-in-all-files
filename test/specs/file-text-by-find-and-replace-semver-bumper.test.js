/**
 * Test Prompt public APIs
 */

var _ = require('lodash');
var expect = require('chai').expect;
var grepObservable = require('../../lib/grep-observable.js');
var path = require('path');
var Rx = require('rx');
var sinon = require('sinon');

var fileTextByFindAndReplaceSemverBumper = require('../../lib/bump-files-by-find-and-replace.js');

var bumpOptions = [{
  newVersion: '2.0.0-alpha.2',
  filepath: path.resolve(__dirname, '../'),
  args: {
    include: ['sample-data1.json', 'sample-data2.json'],
    exclude: ['package.json'],
    excludeDir: ['node_modules']
  },
  expected: '2.0.0-alpha.2',
  grepResultsByFile: [{
    'file': path.resolve(__dirname, '../../sample-data1.json'),
    'lineNumber': 3,
    'line': '  \"version-sample-data1\": \"4.3.2\"',
    'chunks': [
      {
        'str': '  \"version-sample-data1\": \"',
        'matched': false
      },
      {
        'str': '4.3.2',
        'matched': true
      },
      {
        'str': '\"',
        'matched': false
      }
    ]
  }],
  expectedPrompts: [{
    type: 'confirm',
    name: {
      file: path.resolve(__dirname, '../../sample-data1.json'),
      lineIndex: 2,
      str: '4.3.2',
      chunkIndex: 1
    },
      message: 'Replace \u001b[4m4.3.2\u001b[24m with \u001b[4m2.0.0-alpha.2\u001b[24m ' +
        '(../sample-data1.json:3)?\n\n      "version-sample-data1": ' +
        '"\u001b[33m\u001b[1m4.3.2\u001b[22m\u001b[39m"\n\n',
    default: true
  }],
  expectedStarter: {
    'file': path.resolve(__dirname, '../../sample-data1.json'),
    'lineDetailsMap': {
      '2': {
        'chunkStrings': [
          '  \"version-sample-data1\": \"',
          '4.3.2',
          '\"'
        ],
        'updated': false
      }
    }
  },
  lineDetailsMapsByFile: {
    'file': path.resolve(__dirname, '../../sample-data1.json'),
    'lineDetailsMap': {
      '2': {
        'chunkStrings': [
          '  \"version-sample-data1\": \"',
          '4.3.2',
          '\"'
        ],
        'updated': true
      }
    }
  },
  expectedFilteredLineMap: {
    '2': '  \"version-sample-data1\": \"4.3.2\"'
  }
}, {
  newVersion: '2.0.0-alpha.2',
  filepath: path.resolve(__dirname, '../'),
  args: {
    include: ['sample-data2.json'],
    exclude: ['package.json'],
    excludeDir: ['node_modules']
  },
  expected: '2.0.0-alpha.2',
  grepResultsByFile: [{
      'file': '/Users/andersriutta/Sites/semver-in-file-text-bumper/test/sample-data2.json',
      'lineNumber': 3,
      'line': '  \"version-sample-data2\": \"4.3.2\",',
      'chunks': [
        {
          'str': '  \"version-sample-data2\": \"',
          'matched': false
        },
        {
          'str': '4.3.2',
          'matched': true
        },
        {
          'str': '\",',
          'matched': false
        }
      ]
    },
    {
      'file': '/Users/andersriutta/Sites/semver-in-file-text-bumper/test/sample-data2.json',
      'lineNumber': 4,
      'line': '  \"description-sample-data2\": \"Utility for bumping version number, such as ' +
        '4.3.2 to 4.3.2 in the text of all appropriate files.\",',
      'chunks': [
        {
          'str': '  \"description-sample-data2\": \"Utility for bumping version number, such as ',
          'matched': false
        },
        {
          'str': '4.3.2',
          'matched': true
        },
        {
          'str': ' to ',
          'matched': false
        },
        {
          'str': '4.3.2',
          'matched': true
        },
        {
          'str': ' in the text of all appropriate files.\",',
          'matched': false
        }
      ]
    },
    {
      'file': '/Users/andersriutta/Sites/semver-in-file-text-bumper/test/sample-data2.json',
      'lineNumber': 6,
      'line': '    \"JSONStream-sample-data2\": \"^4.3.2\",',
      'chunks': [
        {
          'str': '    \"JSONStream-sample-data2\": \"^',
          'matched': false
        },
        {
          'str': '4.3.2',
          'matched': true
        },
        {
          'str': '\",',
          'matched': false
        }
      ]
  }],
  expectedPrompts: [{
    'type': 'confirm',
    'name': {
      'file': '/Users/andersriutta/Sites/semver-in-file-text-bumper/test/sample-data2.json',
      'lineIndex': 2,
      'str': '4.3.2',
      'chunkIndex': 1
    },
    'message': 'Replace \u001b[4m4.3.2\u001b[24m with ' +
      '\u001b[4m2.0.0-alpha.2\u001b[24m (sample-data2.json:3)?\n\n' +
      '      \"version-sample-data2\": \"\u001b[33m\u001b[1m4.3.2\u001b[22m\u001b[39m\",\n\n',
    'default': true
  },
  {
    'type': 'confirm',
    'name': {
      'file': '/Users/andersriutta/Sites/semver-in-file-text-bumper/test/sample-data2.json',
      'lineIndex': 3,
      'str': '4.3.2',
      'chunkIndex': 1
    },
    'message': 'Replace \u001b[4m4.3.2\u001b[24m with \u001b[4m2.0.0-alpha.2\u001b[24m' +
      ' (sample-data2.json:4)?\n\n      \"description-sample-data2\": \"Utility for bumping ' +
      'version number, such as \u001b[33m\u001b[1m4.3.2\u001b[22m\u001b[39m to 4.3.2 in the ' +
        'text of all appropriate files.\",\n\n',
    'default': true
  },
  {
    'type': 'confirm',
    'name': {
      'file': '/Users/andersriutta/Sites/semver-in-file-text-bumper/test/sample-data2.json',
      'lineIndex': 3,
      'str': '4.3.2',
      'chunkIndex': 3
    },
    'message': 'Replace \u001b[4m4.3.2\u001b[24m with \u001b[4m2.0.0-alpha.2\u001b[24m ' +
      '(sample-data2.json:4)?\n\n      \"description-sample-data2\": \"Utility for bumping ' +
      'version number, such as 4.3.2 to \u001b[33m\u001b[1m4.3.2\u001b[22m\u001b[39m in ' +
        'the text of all appropriate files.\",\n\n',
    'default': true
  },
  {
    'type': 'confirm',
    'name': {
      'file': '/Users/andersriutta/Sites/semver-in-file-text-bumper/test/sample-data2.json',
      'lineIndex': 5,
      'str': '4.3.2',
      'chunkIndex': 1
    },
    'message': 'Replace \u001b[4m4.3.2\u001b[24m with \u001b[4m2.0.0-alpha.2\u001b[24m ' +
      '(sample-data2.json:6)?\n\n        \"JSONStream-sample-data2\": ' +
      '\"^\u001b[33m\u001b[1m4.3.2\u001b[22m\u001b[39m\",\n\n',
    'default': true
  }],
  expectedStarter: {
    'file': '/Users/andersriutta/Sites/semver-in-file-text-bumper/test/sample-data2.json',
    'lineDetailsMap': {
      '2': {
        'chunkStrings': [
          '  \"version-sample-data2\": \"',
          '4.3.2',
          '\",'
        ],
        'updated': false
      },
      '3': {
        'chunkStrings': [
          '  \"description-sample-data2\": \"Utility for bumping version number, such as ',
          '4.3.2',
          ' to ',
          '4.3.2',
          ' in the text of all appropriate files.\",'
        ],
        'updated': false
      },
      '5': {
        'chunkStrings': [
          '    \"JSONStream-sample-data2\": \"^',
          '4.3.2',
          '\",'
        ],
        'updated': false
      }
    }
  },
  lineDetailsMapsByFile: {
    'file': '/Users/andersriutta/Sites/semver-in-file-text-bumper/test/sample-data2.json',
    'lineDetailsMap': {
      '2': {
        'chunkStrings': [
          '  \"version-sample-data2\": \"',
          '4.3.2',
          '\",'
        ],
        'updated': true
      },
      '3': {
        'chunkStrings': [
          '  \"description-sample-data2\": \"Utility for bumping version number, such as ',
          '4.3.2',
          ' to ',
          '4.3.2',
          ' in the text of all appropriate files.\",'
        ],
        'updated': true
      },
      '5': {
        'chunkStrings': [
          '    \"JSONStream-sample-data2\": \"^',
          '4.3.2',
          '\",'
        ],
        'updated': true
      }
    }
  },
  expectedFilteredLineMap: {
    '2': '  \"version-sample-data2\": \"4.3.2\",',
    '3': '  \"description-sample-data2\": \"Utility for bumping version number, such as ' +
      '4.3.2 to 4.3.2 in the text of all appropriate files.\",',
    '5': '    \"JSONStream-sample-data2\": \"^4.3.2\",'
  }
}];

function run(bumpOption) {
  var newVersion = bumpOption.newVersion;
  var filepath = bumpOption.filepath;
  var args = bumpOption.args;
  var grepResultsByFile = bumpOption.grepResultsByFile;
  var expectedPrompts = bumpOption.expectedPrompts;
  var expectedStarter = bumpOption.expectedStarter;
  var lineDetailsMapsByFile = bumpOption.lineDetailsMapsByFile;
  var expectedFilteredLineMap = bumpOption.expectedFilteredLineMap;

  var dataFilepath = bumpOption.grepResultsByFile[0].file;

  /*
  it('should verify _getPromptSource returns the correct Observable', function(done) {
    fileTextByFindAndReplaceSemverBumper._getPromptSource(newVersion, filepath, grepResultsByFile)
      .toArray()
      .subscribe(function(result) {
        expect(result).to.deep.equal(expectedPrompts);
        done();
      }, done);
  });

  it('should verify _getStarter returns the correct data to init the reducer', function() {
    var starter = fileTextByFindAndReplaceSemverBumper._getStarter(grepResultsByFile);
    expect(starter).to.deep.equal(expectedStarter);
  });
  //*/

  it('should verify _getFilteredLineMap returns the correct result', function() {
    var _getFilteredLineMap = fileTextByFindAndReplaceSemverBumper._getFilteredLineMap;
    var filteredLineMap = _getFilteredLineMap(lineDetailsMapsByFile.lineDetailsMap);
    expect(filteredLineMap).to.deep.equal(expectedFilteredLineMap);

    console.log('grepObservable.grep');
    console.log(grepObservable.grep);
  });
}

// Run tests
describe('Public API', function() {

  before(function(done) {
    // TODO finish stubbing this out such that it will
    // return the appropriate data based on the
    // iteration.
    //
    // Also, should it use yield?
    sinon
      .stub(grepObservable, 'grep')
      .yields(null, null, bumpOptions[0].grepResultsByFile);
    done();
  });

  after(function(done) {
    grepObservable.grep.restore();
    done();
  });

  _.each(bumpOptions, function(bumpOption) {
    run(bumpOption);
  }, this);

  it('should stub grepObservable', function() {
    // TODO once grepObservable.grep is stubbed,
    // stub the writeFileLines method as well,
    // and then call the entire bump-by-find-and-replace.
    console.log('grepObservable.grep');
    console.log(grepObservable.grep);
    expect(grepObservable.grep.called).to.be.false;
  });

});
