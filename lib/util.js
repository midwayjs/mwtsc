const { networkInterfaces } = require('os');
const fs = require('fs');
const path = require('path');
const { run } = require('@midwayjs/glob');

exports.parseArgs = argv => {
  // 去除头两位参数
  let pargs = argv.slice(2);

  // 是否清理目录
  let isCleanDirectory = false;
  if (pargs.includes('--cleanOutDir')) {
    isCleanDirectory = true;
    // 移除 --cleanOutDir 命令
    pargs.splice(
      pargs.findIndex(arg => arg === '--cleanOutDir'),
      1
    );
  }

  // 找到 --run 命令以及后面的所有参数
  const runIndex = pargs.findIndex(arg => arg === '--run');

  if (runIndex === -1) {
    return [undefined, pargs, [], isCleanDirectory];
  }

  // 分出 --run，后一个路径，以及剩余的其他参数
  const runArgs = pargs.slice(runIndex + 1);

  // 简单约定，--run 后面的参数都是给子进程的
  const [runCmdPath, ...runChildArgs] = runArgs;

  // 从 pargs 中移除 --run 命令后面所有参数
  if (runIndex !== -1) {
    pargs = pargs.slice(0, runIndex);
  }
  return [runCmdPath, pargs, runChildArgs, isCleanDirectory];
};

exports.debounce = function (func, wait, immediate = false) {
  let timeout, args, context, timestamp, result;
  if (null == wait) wait = 100;

  function later() {
    const last = Date.now() - timestamp;

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last);
    } else {
      timeout = null;
      if (!immediate) {
        result = func.apply(context, args);
        context = args = null;
      }
    }
  }

  const debounced = (...args) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    context = this;
    timestamp = Date.now();
    const callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later, wait);
    if (callNow) {
      result = func.apply(context, args);
      context = args = null;
    }

    return result;
  };

  debounced.clear = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  };

  debounced.flush = () => {
    if (timeout) {
      result = func.apply(context, args);
      context = args = null;

      clearTimeout(timeout);
      timeout = null;
    }
  };

  return debounced;
};

exports.getIp = function () {
  const interfaces = networkInterfaces(); // 在开发环境中获取局域网中的本机iP地址
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (const alias of iface) {
      if (
        alias.family === 'IPv4' &&
        alias.address !== '127.0.0.1' &&
        !alias.internal
      ) {
        return alias.address;
      }
    }
  }
};

function deleteFolderRecursive(directory) {
  if (fs.existsSync(directory)) {
    fs.readdirSync(directory).forEach((file, index) => {
      const curPath = path.join(directory, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(directory);
  }
}

exports.deleteFolderRecursive = deleteFolderRecursive;

exports.readJSONFile = function (filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (err) {
    return {};
  }
};

exports.readJSONCFile = function (filePath) {
  // eslint-disable-next-line node/no-unpublished-require
  const ts = require('typescript');
  const configFile = ts.readConfigFile(filePath, ts.sys.readFile);
  if (configFile.error) {
    console.error(configFile.error.messageText);
  }
  return configFile.config;
};

function ensureDirectory(directory) {
  if (fs.existsSync(directory)) {
    return;
  }

  const parentDirectory = path.dirname(directory);
  ensureDirectory(parentDirectory);
  fs.mkdirSync(directory);
}

exports.copyFilesRecursive = function (sourceDir, targetDir, allowJS) {
  const ignorePattern = [
    '**/node_modules/**',
    '**/__test__/**', // jest 测试目录
    '**/*.ts',
  ];

  /**
   * 如果 allowJS 开启，则 ts 会自己处理 js 文件的拷贝，所以不需要重复拷贝
   */
  if (allowJS) {
    ignorePattern.push('**/*.js');
  }

  const files = run(['**/*', '**/.*'], {
    cwd: sourceDir,
    ignore: ignorePattern,
  });
  for (const file of files) {
    const relativePath = path.relative(sourceDir, file);
    const sourceFile = path.resolve(sourceDir, file);
    const targetFile = path.resolve(targetDir, relativePath);

    ensureDirectory(path.dirname(targetFile));
    fs.copyFileSync(sourceFile, targetFile);
  }
};
