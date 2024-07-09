const { parentPort, workerData } = require('worker_threads');
const { exec } = require('child_process');
const { mkdtemp, rm, access, readFile, mkdir } = require('fs').promises;
const os = require('os');
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);
const tar = require('tar');

/**
 * 获取 npm 包版本信息
 * @param {string} packageName - 需要获取版本的包名
 * @returns {Promise<string>} - 返回远程最新版本
 */
const getLatestPackageVersion = async packageName => {
  const { stdout } = await execAsync(`npm view ${packageName} version`);
  return stdout.trim();
};

/**
 * 在子线程中下载和更新 npm 包
 * @param {string} packageName - 需要更新的包名
 * @param {string} targetDir - 包的目标地址目录
 */
const updatePackage = async (packageName, targetDir, version = 'latest') => {
  let tempDir;

  try {
    // 创建一个临时目录
    tempDir = await mkdtemp(path.join(os.tmpdir(), 'npm-update-'));
    parentPort.postMessage(`Created temporary directory: ${tempDir}`);

    // 获取远程版本，如果 version 是 'latest'，则获取最新版本号
    const packageVersion =
      version === 'latest'
        ? await getLatestPackageVersion(packageName)
        : version;

    // 检查目标目录是否存在
    let oldVersion = null;
    try {
      await access(targetDir);
      const oldPackageJsonPath = path.join(
        targetDir,
        'package',
        'package.json'
      );
      const oldPackageJson = JSON.parse(
        await readFile(oldPackageJsonPath, 'utf-8')
      );
      oldVersion = oldPackageJson.version;
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }

    // 如果版本相同，不进行更新
    if (oldVersion && oldVersion === packageVersion) {
      parentPort.postMessage(
        `Package ${packageName} version ${packageVersion} in ${targetDir} is up-to-date`
      );
      return;
    }

    // 使用 npm pack 下载包并将其下载至临时目录
    const { stdout: packStdout, stderr: packStderr } = await execAsync(
      `npm pack ${packageName}@${packageVersion}`,
      { cwd: tempDir }
    );

    if (packStdout) parentPort.postMessage(`npm pack stdout: ${packStdout}`);
    if (packStderr) parentPort.postMessage(`npm pack stderr: ${packStderr}`);

    // 找到下载的 tarball 文件
    const tarballName = packStdout.trim().split('\n').pop();
    const tarballPath = path.join(tempDir, tarballName);

    // 解压 tarball 文件到目标目录
    await rm(targetDir, { recursive: true, force: true });
    await mkdir(targetDir, { recursive: true });

    // 解压 tarball 文件
    await tar.x({
      file: tarballPath,
      cwd: targetDir,
    });

    parentPort.postMessage(
      `Updated package ${packageName} to version ${packageVersion} in ${targetDir}`
    );
  } catch (error) {
    // 吞掉所有异常，记录日志，不抛出错误
    parentPort.postMessage(`Failed to update package: ${packageName}`);
    parentPort.postMessage(`Error: ${error.message}`);
  } finally {
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
        parentPort.postMessage(`Cleaned up temporary directory: ${tempDir}`);
      } catch (cleanupError) {
        parentPort.postMessage(
          `Failed to clean up temporary directory: ${tempDir}`
        );
        parentPort.postMessage(`Cleanup error: ${cleanupError.message}`);
      }
    }
  }
};

// 执行更新包
updatePackage(workerData.packageName, workerData.targetDir, workerData.version);
