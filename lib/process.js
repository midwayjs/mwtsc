const { fork, spawn } = require('child_process');
// is windows
const isWin = process.platform === 'win32';

/**
 *
 * @param {*} tscArgs
 * @param {*} options
 * options.onFirstCompileSuccess
 * options.onCompileSuccess
 * options.onCompileFail
 * @returns
 */
const forkTsc = (tscArgs = [], options = {}) => {
  let firstStarted = false;
  const child = spawn(isWin ? 'tsc.cmd' : 'tsc', tscArgs, {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: options.cwd,
  });

  child.stdout.on('data', data => {
    data = data.toString('utf8');
    if (/TS\d{4,5}/.test(data)) {
      // has error
      console.log(data);
      // 如果已经启动了，则传递成功消息给子进程
      options.onCompileFail && options.onCompileFail();
    } else {
      console.log(data);
      /**
       * 为了减少 tsc 误判，最后一条输出会带有错误信息的数字提示，所以使用正则来简单判断
       * 如果 tsc 改了，这里也要改
       */
      if (/\s\d+\s/.test(data) && /\s0\s/.test(data)) {
        if (!firstStarted) {
          firstStarted = true;
          // emit start
          options.onFirstCompileSuccess && options.onFirstCompileSuccess();
        } else {
          // 如果已经启动了，则传递成功消息给子进程
          options.onCompileSuccess && options.onCompileSuccess();
        }
      }
    }
  });

  return child;
};

const forkRun = (runCmdPath, runArgs = [], options = {}) => {
  // 判断路径是否是包名还是路径
  if (!runCmdPath.startsWith('.') && !runCmdPath.startsWith('/')) {
    runCmdPath = require.resolve(runCmdPath);
  }
  let runChild;
  let onServerReadyCallback;

  function innerFork(isFirstFork = false) {
    const startTime = Date.now();
    runChild = fork(runCmdPath, runArgs, {
      stdio: 'inherit',
      cwd: options.cwd,
      // execArgv: process.execArgv.concat(['-r', 'source-map-support/register'])
    });

    const onServerReady = data => {
      if (data.title === 'server-ready') {89
        onServerReadyCallback &&
          onServerReadyCallback(data, isFirstFork, Date.now() - startTime);
        runChild.removeListener('message', onServerReady);
      }
    };
    runChild.on('message', onServerReady);
  }

  innerFork(true);

  return {
    kill: signal => {
      runChild.kill(signal);
    },
    restart() {
      // 杀进程
      runChild.kill();
      // 重新拉起来
      innerFork();
    },
    onServerReady(readyCallback) {
      onServerReadyCallback = readyCallback;
    },
  };
};

exports.forkTsc = forkTsc;
exports.forkRun = forkRun;
