var _ = require('lodash');
var Rx = require('rx');
var rxFs = require('rx-fs');

function updateFileLines(path, updatedTextByLineMap) {

  var dataSource = rxFs.createReadObservable(path, {
    flags: 'r'
  })
    .flatMap(function(data) {
      var lines = data.toString().split('\n');
      // get rid of empty last line that is not
      // actually in the file
      lines.pop();

      //var lineMap = _.pairs(lines);
      return Rx.Observable.from(lines);
    });

  var tempPath = path + '.temp-bump-file-by-find-and-replace';
  var destSource = rxFs.createWriteObservable(tempPath);

  //*
  return dataSource.map(function(text, idx) {
    console.log('text');
    console.log(text);
    console.log('updateLineText');
    console.log(updatedTextByLineMap[idx.toString()]);
    return updatedTextByLineMap[idx.toString()] || text;
  })
  //*/
  /*
  var lastLineIndex = 0;
  return updatedLinesSource.reduce(function(accumulator, updatedLine) {
    console.log('x');
    console.log(x);
    var text = x.text;
    var lineNumber = x.number;
    var lineIndex = lineNumber - 1;
    var newSource;
    if (lineIndex > lastLineIndex + 1) {
      var begin = lastLineIndex + 1;
      var end = lineIndex - 1;
      console.log('slice from ' + begin + ' to ' + end);
      newSource = dataSource.slice(begin, end).concat(
        Rx.Observable.return(text)
      );
    } else {
      newSource = Rx.Observable.return(text);
    }

    console.log('lastLineIndex');
    console.log(lastLineIndex);
    console.log('lineIndex');
    console.log(lineIndex);
    lastLineIndex = lineIndex;
    return newSource;
  }, Rx.Observable.empty())
  //*/
  /*
  var lastLineIndex = -1;
  return updatedLinesSource.flatMap(function(x, idx, obs) {
    console.log('x');
    console.log(x);
    var text = x.text;
    var lineNumber = x.number;
    var lineIndex = lineNumber - 1;

    console.log('lastLineIndex');
    console.log(lastLineIndex);
    console.log('lineIndex');
    console.log(lineIndex);

    var newSource;
    if (lineIndex > lastLineIndex + 1) {
      var begin = lastLineIndex + 1;
      var end = lineIndex - 1;
      console.log('slice from ' + begin + ' to ' + end);
      newSource = dataSource.slice(begin, end);
    } else {
      newSource = Rx.Observable.return(text);
    }

    lastLineIndex = lineIndex;
    return newSource;
  })
  //*/
  /*
  return updatedLinesSource.flatMap(function(x, idx, obs) {
    if (!x) {
      return dataSource.elementAt(idx);
    }
    return Rx.Observable.return(x);
  })
  //*/
  /*
  var source = dataSource.forkJoin(
    updatedLinesSource,
    function(s1, s2) {
      console.log('s1');
      console.log(s1);
      console.log('s2');
      console.log(s2);
      return s2 || s1;
    })
  //*/
  /*
  return Rx.Observable.if(
      function() {
        return 's1' || 's2';
      },
      sourceObject
  )
  //*/
  /*
  var sourceObject = {
    s1: updatedLinesSource,
    s2: dataSource
  };
  return Rx.Observable.case(
      function() {
        return 's1' || 's2';
      },
      sourceObject
  )
  //*/
  /*
  return dataSource
    .withLatestFrom(
        Rx.Observable.from(updatedLines).defaultIfEmpty(false),
        function() { return Rx.Observable.timer(0); },
        function() { return Rx.Observable.timer(0); },
        function(x, y) { return y || x; }
    )
  //*/
  /*
  return dataSource.combineLatest(
    updatedLinesSource,
    function(s1, s2) {
      console.log('s1');
      console.log(s1);
      console.log('s2');
      console.log(s2);
      return s2 || s1;
    }
  )
  //*/
  /*
  return Rx.Observable.combineLatest(
    updatedLinesSource,
    dataSource,
    function(s1, s2) {
      console.log('s1');
      console.log(s1);
      console.log('s2');
      console.log(s2);
      return s1 || s2;
    }
  )
  //*/
  /*
  return Rx.Observable.zip(
    updatedLinesSource
      .takeUntil(updatedLinesSource.last()),
    dataSource,
    function(s1, s2) {
      console.log('s1');
      console.log(s1);
      console.log('s2');
      console.log(s2);
      return s1 || s2;
    }
  )
  .concat(
    dataSource
      //.skipUntil(updatedLinesSource.last())
  )
  //*/
  //return dataSource
    .reduce(function(accumulator, item) {
      return accumulator + '\n' + item;
    });
    /*
    .let(destSource)
    .flatMap(rxFs.rename(tempPath, path));
    //*/
}

module.exports = updateFileLines;
