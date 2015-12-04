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

/*
var rb = require('./rb')();

var items = [
    'a',
    'b'
];

rb.enqueue('a');
//*/

/*
var Readable = require('stream').Readable;
var rs = Readable();
var subscription = null;
rs._read = function() {
  console.log('weeeeeeee');
  if (!subscription) {
    subscription = Rx.Observable
      .generate(
        97, // start value
        function(c) {
          console.log('c: ' + c);
          return c < 'z'.charCodeAt(0);
          //return c < 100;
        }, // end condition
        function(c) {
          return c + 1;
        }, // step function
        function(c) {
          return String.fromCharCode(c);
        }) // result selector
        .subscribe(
          function(s) {
            console.log('s: ' + s);
            rs.push(s);
          },
          function(error) {
            rs.push(null);
          },
          function() {
            rs.push(null);
          });
  }
};

rs.pipe(process.stdout);
//*/

/*
Rx.Observable
  .generate(
    97, // start value
    function(c) {
      console.log('c: ' + c);
      return c < 'z'.charCodeAt(0);
      //return c < 100;
    }, // end condition
    function(c) {
      return c + 1;
    }, // step function
    function(c) {
      return String.fromCharCode(c);
    }) // result selector
    .subscribe(
      function(s) {
        console.log('s: ' + s);
      },
      function(err) {
        throw err;
      },
      function() {
        console.log('done');
      });
//*/

/*
  Rx.Observable
    .generate(
      0, // start value
      function(c) {
        console.log('c: ' + c);
        return c < 5;
      }, // end condition
      function(c) {
        return c + 1;
      }, // step function
      function(c) {
        return rs.elementAt(c);
      }) // result selector
      .subscribe(
        function(s) {
          console.log('s: ' + s);
          console.log(s);
        },
        function(err) {
          throw err;
        },
        function() {
          console.log('done');
        });
//*/

var rs = Rx.Observable.from(input);

//*
function split(source, keySelector) {
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

Rx.Observable.prototype.split = function(keySelector) {
  var rs = this;
  return split(rs);
};

rs
  .split()
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
//*/

/*
rs.let(function(o) {
  console.log('make subject');
  var subject = new Rx.ReplaySubject();
  var previousItem;
  var currentGroup = [];

  o.subscribe(
    function(currentItem) {
      console.log('currentGroup');
      console.log(currentGroup);
      console.log('currentItem');
      console.log(currentItem);
      if (currentItem === previousItem || !previousItem) {
        currentGroup.push(currentItem);
      } else {
        console.log('boundary');
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
      console.log('o done');
      subject.onNext(currentGroup);
      subject.onCompleted();
    });

  return subject;
})
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
//*/

/*
rs.let(function(o) {
  console.log('make subject');
  var subject = new Rx.ReplaySubject();
  var previousItem;
  var currentGroup = [];

  o.subscribe(
    function(currentItem) {
      console.log('currentGroup');
      console.log(currentGroup);
      console.log('currentItem');
      console.log(currentItem);
      if (currentItem === previousItem || !previousItem) {
        currentGroup.push(currentItem);
      } else {
        console.log('boundary');
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
      console.log('o done');
      subject.onNext(currentGroup);
      subject.onCompleted();
    });

  return subject;
})
  .subscribe(
      function(s) {
        console.log('**************************************************s2');
        console.log(s);
      },
      function(err) {
        throw err;
      },
      function() {
        console.log('done169');
      });
//*/
