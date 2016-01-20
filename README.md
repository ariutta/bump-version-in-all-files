# semver-bumper-for-file-text
Bump the version number in the text of all appropriate files in a package.

## Install

Locally for just a specific package:

```
npm install --save-dev semver-bumper-for-file-text
```

and/or globally:

```
npm install -g semver-bumper-for-file-text
```

## How To Use

### CLI (currently you must do it from the top-level directory of the package)

If you installed globally:

```
semver-bumper-for-file-text --help
semver-bumper-for-file-text bump
```

If you only installed locally:

```
./node_modules/semver-bumper-for-file-text/bin/semver-bumper-for-file-text --help
./node_modules/semver-bumper-for-file-text/bin/semver-bumper-for-file-text bump
```

### In Code:

```js
var semverBumperForFileText = require('semver-bumper-for-file-text');
semverBumperForFileText.bump().subscribe();
```

## Test

```
npm test
```

## TODO

* [ ] Add testing for main.js, including bumping of JSON files. Possibly split JSON bumping out into its own file.
* [ ] Allow for saving user's answer for whether to bump each grepped version match, using code something like this:
      ```js
      var filepath = './run-inc.js';
      var lineIndex = 3;
      var chunkIndex = 1;
      var chunk = 'This version is now 1.2.3';
      var versionNumberRE = /[0-9]+\.[0-9]+\.[0-9]+(-(alpha|beta|rc)(\.[0-9]+)?)?/;
      var nonVersionInput = chunk.replace(versionNumberRE, '');
      var semverBumperSettings = {
        'jsonFiles': [
          {
            'filepath': 'package.json',
            'key': 'version'
          }
        ],
        'grepOptions': {
          'include': [],
          'exclude': [],
          'excludeDir': [
            'test'
          ]
        },
        savedAnswers: {
          '4446b9f25a40b91f4b83b0d3a244384d': false,
          '595f44fec1e92a71d3e9e77456ba80d1': true,
          '71f920fa275127a7b60fa4d4d41432a3': false,
          '43c191bf6d6c3f263a8cd0efd4a058ab': false
        }
      };

      var crypto = require('crypto');
      var hash = crypto.createHash('md5')
        .update([filepath, lineIndex, chunkIndex, nonVersionInput].join(','))
        .digest('hex');
      console.log('ask user? ' + !!semverBumperSettings.savedAnswers[hash]);
      ```
