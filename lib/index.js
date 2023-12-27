const { forkTsc, forkRun } = require('./process');
const { parseArgs, debounce, getIp } = require('./util');

function run() {
  const [runCmd, tscArgs, runArgs] = parseArgs(process.argv);
  const cwd = process.cwd();

  let runChild;
  const restart = debounce(() => {
    runChild && runChild.restart();
  }, 1000);

  const child = forkTsc(tscArgs, {
    cwd,
    onFirstCompileSuccess: () => {
      if (runCmd) {
        runChild = forkRun(runCmd, runArgs, {
          cwd,
        });
        runChild.onServerReady(
          (serverReportOption, isFirstCallback, during) => {
            if (isFirstCallback) {
              console.log(
                `\x1B[32mNode.js server\x1B[0m \x1B[2mstarted in\x1B[0m ${during} ms\n`
              );
              if (serverReportOption && serverReportOption.port) {
                const protocol = serverReportOption.ssl ? 'https' : 'http';
                console.log(
                  `\x1B[32m➜\x1B[0m  Local:    \x1B[36m${protocol}://127.0.0.1:\x1B[1m${serverReportOption.port}/ \x1B[0m`
                );
                const netWorkIp = getIp();
                if (netWorkIp) {
                  console.log(
                    `\x1B[32m➜\x1B[0m  \x1B[2mNetwork:  ${protocol}://${netWorkIp}:${serverReportOption.port}/ \x1B[0m`
                  );
                }
                console.log('');
              }
            } else {
              // 输出当前时间 HH:mm:ss
              const now = new Date();
              const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
              console.log(
                `[\x1B[2m${timeStr}\x1B[0m] \x1B[32mNode.js server\x1B[0m \x1B[2mrestarted in\x1B[0m ${during} ms\n`
              );
            }
          }
        );
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
