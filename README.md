# semver-bumper-for-file-text
Bump the version number in the text of all appropriate files in the package.

## Install

```
npm install --save-dev semver-bumper-for-file-text
```

## How To Use

CLI (currently you must do it from the top-level directory of the package):

```
semver-bumper-for-file-text bump
```

or

```
semver-bumper-for-file-text --help
```

Code:

```js
var semverBumperForFileText = require('semver-bumper-for-file-text');
semverBumperForFileText.bump()
  .subscribe(function(result) {
    // do something on result
  }, function(err) {
    throw err;
  }, function() {
    // do something on complete
  });
```

## TODO

[ ] Add testing for main.js, including bumping of JSON files. Possibly split JSON bumping out into its own file.

## Test

```
npm test
```
