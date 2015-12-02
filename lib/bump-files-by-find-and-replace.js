var rxFs = require('rx-fs');

function bumpFilesByFindAndReplace(newVersion, include, exclude) {
  console.log('newVersion');
  console.log(newVersion);

  var dataSource = rxFs.createReadObservable(path, {
    flags: 'r'
  });

  var tempPath = path + '.temp-bump-file-by-find-and-replace';
  var destSource = rxFs.createWriteObservable(tempPath);

  return dataSource
    .map(function(metadataFileJson) {
      metadataFileJson[versionPropertyKey] = newVersion;
      return JSON.stringify(metadataFileJson, null, '  ');
    })
    .let(destSource)
    .flatMap(rxFs.rename(tempPath, path));
}

module.exports = bumpFilesByFindAndReplace;
