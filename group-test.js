var Rx;
var _ = require('lodash');
var size = 10;
var input = _.fill(Array(2 * size), {key: 1})
  .concat(_.fill(Array(3 * size), {key: 2}))
  .concat(_.fill(Array(1 * size), {key: 3}))
  .concat(_.fill(Array(2), {key: 1}));
//var input = [1, 1, 1, 2, 2, 2, 3, 3, 1];

/*
console.log('group');
Rx = require('./rx-split-on-change-group-by-until.js');
Rx.Observable.from(input)
  .splitOnChange()
  .subscribe(
      function(s) {
        console.log(s);
      },
      function(err) {
        throw err;
      },
      function() {
      });

//*/

//*
console.log('mine');
Rx = require('./rx-split-on-change.js');
Rx.Observable.from(input)
  .splitOnChange()
  .subscribe(
      function(s) {
        console.log(s);
      },
      function(err) {
        throw err;
      },
      function() {
      });
//*/

/*
var Benchmark = require('benchmark');
var suite = new Benchmark.Suite('first-suite');

// add tests
suite
  .add('splitOnChange#mine', function(deferred) {
    Rx.Observable.from(input)
      .splitOnChange(function(x) {
        return x.key;
      })
      .subscribe(
          function(s) {
          },
          function(err) {
            throw err;
          },
          function() {
            deferred.resolve();
          });
  }, {
    defer: true,
    setup: function() {
      Rx = require('./rx-split-on-change.js');
    }
  })
  .add('splitOnChange#groupByUntil', function(deferred) {
    Rx.Observable.from(input)
      .splitOnChange(function(x) {
        return x.key;
      })
      .subscribe(
          function(s) {
          },
          function(err) {
            throw err;
          },
          function() {
            deferred.resolve();
          });
  }, {
    defer: true,
    setup: function() {
      Rx = require('./rx-split-on-change-group-by-until.js');
    }
  })
  // add listeners
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').pluck('name'));
  })
  .run();
//*/
