const { forkTsc, forkRun } = require('./process');
const { parseArgs } = require('./util');

function run() {
  const [runCmd, tscArgs, runArgs] = parseArgs(process.argv);

  let runChild;

  const child = forkTsc(tscArgs, {
    onFirstCompileSuccess: () => {
      if (runCmd) {
        runChild = forkRun(runCmd, runArgs);
      }
    },
    onCompileSuccess: () => {
      runChild && runChild.restart();
    },
  });

  function onSignal() {
    try {
      child.kill();
      runChild && runChild.setCloseStatus(false);
      runChild && runChild.kill();
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
