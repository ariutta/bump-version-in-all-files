var input = [1, 1, 1, 2, 2, 2, 3, 3];
var outputExpected = [[1, 1, 1], [2, 2, 2], [3, 3]];

var outputActual = input.reduce(function(acc, currentItem) {
  var accLength = acc.length;
  var currentGroup = acc[accLength - 1];
  var currentGroupLength = currentGroup.length;
  if (currentGroupLength > 0) {
    var previousItem = currentGroup[currentGroupLength - 1];
    if (previousItem === currentItem) {
      currentGroup.push(currentItem);
    } else {
      acc.push([currentItem]);
    }
  } else {
    currentGroup.push(currentItem);
  }
  return acc;
}, [[]]);

var Rx = require('rx');

var rs = Rx.Observable.from(input);

function splitOnChange(source, keySelector) {
  var subject = new Rx.ReplaySubject();

  var previousItem;
  var currentGroup = [];

  if (!keySelector) {
    keySelector = function(a, b) {
      return a === b;
    };
  }
  rs.subscribe(
    function(currentItem) {
      if (keySelector(currentItem, previousItem) || !previousItem) {
        currentGroup.push(currentItem);
      } else {
        subject.onNext(currentGroup);
        currentGroup = [];
        currentGroup.push(currentItem);
      }
      previousItem = currentItem;
    },
    function(err) {
      console.error('Error: ' + err);
    },
    function() {
      subject.onNext(currentGroup);
      subject.onCompleted();
    });
  return subject;
}

Rx.Observable.prototype.splitOnChange = function(keySelector) {
  var rs = this;
  return splitOnChange(rs);
};

rs
  .splitOnChange()
  .subscribe(
      function(s) {
        console.log('s2');
        console.log(s);
      },
      function(err) {
        throw err;
      },
      function() {
        console.log('done169');
      });
