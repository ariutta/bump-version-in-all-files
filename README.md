# semver-in-file-text-bumper
Bump the version number in all appropriate files in the package.

Currently, you must do it from the top-level directory of the package.

* [ ] Bump package.json, bower.json and component.json
* [ ] Grep for the old version number and bump to the new one for pre-ok'ed files
* [ ] Grep for any version number and bump to the new one, asking the user before doing it
* [ ] Find package.json based on nearest (parent) package.json from cwd. Also find the top-level directory.
* [ ] CLI to allow for specifying a version not based on bumping the package.json version

## Temp re-install

rm -rf node_modules
npm install
npm link ../rx-json-stream
npm link ../semver-inc-wizard
npm link ../rx-node-extra
npm link ../rx-fs
node ./bin/cli.js bump

## Test

```
mocha test/specs/file-text-by-find-and-replace-semver-bumper.test.js
```
