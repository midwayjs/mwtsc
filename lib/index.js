const { forkTsc, forkRun } = require('./process');
const {
  parseArgs,
  debounce,
  getIp,
  deleteFolderRecursive,
  readJSONCFile,
  copyFilesRecursive,
  output,
  colors,
  debug,
  getRelativeDir,
} = require('./util');
const path = require('path');
const { replaceTscAliasPaths } = require('tsc-alias');
const chokidar = require('chokidar');
const fs = require('fs');

function run() {
  const [runCmd, tscArgs, runArgs, isCleanDirectory] = parseArgs(process.argv);
  const cwd = process.cwd();

  // 调试模式下
  if (process.env.NODE_DEBUG === 'midway:debug') {
    tscArgs.push(['--preserveWatchOutput']);
  }

  // 添加 --listEmittedFiles 参数以便于获取编译后的文件列表
  if (!tscArgs.includes('--listEmittedFiles')) {
    tscArgs.push('--listEmittedFiles');
  }

  debug(`cwd: ${cwd}`);
  debug(`runCmd: ${runCmd}`);
  debug(`tscArgs: ${tscArgs}`);
  debug(`runArgs: ${runArgs}`);
  debug(`isCleanDirectory: ${isCleanDirectory}`);

  let sourceDir = 'src';
  let outDir;
  let allowJs = false;
  let tsconfig;
  let hasPaths = false;
  let tsconfigPath;

  const projectIndex = tscArgs.findIndex(arg => arg === '--project');
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
  runArgs.push('--baseDir', baseDir);

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

  let runChild;
  const restart = debounce(async fileChangedList => {
    debug(`fileChangedList: ${fileChangedList}`);
    if (fileChangedList && fileChangedList.length === 0) return;
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
    const distPath = path.join(cwd, outDir, p);
    if (!fs.existsSync(distPath)) return;
    const stat = fs.statSync(distPath);
    // is file
    if (stat.isFile()) {
      // remove file
      fs.unlinkSync(distPath);
    } else {
      // is directory
      deleteFolderRecursive(distPath);
    }
    runAfterTsc();
    restart();
  }

  const sourceAbsoluteDir = path.join(cwd, sourceDir);
  /**
   * 不同平台的监听有很多差异，所以这里采用全文件监听的方案
   * 文件的添加，修改交给 tsc 监听，这里只监听删除
   */
  const fileDeleteWatcher = chokidar
    .watch(sourceAbsoluteDir, {
      cwd: sourceAbsoluteDir,
    })
    .on('all', (event, path) => {
      if (event === 'unlink' || event === 'unlinkDir') {
        cleanOutDirAndRestart(path);
      }
    });

  // 启动执行 tsc 命令
  const child = forkTsc(tscArgs, {
    cwd,
    onFirstWatchCompileSuccess: () => {
      runAfterTsc();
      if (runCmd) {
        runChild = forkRun(runCmd, runArgs, {
          cwd,
        });
        runChild.onServerReady(
          async (serverReportOption, isFirstCallback, during) => {
            if (isFirstCallback) {
              // 第一次启动把端口等信息打印出来
              console.log('');
              output(
                `${colors.green('Node.js server')} ${colors.dim(
                  'started in'
                )} ${during} ms ${
                  hasPaths
                    ? colors.dim('and enable compile with ') + 'tsc-alias'
                    : ''
                }\n`
              );
              if (serverReportOption && serverReportOption.port) {
                const protocol = serverReportOption.ssl ? 'https' : 'http';
                output(
                  `${colors.green('➜')}  Local:    ${colors.cyan(
                    `${protocol}://127.0.0.1:${colors.bright(
                      serverReportOption.port
                    )}${colors.cyan('/')}`
                  )} `
                );
                const netWorkIp = getIp();
                if (netWorkIp) {
                  output(
                    `${colors.green('➜')}  ${colors.dim(
                      `Network:  ${protocol}://${netWorkIp}:${serverReportOption.port}/ `
                    )}`
                  );
                }
                console.log('');
              }
            } else {
              output(
                `${colors.green('Node.js server')} ${colors.dim(
                  'restarted in'
                )} ${during} ms\n`
              );
            }
          }
        );
      }
    },
    onWatchCompileSuccess: fileChangedList => {
      restart(fileChangedList);
    },
    onWatchCompileFail: () => {
      restart.clear();
    },
    onCompileSuccess: () => {
      runAfterTsc();
    },
  });

  async function onSignal() {
    try {
      restart.clear();
      child.kill();
      if (runChild) {
        await runChild.kill();
      }
      if (fileDeleteWatcher) {
        await fileDeleteWatcher.close();
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
