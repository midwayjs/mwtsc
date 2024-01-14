const { parseArgs, deleteFolderRecursive } = require('../lib/util');
const fs = require('fs');
const path = require('path')

describe('test/util.test.js', () => {
  it('should parse', () => {
    expect(parseArgs(['node', 'tsc'])).toEqual([undefined, [], [], false]);
    expect(parseArgs(['node', 'tsc', '--watch'])).toEqual([undefined, ['--watch'], [], false]);
    expect(parseArgs(['node', 'tsc', '--watch', '--run', 'index.js'])).toEqual(['index.js', ['--watch'], [], false]);
    expect(parseArgs(['node', 'tsc', '--watch', '--run', 'index.js', '--', '--port', '3000'])).toEqual(['index.js', ['--watch'], ['--', '--port', '3000'], false]);
    expect(parseArgs(['node', 'tsc', '--watch', '--project', 'tsconfig.prod.json'])).toEqual([undefined, ['--watch', '--project', 'tsconfig.prod.json'], [], false]);
    expect(parseArgs(['node', 'tsc', '--watch', '--run'])).toEqual([undefined, ['--watch'], [], false]);
    expect(parseArgs(['node', 'tsc', '--cleanOutDir'])).toEqual([undefined, [], [], true]);
    expect(parseArgs(['node', 'tsc', '--watch', '--cleanOutDir', '--build', '--run'])).toEqual([undefined, ['--watch', '--build'], [], true]);
  });

  describe('deleteFolderRecursive', () => {
    const testDirPath = path.join(__dirname, 'testDir');

    // 在每个测试用例之前，创建一个测试目录和一些测试文件
    beforeEach(() => {
      fs.mkdirSync(testDirPath, { recursive: true });
      fs.writeFileSync(path.join(testDirPath, 'file1.txt'), 'Hello, world!');
      fs.mkdirSync(path.join(testDirPath, 'subDir'));
      fs.writeFileSync(path.join(testDirPath, 'subDir', 'file2.txt'), 'Hello, world!');
    });

    // 在每个测试用例之后，确保测试目录已被删除
    afterEach(() => {
      if (fs.existsSync(testDirPath)) {
        deleteFolderRecursive(testDirPath);
      }
    });

    it('should delete the directory and all its contents', () => {
      deleteFolderRecursive(testDirPath);

      // 检查目录是否已被删除
      expect(fs.existsSync(testDirPath)).toBe(false);
    });
  });
});
