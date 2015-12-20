# semver-bumper-for-file-text
Bump the version number in the text of all appropriate files in the package.

Currently, you must do it from the top-level directory of the package.

## Temp re-install

rm -rf node_modules
npm install
npm link ../rx-json-stream
npm link ../semver-inc-wizard
npm link ../rx-node-extra
npm link ../rx-fs

Try it:
node ./bin/cli.js bump

## Test

```
npm test
```
