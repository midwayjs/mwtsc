const { fork, spawn } = require('child_process');
const { filterFileChangedText, debug, output, colors } = require('./util');
const { CHILD_PROCESS_EXCEPTION_EXIT_CODE } = require('./constants');
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
    shell: isWin ? true : undefined,
  });

  debug(`fork tsc process, pid = ${child.pid}`);

  const totalFileChangedList = new Set();

  child.stdout.on('data', data => {
    data = data.toString('utf8');
    const [text, fileChangedList] = filterFileChangedText(data);
    if (fileChangedList.length) {
      for (const file of fileChangedList) {
        totalFileChangedList.add(file);
      }
    }

    if (/TS\d{4,5}/.test(text)) {
      // has error
      console.log(text);
      // 如果已经启动了，则传递成功消息给子进程
      options.onWatchCompileFail && options.onWatchCompileFail();
      // 失败后清空
      totalFileChangedList.clear();
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
            options.onWatchCompileSuccess(Array.from(totalFileChangedList));
        }
        // 传递后清空
        totalFileChangedList.clear();
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
  /**
   * 记录上一次启动状态, undefined 代表未启动
   * 有可能自定义启动入口不会触发 server-ready
   * 只在 --keepalive 下有效
   */
  let lastBootstrapStatus = undefined;

  function innerFork(isFirstFork = false) {
    const startTime = Date.now();
    runChild = fork('wrap.js', runArgs, {
      stdio: 'inherit',
      cwd: __dirname,
      env: {
        CHILD_CMD_PATH: runCmdPath,
        CHILD_CWD: options.cwd || process.cwd(),
        MWTSC_DEVELOPMENT_ENVIRONMENT: 'true',
        ...process.env,
      },
      execArgv: process.execArgv.concat(['-r', 'source-map-support/register']),
    });
    debug(`fork run process, pid = ${runChild.pid}`);
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
          lastBootstrapStatus = true;
        }
      } catch (err) {
        console.error(err);
        lastBootstrapStatus = false;
      }
    };
    runChild.on('message', onServerReady);
    if (runArgs.includes('--keepalive')) {
      runChild.once('exit', code => {
        if (code === CHILD_PROCESS_EXCEPTION_EXIT_CODE) {
          output(colors.red('*'.repeat(120)));
          output(
            `A ${colors.red(
              `${colors.bright(
                'Critical unhandledRejection or uncaughtException'
              )}`
            )} was detected and the process has exited automatically.`
          );
          output('Please make sure to handle it.');
          output(
            'The --keepalive parameter was enabled, we will do our best to ensure the process remains normal.'
          );
          output(colors.red('*'.repeat(120)));
          if (lastBootstrapStatus === undefined || lastBootstrapStatus) {
            // 只有上一次启动成功了，才继续保活拉起，如果启动就失败了，就停止重启
            innerFork(false);
          }
        } else if (code !== 0) {
          lastBootstrapStatus = false;
        }
      });
    }
  }

  innerFork(true);

  const killRunningChild = async signal => {
    if (isWin) {
      await new Promise(resolve => {
        if (!runChild || runChild.exitCode !== null) {
          // has exited
          resolve();
        }
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
