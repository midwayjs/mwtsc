const cp = require('child_process');

function execa(cmd, args, options) {
  // mock execa
  return cp.spawn(cmd, args, Object.assign({
    cwd: __dirname,
    stdio: 'ignore',
  }, options));
}

exports.execa = execa;
