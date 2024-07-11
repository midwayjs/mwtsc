const { networkInterfaces } = require('os');
const fs = require('fs');
const path = require('path');
const { run } = require('@midwayjs/glob');
const { debuglog } = require('util');
const debug = debuglog('midway:debug');

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

  function later(args) {
    return () => {
      const last = Date.now() - timestamp;

      if (last < wait && last >= 0) {
        timeout = setTimeout(later(args), wait - last);
      } else {
        timeout = null;
        if (!immediate) {
          result = func.apply(context, args);
          context = args = null;
        }
      }
    };
  }

  const debounced = (...argsIn) => {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    context = this;
    timestamp = Date.now();
    args = argsIn;
    const callNow = immediate && !timeout;
    if (!timeout) timeout = setTimeout(later(args), wait);
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

  return ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(filePath)
  );
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

exports.colors = (function getConsoleColors() {
  const format = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',

    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',

    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
  };

  const colors = {};
  for (const color in format) {
    colors[color] = text => `${format[color]}${text}${format.reset}`;
  }
  return colors;
})();

exports.output = function (msg, datePadding = false) {
  let timeStr = '';
  if (datePadding) {
    // 输出当前时间 HH:mm:ss
    const now = new Date();
    timeStr = `[${exports.colors.dim(
      `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
    )}]`;
    console.log(`${timeStr} ${msg}`);
    return;
  }

  console.log(msg);
};

exports.debug = function (msg) {
  debug('[mwtsc]: ' + msg);
};

exports.getRelativeDir = function (rootDir, filePathDir) {
  if (!filePathDir) {
    return filePathDir;
  }
  return path.relative(rootDir, filePathDir);
};

exports.filterFileChangedText = function (data) {
  // return [data without changed text, changedList]
  if (!data.includes('TSFILE:')) {
    return [data, []];
  }

  const lines = data.split('\n');
  const fileChangedList = [];

  let newData = '';
  for (const line of lines) {
    if (/TSFILE:/.test(line)) {
      const match = line.match(/TSFILE:\s+(.*)/);
      if (match && match[1] && !match[1].endsWith('d.ts')) {
        fileChangedList.push(match[1]);
      }
    } else {
      if (line === '' || /\n$/.test(line)) {
        newData += line;
      } else {
        newData += line + '\n';
      }
    }
  }

  return [newData, fileChangedList];
};

exports.triggerMessage = function (message) {
  if (process.send) {
    process.send(message);
  } else {
    process.emit('message', message);
  }
};

const suffixMap = {
  '.ts': ['.js', '.d.ts'],
  '.tsx': ['.jsx', '.d.ts'],
  '.js': ['.js', '.d.ts'],
  '.jsx': ['.jsx', '.d.ts'],
  '.d.ts': ['.d.ts'],
  '.d.tsx': ['.d.ts'],
  '.mts': ['.js', '.d.ts'],
  '.mtsx': ['.jsx', '.d.ts'],
  '.cts': ['.js', '.d.ts'],
  '.ctsx': ['.jsx', '.d.ts'],
};

exports.suffixMapping = function (p) {
  if (!p) return [];
  const suffix = path.extname(p);
  return suffixMap[suffix] || [suffix];
};
