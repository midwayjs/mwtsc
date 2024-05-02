const { fork, spawn } = require('child_process');
const { filterFileChangedText } = require('./util');
// is windows
const isWin = process.platform === 'win32';

/**
 *
 * @param {*} tscArgs
 * @param {*} options
 * options.onFirstWatchCompileSuccess watch 下第一次编译成功
 * options.onWatchCompileSuccess watch 下编译成功（非第一次）
 * options.onWatchCompileFail watch 下编译失败
 * options.onCompileSuccess 非 watch 下编译成功，比如直接执行 tsc
 * @returns
 */
const forkTsc = (tscArgs = [], options = {}) => {
  let firstStarted = false;
  const child = spawn(isWin ? 'tsc.cmd' : 'tsc', tscArgs, {
    stdio: ['pipe', 'pipe', 'inherit'],
    cwd: options.cwd,
  });

  let totalFileChangedList = [];

  child.stdout.on('data', data => {
    data = data.toString('utf8');
    const [text, fileChangedList] = filterFileChangedText(data);
    if (fileChangedList.length) {
      totalFileChangedList.push(...fileChangedList);
    }

    if (/TS\d{4,5}/.test(text)) {
      // has error
      console.log(text);
      // 如果已经启动了，则传递成功消息给子进程
      options.onWatchCompileFail && options.onWatchCompileFail();
      // 失败后清空
      totalFileChangedList = [];
    } else {
      console.log(text);
      /**
       * 为了减少 tsc 误判，最后一条输出会带有错误信息的数字提示，所以使用正则来简单判断
       * 如果 tsc 改了，这里也要改
       */
      if (/\s\d+\s/.test(text) && /\s0\s/.test(text)) {
        if (!firstStarted) {
          firstStarted = true;
          // emit start
          options.onFirstWatchCompileSuccess &&
            options.onFirstWatchCompileSuccess();
        } else {
          // 如果已经启动了，则传递成功消息给子进程
          options.onWatchCompileSuccess &&
            options.onWatchCompileSuccess([...totalFileChangedList]);
        }
        // 传递后清空
        totalFileChangedList = [];
      }
    }
  });

  child.on('exit', (code, signal) => {
    if (code === 0) {
      options.onCompileSuccess && options.onCompileSuccess();
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
    runChild = fork('wrap.js', runArgs, {
      stdio: 'inherit',
      cwd: __dirname,
      env: {
        CHILD_CMD_PATH: runCmdPath,
        CHILD_CWD: options.cwd || process.cwd(),
        ...process.env,
      },
      execArgv: process.execArgv.concat(['-r', 'source-map-support/register']),
    });
    const onServerReady = async data => {
      try {
        if (data.title === 'server-ready') {
          onServerReadyCallback &&
            (await onServerReadyCallback(
              data,
              isFirstFork,
              Date.now() - startTime
            ));
          runChild.removeListener('message', onServerReady);
        }
      } catch (err) {
        console.error(err);
      }
    };
    runChild.on('message', onServerReady);
  }

  innerFork(true);

  const killRunningChild = async signal => {
    if (isWin) {
      await new Promise(resolve => {
        runChild.once('exit', (code, signal) => {
          resolve();
        });
        runChild.send({
          title: 'server-kill',
        });
      });
    } else {
      runChild.kill(signal);
    }
  };

  return {
    async kill(signal) {
      await killRunningChild(signal);
    },
    async restart() {
      // 杀进程
      await killRunningChild();
      // 重新拉起来
      innerFork(false);
    },
    forkChild() {
      innerFork(false);
    },
    onServerReady(readyCallback) {
      onServerReadyCallback = readyCallback;
    },
    getRealChild() {
      return runChild;
    },
  };
};

exports.forkTsc = forkTsc;
exports.forkRun = forkRun;
