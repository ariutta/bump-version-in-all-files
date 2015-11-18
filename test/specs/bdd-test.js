var ask = require('./ask');
// ask is promise-returning stdin question
var bddStdin = require('bdd-stdin');
describe('ask', function() {
  it('asks one question', function() {
    bddStdin('answer');
    return ask('type "answer"')
      .then(function(response) {
        console.assert(response === 'answer');
      });
  });
});
