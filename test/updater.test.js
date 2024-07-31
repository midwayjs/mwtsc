const { updatePackageInWorker } = require('../lib/version/updater');
const { checkVersion } = require('../lib/version/check');
const { join } = require('path');
const { access, exists, rmdir, mkdir, writeFile, constants } = require('fs').promises;
const { existsSync } = require('fs');

describe('updater.test.js', () => {
  it('should successfully download and unpack package', async () => {
    const downloadDir = join(__dirname, 'ttt');
    await updatePackageInWorker('@midwayjs/version', join(__dirname, 'ttt'));
    await access(downloadDir);

    // 测试重复执行
    await updatePackageInWorker('@midwayjs/version', join(__dirname, 'ttt'));
    await access(downloadDir);

    // 测试指定版本
    await updatePackageInWorker('@midwayjs/version', join(__dirname, 'ttt'), '3.6.0');
    await access(downloadDir);
    // 检查 pkg 版本
    const pkg = require(join(downloadDir, 'package', 'package.json'));
    expect(pkg.version).toBe('3.6.0');

    // 创建测试目录
    const testDir = join(__dirname, 'ttt_test');
    if (existsSync(testDir)) {
      await rmdir(testDir, { recursive: true });
    }
    await mkdir(join(testDir, 'node_modules/@midwayjs/core'), { recursive: true });
    await mkdir(join(testDir, 'node_modules/@midwayjs/decorator'), { recursive: true });
    await mkdir(join(testDir, 'node_modules/@midwayjs/axios'), { recursive: true });
    // add package.json
    await writeFile(join(testDir, 'node_modules/@midwayjs/core/package.json'), JSON.stringify({ version: '3.6.0' }));
    await writeFile(join(testDir, 'node_modules/@midwayjs/decorator/package.json'), JSON.stringify({ version: '3.6.0' }));
    await writeFile(join(testDir, 'node_modules/@midwayjs/axios/package.json'), JSON.stringify({ version: '3.6.1' }));

    // 测试指定版本
    let err;
    try {
      checkVersion(testDir, join(downloadDir, 'package'));
    } catch (e) {
      err = e;
    }

    expect(err.name).toBe('VersionNeedUpgradeError');
  });
});
