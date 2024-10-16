const { parseArgs, deleteFolderRecursive, copyFilesRecursive, readJSONCFile, filterFileChangedText, convertPosixToGnu } = require('../lib/util');
const fs = require('fs');
const path = require('path')

describe('test/util.test.js', () => {
  describe('parseArgs', () => {
    it('should correctly parse basic arguments', () => {
      const result = parseArgs(['node', 'mwtsc', '--watch', '--project', 'tsconfig.production.json']);
      expect(result).toEqual({
        cmdPath: undefined,
        tscArgs: ['--watch', '--project', 'tsconfig.production.json'],
        parentArgs: [],
        childArgs: []
      });
    });

    it('should correctly parse arguments with --run', () => {
      const result = parseArgs(['node', 'mwtsc', '--watch', '--project', 'tsconfig.production.json', '--run', './bootstrap.js', '--port', '3000']);
      expect(result).toEqual({
        cmdPath: './bootstrap.js',
        tscArgs: ['--watch', '--project', 'tsconfig.production.json'],
        parentArgs: [],
        childArgs: ['--port', '3000']
      });
    });

    it('should correctly handle notTscArgs', () => {
      const result = parseArgs(['node', 'mwtsc', '--watch', '--cleanOutDir', '--inspect', '9229', '--project', 'tsconfig.json', '--run', './app.js']);
      expect(result).toEqual({
        cmdPath: './app.js',
        tscArgs: ['--watch', '--project', 'tsconfig.json'],
        parentArgs: ['--cleanOutDir', '--inspect', '9229'],
        childArgs: []
      });
    });

    it('should correctly handle GNU-style arguments', () => {
      const result = parseArgs(['node', 'mwtsc', '--watch', '--port=3000', '--inspect-brk=9230', '--run', './app.js', '--env=production']);
      expect(result).toEqual({
        cmdPath: './app.js',
        tscArgs: ['--watch', '--port', '3000'],
        parentArgs: ['--inspect-brk', '9230'],
        childArgs: ['--env', 'production']
      });
    });

    it('should correctly handle POSIX-style arguments', () => {
      const result = parseArgs(['node', 'mwtsc', '--watch', '--port', '3000', '--inspect-brk', '9230', '--run', './app.js', '--env', 'production']);
      expect(result).toEqual({
        cmdPath: './app.js',
        tscArgs: ['--watch', '--port', '3000'],
        parentArgs: ['--inspect-brk', '9230'],
        childArgs: ['--env', 'production']
      });
    });

    it('should correctly handle mixed-style arguments', () => {
      const result = parseArgs(['node', 'mwtsc', '--watch', '--port', '3000', '--outDir=./dist', '--cleanOutDir', '--inspect=9229', '--run', './app.js']);
      expect(result).toEqual({
        cmdPath: './app.js',
        tscArgs: ['--watch', '--port', '3000', '--outDir', './dist'],
        parentArgs: ['--cleanOutDir', '--inspect', '9229'],
        childArgs: []
      });
    });

    it('should correctly handle Node.js inspect arguments without value', () => {
      const result = parseArgs(['node', 'mwtsc', '--watch', '--inspect', '--run', './app.js']);
      expect(result).toEqual({
        cmdPath: './app.js',
        tscArgs: ['--watch'],
        parentArgs: ['--inspect'],
        childArgs: []
      });
    });

    it('should correctly handle Node.js inspect arguments with port', () => {
      const result = parseArgs(['node', 'mwtsc', '--watch', '--inspect=9229', '--run', './app.js']);
      expect(result).toEqual({
        cmdPath: './app.js',
        tscArgs: ['--watch'],
        parentArgs: ['--inspect', '9229'],
        childArgs: []
      });
    });

    it('should correctly handle Node.js inspect-brk arguments', () => {
      const result = parseArgs(['node', 'mwtsc', '--watch', '--inspect-brk=0.0.0.0:9229', '--run', './app.js']);
      expect(result).toEqual({
        cmdPath: './app.js',
        tscArgs: ['--watch'],
        parentArgs: ['--inspect-brk', '0.0.0.0:9229'],
        childArgs: []
      });
    });
  });

  describe('convertPosixToGnu', () => {
    it('should convert POSIX-style arguments to GNU-style', () => {
      const posixArgs = ['--watch', '--port', '3000', '--inspect', '9229', '--outDir', './dist'];
      const expectedGnuArgs = ['--watch', '--port=3000', '--inspect=9229', '--outDir=./dist'];
      expect(convertPosixToGnu(posixArgs)).toEqual(expectedGnuArgs);
    });

    it('should handle arguments without values correctly', () => {
      const posixArgs = ['--watch', '--cleanOutDir', '--port', '3000'];
      const expectedGnuArgs = ['--watch', '--cleanOutDir', '--port=3000'];
      expect(convertPosixToGnu(posixArgs)).toEqual(expectedGnuArgs);
    });

    it('should not change already GNU-style arguments', () => {
      const gnuArgs = ['--watch', '--port=3000', '--inspect=9229'];
      expect(convertPosixToGnu(gnuArgs)).toEqual(gnuArgs);
    });

    it('should handle mixed POSIX and GNU-style arguments', () => {
      const mixedArgs = ['--watch', '--port', '3000', '--inspect=9229', '--outDir', './dist'];
      const expectedGnuArgs = ['--watch', '--port=3000', '--inspect=9229', '--outDir=./dist'];
      expect(convertPosixToGnu(mixedArgs)).toEqual(expectedGnuArgs);
    });
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
