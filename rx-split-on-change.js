var Rx = require('rx');

function splitOnChange(source, keySelector) {
  var subject = new Rx.ReplaySubject();

  var previousKey;
  var currentGroup = [];

  if (typeof keySelector !== 'function') {
    keySelector = function(x) {
      return x;
    };
  }

  source.subscribe(
    function(currentItem) {
      var currentKey = keySelector(currentItem);
      if ((currentKey === previousKey) || !previousKey) {
        currentGroup.push(currentItem);
      } else {
        subject.onNext(currentGroup);
        currentGroup = [];
        currentGroup.push(currentItem);
      }
      previousKey = currentKey;
    },
    function(err) {
      throw err;
    },
    function() {
      subject.onNext(currentGroup);
      subject.onCompleted();
    });

  return subject;
}

Rx.Observable.prototype.splitOnChange = function(keySelector) {
  var source = this;
  return splitOnChange(source, keySelector);
};

module.exports = Rx;
