const { forkTsc, forkRun } = require('./process');
const {
  parseArgs,
  debounce,
  deleteFolderRecursive,
  readJSONCFile,
  copyFilesRecursive,
  debug,
  getRelativeDir,
  triggerMessage,
  suffixMapping,
  output,
  colors,
} = require('./util');
const path = require('path');
const { replaceTscAliasPaths } = require('tsc-alias');
const chokidar = require('chokidar');
const fs = require('fs');
const { startProxyServer } = require('./proxy');
const consoleOutput = require('./output');
const { performance } = require('perf_hooks');

function run() {
  const { cmdPath, tscArgs, parentArgs, childArgs } = parseArgs(process.argv);
  const cwd = process.cwd();

  const isCleanDirectory = parentArgs.includes('--cleanOutDir');
  // 是否显式声明 --inspect 或者 --inspect-brk
  const isInspect =
    parentArgs.includes('--inspect') || parentArgs.includes('--inspect-brk');

  debug(`main process running, pid = ${process.pid}`);

  // 调试模式下
  if (process.env.NODE_DEBUG === 'midway:debug') {
    tscArgs.push(['--preserveWatchOutput']);
  }

  // 添加 --listEmittedFiles 参数以便于获取编译后文件列表
  if (
    tscArgs.includes('--watch') &&
    !tscArgs.includes('--listEmittedFiles') &&
    !tscArgs.includes('--version')
  ) {
    tscArgs.push('--listEmittedFiles');
  }

  debug(`cwd: ${cwd}`);
  debug(`cmdPath: ${cmdPath}`);
  debug(`tscArgs: ${tscArgs}`);
  debug(`parentArgs: ${parentArgs}`);
  debug(`childArgs: ${childArgs}`);

  let sourceDir = 'src';
  let outDir;
  let allowJs = false;
  let tsconfig;
  let hasPaths = false;
  let tsconfigPath;
  let sourceRoot;

  const projectIndex = tscArgs.findIndex(
    arg => arg === '--project' || arg === '-p'
  );
  if (projectIndex !== -1) {
    const projectPath = tscArgs[projectIndex + 1];
    tsconfigPath = path.resolve(cwd, projectPath);
    tsconfig = readJSONCFile(tsconfigPath);
  } else {
    tsconfigPath = path.resolve(cwd, 'tsconfig.json');
    tsconfig = readJSONCFile(tsconfigPath);
  }

  if (tsconfig.options) {
    outDir = getRelativeDir(cwd, tsconfig.options.outDir);
    // 解析出来的 tsconfig.json 中的 allowJs 优先级更高
    allowJs = tsconfig.options.allowJs;
    sourceDir = getRelativeDir(cwd, tsconfig.options.rootDir) || sourceDir;
    // 读取 sourceRoot 的变量
    sourceRoot = tsconfig.options.sourceRoot;
    // 判断是否需要启动 tsc-alias
    hasPaths = !!(
      tsconfig.options.paths && Object.keys(tsconfig.options.paths).length > 0
    );
  }

  const outDirIndex = tscArgs.findIndex(arg => arg === '--outDir');
  if (outDirIndex !== -1) {
    outDir = tscArgs[outDirIndex + 1];
  }

  if (!outDir) {
    outDir = 'dist';
  }

  const baseDir = path.resolve(cwd, outDir);
  childArgs.push('--baseDir', baseDir);
  let proxyServer;

  // sourceRoot 是否符合 http://localhost:7788 或者 http://127.0.0.1:7788 或者 http://127.1:7788 类似格式
  if (
    isInspect &&
    sourceRoot &&
    /^http:\/\/(?:localhost|127\.(?:0\.0\.1|1)):\d+\/?$/.test(sourceRoot)
  ) {
    // get port from sourceRoot
    const port = parseInt(sourceRoot.split(':')[2]);
    if (Number.isInteger(port)) {
      // 启动一个本地文件代理服务器
      proxyServer = startProxyServer(path.join(cwd, sourceDir), port);
    }
  }

  if (isCleanDirectory) {
    /**
     * 删除编译目录，有几种情况
     * 1、tscArgs 中有 --outDir 参数，直接删除
     * 2、tscArgs 中没有 --outDir 参数，从 tsconfig.json 中读取 outDir 参数
     * 3、如果 tscArgs 中包含 --project 参数，那么就以 --project 参数指定的 tsconfig.json 为准
     */
    deleteFolderRecursive(path.resolve(cwd, outDir));
  }

  debug(`sourceDir: ${sourceDir}`);
  debug(`outDir: ${outDir}`);
  debug(`allowJs: ${allowJs}`);
  debug(`tsconfig: ${tsconfigPath}`);
  debug(`hasPaths: ${hasPaths}`);
  debug(`sourceRoot: ${sourceRoot}`);

  let runChild;
  const restart = debounce(async fileChangedList => {
    debug(`fileChangedList: ${fileChangedList}`);
    if (fileChangedList && fileChangedList.length === 0) return;

    performance.clearMarks();
    performance.clearMeasures();
    
    // 1. 进程关闭阶段
    performance.mark('kill-start');

    async function aliasReplace() {
      if (hasPaths) {
        // 这里使用全量替换，tsc 增量编译会把老文件修改回去
        await replaceTscAliasPaths({
          configFile: tsconfigPath,
          outDir,
        });
      }
      if (fileChangedList) {
        output(
          `${fileChangedList.length} ${colors.dim('Files has been changed.')}`,
          true
        );
      }
    }

    await Promise.all([runChild && runChild.kill(), aliasReplace()]);
    performance.mark('kill-end');
    // 根据是否有 alias replace 来决定性能统计的名称
    const killMeasureName = hasPaths ? 'Kill & Alias Replace' : 'Process Kill';
    performance.measure(killMeasureName, 'kill-start', 'kill-end');
    
    // 清理代理文件缓存
    if (proxyServer) {
      proxyServer.clearCache();
    }
    debug('Fork new child process');

    // 3. 应用启动阶段
    performance.mark('app-start');
    runChild && runChild.forkChild();
  }, 1000);

  function runAfterTsc() {
    if (hasPaths) {
      // 替换 tsconfig 中的 alias 路径
      replaceTscAliasPaths({
        configFile: tsconfigPath,
        outDir,
      });
    }
    // 拷贝非 ts 文件
    copyFilesRecursive(
      path.join(cwd, sourceDir),
      path.join(cwd, outDir),
      allowJs
    );
  }

  function cleanOutDirAndRestart(p) {
    // p = 'a.ts'
    let changedCnt = 0;
    for (const pa of suffixMapping(p)) {
      const distPath = path.join(cwd, outDir, pa);
      if (!fs.existsSync(distPath)) continue;
      const stat = fs.statSync(distPath);
      changedCnt++;
      // is file
      if (stat.isFile()) {
        // remove file
        fs.unlinkSync(distPath);
      } else {
        // is directory
        deleteFolderRecursive(distPath);
      }
    }

    if (changedCnt) {
      runAfterTsc();
      restart();
    }
  }

  let fileDeleteWatcher;
  function watchDeleteFile() {
    if (fileDeleteWatcher) return;
    const sourceAbsoluteDir = path.join(cwd, sourceDir);
    /**
     * 不同平台的监听有很多差异，所以这里采用全文件监听的方案
     * 文件的添加，修改交给 tsc 监听，这里只监听删除
     */
    fileDeleteWatcher = chokidar
      .watch(sourceAbsoluteDir, {
        cwd: sourceAbsoluteDir,
      })
      .on('all', (event, path) => {
        // windows 下无法触发 unlinkDir 事件
        if (event === 'unlink' || event === 'unlinkDir') {
          cleanOutDirAndRestart(path);
        }
      });
  }

  // 启动执行 tsc 命令
  const perfStats = [];
  let restartPerfStats = [];
  
  // 检查是否需要输出性能统计
  const isPerfInit = childArgs.includes('--perf-init');
  
  // 1. TSC 编译阶段
  performance.mark('tsc-start');
  const child = forkTsc(tscArgs, {
    cwd,
    onFirstWatchCompileSuccess: () => {
      performance.mark('tsc-end');
      performance.measure('TSC Compilation', 'tsc-start', 'tsc-end');
      const tscMeasure = performance.getEntriesByName('TSC Compilation')[0];
      perfStats.push({
        name: 'TSC Compilation',
        duration: tscMeasure.duration
      });

      // 2. 后处理阶段（alias 替换和文件拷贝）
      performance.mark('post-start');
      runAfterTsc();
      performance.mark('post-end');
      performance.measure('Post Processing', 'post-start', 'post-end');
      const postMeasure = performance.getEntriesByName('Post Processing')[0];
      perfStats.push({
        name: hasPaths ? 'Alias Replace & Copy' : 'File Copy',
        duration: postMeasure.duration
      });

      watchDeleteFile();
      
      if (cmdPath) {
        // 3. 应用启动阶段
        performance.mark('app-start');
        runChild = forkRun(cmdPath, childArgs, {
          cwd,
          parentArgs,
        });

        // 设置一次性的 onServerReady 回调
        runChild.onServerReady(
          async (serverReportOption, isFirstCallback, during, debugUrl) => {
            if (isFirstCallback) {
              performance.mark('app-end');
              performance.measure('App Startup', 'app-start', 'app-end');
              const appMeasure = performance.getEntriesByName('App Startup')[0];
              perfStats.push({
                name: 'App Startup',
                duration: appMeasure.duration
              });

              // 第一次启动把端口等信息打印出来
              consoleOutput.renderServerFirstReady(
                serverReportOption,
                during,
                hasPaths,
                debugUrl
              );
              
              if (isPerfInit) {
                consoleOutput.renderPerfStats(perfStats);
              }

              if (proxyServer) {
                proxyServer.start();
              }
              triggerMessage('server-first-ready');
            } else {
              // 重启完成后的处理
              performance.mark('app-end');
              performance.measure('App Restart', 'app-start', 'app-end');
              
              consoleOutput.renderServerReady(during, debugUrl);
              if (isPerfInit) {
                const measures = performance.getEntriesByType('measure');
                const killMeasureName = hasPaths ? 'Kill & Alias Replace' : 'Process Kill';
                const killMeasure = measures.find(m => m.name === killMeasureName);
                const appMeasure = measures.find(m => m.name === 'App Restart');
                
                restartPerfStats = [
                  {
                    name: killMeasureName,
                    duration: killMeasure ? killMeasure.duration : 0
                  },
                  {
                    name: 'App Restart',
                    duration: appMeasure ? appMeasure.duration : 0
                  }
                ];
                consoleOutput.renderPerfStats(restartPerfStats);
              }
              
              triggerMessage('server-ready');
            }
          }
        );
      }
      debug('watch compile success first');
      triggerMessage('watch-compile-success-first');
    },
    onWatchCompileSuccess: fileChangedList => {
      debug('watch compile success');
      triggerMessage('watch-compile-success');
      restart(fileChangedList);
    },
    onWatchCompileFail: () => {
      debug('watch compile fail');
      triggerMessage('watch-compile-fail');
      watchDeleteFile();
      restart.clear();
    },
    onCompileSuccess: () => {
      debug('compile success');
      triggerMessage('compile-success');
      runAfterTsc();
    },
    onCompileFail: (code) => {
      debug('compile fail');
      triggerMessage('compile-fail');
      process.exit(code);
    },
  });
  let customFn = () => {};
  const onExitHandler = async () => {
    await customFn();
  };

  function onSignal() {
    output(`\n${colors.green('Node.js server')} ${colors.dim(`will exit, and please wait patiently.`)}`);
    output(`${colors.dim(`You can shorten the waiting time by adjusting the `)}${colors.cyan('--kill-timeout')}${colors.dim(` parameter.`)}`);
    try {
      restart.clear();
      // 使用 Promise.all 并行执行所有清理任务
      return Promise.all([
        child.kill(),
        runChild && runChild.kill(),
        proxyServer && proxyServer.close(),
        fileDeleteWatcher && fileDeleteWatcher.close(),
      ]).then(() => {
        onExitHandler().then(() => {
          process.exit(0);
        });
      });
    } catch (err) {
      console.error(err);
      return onExitHandler().then(() => {
        process.exit(1);
      });
    }
  }

  process.once('SIGINT', () => {
    onSignal().catch(console.error);  // 不再强制退出
  });
  // kill(3) Ctrl-\
  process.once('SIGQUIT', () => {
    onSignal().catch(console.error);  // 不再强制退出
  });
  // kill(15) default
  process.once('SIGTERM', () => {
    onSignal().catch(console.error);  // 不再强制退出
  });

  return {
    restart,
    exit: onSignal,
    onExit: fn => {
      customFn = fn;
    },
  };
}

exports.run = run;
exports.chokidar = chokidar;
