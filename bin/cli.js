#!/usr/bin/env node

var fs = require('fs');
var RxNode = require('rx-node-extra');
var Rx = RxNode.Rx;
var semverInFileTextBumper = require('../index.js');

var program = require('commander');
var npmPackage = JSON.parse(fs.readFileSync(
      __dirname + '/../package.json', {encoding: 'utf8'}));
program
  .version(npmPackage.version)
  .option('-v, --version [version]',
      'See which version of bumpVersionInAllFiles you have installed [version]');

/* TODO create this
program
  .command('set [newVersion...]')
  .description('Specify and save your desired settings.')
  .action(function(newVersion, options) {
    var stream = semverInFileTextBumper.set();
    var disposable = RxNode.writeToStream(stream, process.stdout, 'utf8');
  });
//*/

program
  .command('bump [newVersion...]')
  .description('Bump semver version of all relevant files for this package.')
  .action(function(newVersion, options) {
    var bumpStream = semverInFileTextBumper.bump({
      newVersion: newVersion
    });
    var disposable = RxNode.writeToStream(bumpStream, process.stdout, 'utf8');
  });

program
  .command('*')
  .description('No command specified.')
  .action(function(env) {
    console.log('No command specified for "%s"', env);
  });

program.parse(process.argv);
