const readline = require('readline');
const { getLocalizedString } = require('../locale');
const { join } = require('path');
const { existsSync, readFileSync } = require('fs');
const { satisfies } = require('compare-versions');
const { updatePackageInWorker } = require('./updater');
const { debug, output } = require('../util');

class VersionNeedUpgradeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'VersionNeedUpgradeError';
  }
}

/**
 * 获取实际安装的版本
 * @param {*} pkgName
 * @param {*} resolveMode
 * @param {*} options
 * @returns
 */
function getVersion(pkgName, cwd, resolveMode = true) {
  try {
    if (resolveMode) {
      return require(join(cwd, 'node_modules', `${pkgName}/package.json`))
        .version;
    } else {
      return require(`${pkgName}/package.json`).version;
    }
  } catch (e) {
    return undefined;
  }
}

function getVersionFile(coreVersion, decoratorVersion, baseDir) {
  // 新版本 core 和 decorator 的版本应该是一样的
  decoratorVersion = decoratorVersion || coreVersion;
  let versionFile = join(
    baseDir,
    `versions/${decoratorVersion.replace(/\./g, '_')}-${coreVersion.replace(
      /\./g,
      '_'
    )}.json`
  );

  if (!existsSync(versionFile)) {
    // 修正一次
    versionFile = join(
      baseDir,
      `versions/${coreVersion.replace(/\./g, '_')}-${coreVersion.replace(
        /\./g,
        '_'
      )}.json`
    );
  }

  if (!existsSync(versionFile)) {
    return;
  }
  return versionFile;
}

function checkVersion(cwd, midwayVersionDir) {
  const coreVersion = getVersion('@midwayjs/core', cwd);

  // 新版本 core 和 decorator 的版本应该是一样的
  const decoratorVersion = getVersion('@midwayjs/decorator', cwd);
  const result = [];
  const versionFile = getVersionFile(
    coreVersion,
    decoratorVersion,
    midwayVersionDir
  );

  if (!versionFile) {
    // 版本文件不存在，不进行检查，要么就是当前业务用的框架版本太旧了，找不到了，要么就是框架版本太新了，版本文件还没来得及更新，这两种情况概率不高，暂时都忽略检查
    return;
  }

  const text = readFileSync(versionFile, 'utf-8');
  const versions = Object.assign({}, JSON.parse(text));

  // 当前版本的包信息列表
  const pkgList = Object.keys(versions);

  for (const pkgName of pkgList) {
    const version = getVersion(pkgName, cwd);
    if (!version) {
      continue;
    }

    // 格式化 version 的版本列表，变为数组形式，从小到大排列
    versions[pkgName] = [].concat(versions[pkgName]);

    if (versions[pkgName].indexOf(version) !== -1) {
      // ok
    } else {
      // 支持 semver 对比
      // eslint-disable-next-line no-empty
      if (versions[pkgName].some(v => satisfies(version, v))) {
      } else {
        /**
         * 如果组件当前版本满足 ~coreVersion 的话，说明是 patch 版本，需要中断检查去更新 midway-version
         */
        if (satisfies(version, `~${coreVersion}`)) {
          throw new VersionNeedUpgradeError(
            `Package ${pkgName} version ${version} is too old, need to upgrade`
          );
        } else {
          // 否则说明超出了 patch 的范畴，真的需要提示
          result.push({
            name: pkgName,
            current: version,
            allow: versions[pkgName],
          });
        }
      }
    }
  }

  return result;
}

function createCLIMessage(result, callback) {
  // 创建 readline 接口实例
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  output(getLocalizedString('versionWarn', [result.length]));
  output('');
  for (const item of result) {
    output(
      getLocalizedString('versionItem', [
        item.name.padEnd(25),
        item.current.padEnd(10),
        item.allow.join(', '),
      ])
    );
  }
  output('');
  output(getLocalizedString('updateTip'));
  output('');
  // 提示用户输入
  rl.question(getLocalizedString('continuePrompt'), answer => {
    if (
      answer.toLowerCase() === 'yes' ||
      answer.toLowerCase() === 'y' ||
      answer.toLowerCase() === '是' ||
      answer.toLowerCase() === 'y'
    ) {
      console.log(getLocalizedString('proceedMessage'));
      callback();
    } else if (
      answer.toLowerCase() === 'no' ||
      answer.toLowerCase() === 'n' ||
      answer.toLowerCase() === '否' ||
      answer.toLowerCase() === 'n'
    ) {
      console.log(getLocalizedString('exitMessage'));
      // 插入退出的代码
    } else {
      console.log(getLocalizedString('invalidInput'));
      rl.close();
      process.exit(1);
    }

    // 关闭 readline 接口
    rl.close();
  });
}

function check(callback) {
  /**
   * 1、如果不是 midway 项目，跳过
   * 2、如果 node_modules 不存在，跳过
   * 3、如果 @midwayjs/version 不存在，则进行异步下载
   * 4、如果 @midwayjs/version 以及对应的版本文件存在，则进行版本检查
   */
  const cwd = process.cwd();
  if (!existsSync(join(cwd, 'package.json'))) {
    callback();
    return;
  }

  const pkg = require(join(cwd, 'package.json'));
  if (!pkg.dependencies || !pkg.dependencies['@midwayjs/core']) {
    debug('Not midway project and skip');
    callback();
    return;
  }
  if (!existsSync(join(cwd, 'node_modules'))) {
    debug('No node_modules and skip');
    callback();
    return;
  }

  // 将 @midwayjs/version 下载到 mwtsc 包的根目录
  const midwayVersionPkgDir = join(__dirname, '../../midway-version');
  if (!existsSync(midwayVersionPkgDir)) {
    // 异步下载，不影响主进程
    updatePackageInWorker('@midwayjs/version', midwayVersionPkgDir);
    debug('Downloading @midwayjs/version and skip');
    callback();
  } else {
    try {
      // 检查版本
      const result = checkVersion(cwd, join(midwayVersionPkgDir, 'package'));
      if (result && result.length) {
        debug(`Package version check failed, result=${result}`);
        createCLIMessage(result, callback);
      } else {
        debug('Package version check success');
        callback();
      }
    } catch (err) {
      if (err instanceof VersionNeedUpgradeError) {
        // 异步下载，不影响主进程
        updatePackageInWorker('@midwayjs/version', midwayVersionPkgDir);
        debug(
          'Find package version need upgrade, downloading @midwayjs/version and skip check'
        );
      } else {
        debug(`Package version check failed, error=${err}`);
      }
      callback();
    }
  }
}

exports.check = check;
exports.checkVersion = checkVersion;
