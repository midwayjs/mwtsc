const { forkTsc, forkRun } = require('./process');
const {
  parseArgs,
  debounce,
  getIp,
  deleteFolderRecursive,
  readJSONFile,
} = require('./util');
const path = require('path');

function run() {
  const [runCmd, tscArgs, runArgs, isCleanDirectory] = parseArgs(process.argv);
  const cwd = process.cwd();

  let outDir;
  const projectIndex = tscArgs.findIndex(arg => arg === '--project');
  if (projectIndex !== -1) {
    const projectPath = tscArgs[projectIndex + 1];
    const tsconfig = readJSONFile(path.resolve(cwd, projectPath));
    outDir = tsconfig.compilerOptions.outDir;
  } else {
    const outDirIndex = tscArgs.findIndex(arg => arg === '--outDir');
    if (outDirIndex !== -1) {
      outDir = tscArgs[outDirIndex + 1];
    } else {
      const tsconfig = readJSONFile(path.resolve(cwd, 'tsconfig.json'));
      outDir = tsconfig.compilerOptions.outDir;
    }
  }

  runArgs.push('--baseDir', path.resolve(cwd, outDir));

  if (isCleanDirectory) {
    /**
     * 删除编译目录，有几种情况
     * 1、tscArgs 中有 --outDir 参数，直接删除
     * 2、tscArgs 中没有 --outDir 参数，从 tsconfig.json 中读取 outDir 参数
     * 3、如果 tscArgs 中包含 --project 参数，那么就以 --project 参数指定的 tsconfig.json 为准
     */
    deleteFolderRecursive(path.resolve(cwd, outDir));
  }

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

  async function onSignal() {
    try {
      restart.clear();
      child.kill();
      if (runChild) {
        await runChild.kill();
      }
      process.exit(0);
    } catch (err) {
      console.error(err);
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
