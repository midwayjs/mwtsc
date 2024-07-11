const { updatePackageInWorker } = require('../lib/version/updater');
const { join } = require('path');
const { access } = require('fs').promises;

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
  });
});
