const cp = require('child_process');

function execa(...args) {
  // mock execa
  return cp.spawn(...args);
}

exports.execa = execa;
