# semver-bumper-for-file-text
Bump the version number in the text of all appropriate files in the package.

Currently, you must do it from the top-level directory of the package.

## TODO

[ ] Improve cli.js based on version from wikipathways-api-client-js
[ ] Test main.js, including bumping of JSON files. Possibly split JSON bumping out into its own file.
[ ] Get rx-extra, rx-node-extra and semver-inc-wizard published and update version of dependency in this package.json.
[ ] Publish to npm.

## Temp re-install

```
rm -rf node_modules
npm install
npm link ../rx-json-stream
npm link ../semver-inc-wizard
npm link ../rx-node-extra
npm link ../rx-fs
```

Try it:
```
node ./bin/cli.js bump
```

## Test

```
npm test
```
