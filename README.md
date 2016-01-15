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

## TODO

[ ] Add testing for main.js, including bumping of JSON files. Possibly split JSON bumping out into its own file.

## Test

```
npm test
```
