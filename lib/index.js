const { forkTsc, forkRun } = require('./process');
const { parseArgs, debounce } = require('./util');

function run() {
  const [runCmd, tscArgs, runArgs] = parseArgs(process.argv);
  const cwd = process.cwd();

  let runChild;
  let restart = debounce(() => {
    runChild && runChild.restart();
  }, 1000);

  const child = forkTsc(tscArgs, {
    cwd,
    onFirstCompileSuccess: () => {
      if (runCmd) {
        runChild = forkRun(runCmd, runArgs, {
          cwd,
        });
      }
    },
    onCompileSuccess: () => {
      restart();
    },
    onCompileFail: () => {
      restart.clear();
    },
  });

  function onSignal() {
    try {
      restart.clear();
      child.kill();
      // runChild && runChild.setCloseStatus(false);
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
