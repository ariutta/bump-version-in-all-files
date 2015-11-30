var rxFs = require('rx-fs');
var rxJSONStream = require('rx-json-stream');

function bumpJsonFile(path, versionPropertyKey, newVersion) {
  console.log('newVersion');
  console.log(newVersion);

  var dataSource = rxFs.createReadObservable(path, {
    flags: 'r'
  });

  var tempPath = path + '.temp-bump-metadata-file';
  var destSource = rxFs.createWriteObservable(tempPath);

  return dataSource
    .let(rxJSONStream.parse(true))
    .map(function(metadataFileJson) {
      metadataFileJson[versionPropertyKey] = newVersion;
      return JSON.stringify(metadataFileJson, null, '  ');
    })
    .let(destSource)
    .flatMap(rxFs.rename(tempPath, path));
}

module.exports = bumpJsonFile;
