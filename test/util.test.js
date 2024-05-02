const { parseArgs, deleteFolderRecursive, copyFilesRecursive, readJSONCFile, filterFileChangedText } = require('../lib/util');
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


  describe('copyFilesRecursive', () => {
    const sourceDir = path.join(__dirname, 'fixtures/copy/src');
    const targetDir = path.join(__dirname, 'targetDir/dist');

    // 在每个测试用例之后，确保测试目录已被删除
    beforeEach(() => {
      if (fs.existsSync(targetDir)) {
        deleteFolderRecursive(targetDir);
      }
    });

    it('should copy the directory and all its contents', () => {
      copyFilesRecursive(sourceDir, targetDir, true);

      // 检查目录是否已被复制
      expect(fs.existsSync(targetDir)).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'a.ts'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'a.js'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'b/.ccc'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'b/b.html'))).toBe(true);
    });

    it('should copy the directory and all its contents', () => {
      copyFilesRecursive(sourceDir, targetDir, false);

      // 检查目录是否已被复制
      expect(fs.existsSync(targetDir)).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'a.ts'))).toBe(false);
      expect(fs.existsSync(path.join(targetDir, 'a.js'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'b/.ccc'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'b/b.html'))).toBe(true);
    });
  });


  it('should test read tsconfig file', () => {
    const data = readJSONCFile(path.join(__dirname, 'fixtures/ts_config/tsconfig.json'));
    expect(data.options).toBeDefined();
    expect(data.raw).toBeDefined();
  });

  it('should test read tsconfig file with extends', () => {
    const data = readJSONCFile(path.join(__dirname, 'fixtures/ts_config/tsconfig_extend.json'));
    expect(data.options).toBeDefined();
    expect(data.options.paths).toBeDefined();
    expect(data.raw).toBeDefined();
    expect(data.raw.paths).not.toBeDefined();
  });

  it('should parse output TSFILE', () => {
    expect(filterFileChangedText('TSFILE: /Users/harry/project/application/open-koa-v3/dist/task/hello.d.ts')).toEqual(['', []]);
    expect(filterFileChangedText('TSFILE: /Users/harry/project/application/open-koa-v3/dist/task/hello.js')).toEqual(['', ['/Users/harry/project/application/open-koa-v3/dist/task/hello.js']]);
  });

});
