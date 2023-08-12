const { forkTsc, forkRun } = require('./process');
const { parseArgs } = require('./util');

function run() {
  const [runCmd, tscArgs, runArgs] = parseArgs();

  let runChild;

  const child = forkTsc(tscArgs, {
    onFirstCompileSuccess: () => {
      runChild = forkRun(runCmd, runArgs);
    },
    onCompileSuccess: () => {
      runChild.restart();
    },
  });

  function onSignal() {
    try {
      child.kill();
      runChild.setCloseStatus(false);
      runChild.kill();
      process.exit(0);
    } catch (err) {
      process.exit(1);
    }
  } 

  process.once('SIGINT', onSignal);
  // kill(3) Ctrl-\
  process.once('SIGQUIT', onSignal);
  // kill(15) default
  process.once('SIGTERM', onSignal);
}

exports.run = run;