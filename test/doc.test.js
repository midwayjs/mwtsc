const { join } = require('path');
const { existsSync, readFileSync, unlinkSync, rmdirSync } = require('fs');
const { DocGenerator, DocParser, DocMiddleware } = require('../lib/doc');

describe('/test/doc.js', () => {
  const testOutputDir = join(__dirname, 'fixtures/doc_output');

  afterEach(() => {
    // 清理测试生成的文件
    if (existsSync(testOutputDir)) {
      const files = require('fs').readdirSync(testOutputDir);
      files.forEach(file => {
        unlinkSync(join(testOutputDir, file));
      });
      rmdirSync(testOutputDir);
    }
  });

  describe('DocGenerator', () => {
    it('should create a DocGenerator instance', () => {
      const generator = new DocGenerator({
        outputDir: testOutputDir,
        projectRoot: __dirname,
      });
      expect(generator).toBeDefined();
      expect(generator.outputDir).toBe(testOutputDir);
    });

    it('should add sections correctly', () => {
      const generator = new DocGenerator({
        outputDir: testOutputDir,
        projectRoot: __dirname,
      });

      generator.addSection('测试章节', '这是测试内容', 2);
      expect(generator.sections).toHaveLength(1);
      expect(generator.sections[0].title).toBe('测试章节');
      expect(generator.sections[0].content).toBe('这是测试内容');
      expect(generator.sections[0].level).toBe(2);
    });

    it('should generate API documentation', () => {
      const generator = new DocGenerator();
      const apiInfo = {
        name: 'testFunction',
        description: '这是一个测试函数',
        params: [
          { name: 'param1', type: 'string', required: true, description: '参数1' },
          { name: 'param2', type: 'number', required: false, description: '参数2' },
        ],
        returns: {
          type: 'boolean',
          description: '返回结果',
        },
        example: 'testFunction("hello", 123);',
      };

      const doc = generator.generateAPIDoc(apiInfo);
      expect(doc).toContain('testFunction');
      expect(doc).toContain('参数1');
      expect(doc).toContain('参数2');
      expect(doc).toContain('boolean');
      expect(doc).toContain('testFunction("hello", 123);');
    });

    it('should generate architecture documentation', () => {
      const generator = new DocGenerator();
      const doc = generator.generateArchitectureDoc();
      expect(doc).toContain('架构文档');
      expect(doc).toContain('系统架构图');
      expect(doc).toContain('核心模块');
      expect(doc).toContain('lib/index.js');
    });

    it('should generate and save documentation', () => {
      const generator = new DocGenerator({
        outputDir: testOutputDir,
        projectRoot: __dirname,
      });

      generator.addSection('介绍', '项目介绍内容');
      generator.addSection('使用', '使用方法');

      const filePath = generator.save('test_doc.md');
      expect(existsSync(filePath)).toBeTruthy();

      const content = readFileSync(filePath, 'utf8');
      expect(content).toContain('mwtsc 技术文档');
      expect(content).toContain('介绍');
      expect(content).toContain('使用');
    });
  });

  describe('DocParser', () => {
    it('should create a DocParser instance', () => {
      const parser = new DocParser();
      expect(parser).toBeDefined();
    });

    it('should parse function comments correctly', () => {
      const parser = new DocParser();
      const code = `
/**
 * 测试函数
 * @param {string} name - 名称
 * @param {number} age - 年龄
 * @returns {boolean} 是否成功
 */
function testFunc(name, age) {
  return true;
}
      `;

      const docs = parser.parseFunctionComments(code);
      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe('testFunc');
      expect(docs[0].params).toHaveLength(2);
      expect(docs[0].params[0].name).toBe('name');
      expect(docs[0].params[0].type).toBe('string');
      expect(docs[0].returns.type).toBe('boolean');
    });

    it('should parse async function comments', () => {
      const parser = new DocParser();
      const code = `
/**
 * 异步测试函数
 * @param {string} input - 输入
 * @returns {Promise<Object>} 结果
 */
async function asyncFunc(input) {
  return {};
}
      `;

      const docs = parser.parseFunctionComments(code);
      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe('asyncFunc');
    });

    it('should handle code without JSDoc comments', () => {
      const parser = new DocParser();
      const code = `
function noDocFunc() {
  return 1;
}
      `;

      const docs = parser.parseFunctionComments(code);
      expect(docs).toHaveLength(0);
    });
  });

  describe('DocMiddleware', () => {
    it('should create a DocMiddleware instance', () => {
      const middleware = new DocMiddleware({
        outputDir: testOutputDir,
        projectRoot: __dirname,
      });
      expect(middleware).toBeDefined();
      expect(middleware.enabled).toBe(true);
    });

    it('should be disabled when enabled is false', () => {
      const middleware = new DocMiddleware({
        enabled: false,
      });
      expect(middleware.enabled).toBe(false);
    });

    it('should call beforeCompile when enabled', () => {
      const middleware = new DocMiddleware({
        outputDir: testOutputDir,
        projectRoot: __dirname,
      });

      middleware.beforeCompile({
        sourceDir: 'src',
        outDir: 'dist',
        tsconfigPath: 'tsconfig.json',
      });

      expect(middleware.generator.sections).toHaveLength(1);
      expect(middleware.generator.sections[0].title).toBe('编译配置');
    });

    it('should not call beforeCompile when disabled', () => {
      const middleware = new DocMiddleware({
        enabled: false,
      });

      middleware.beforeCompile({});
      expect(middleware.generator.sections).toHaveLength(0);
    });

    it('should call onCompileSuccess when enabled', () => {
      const middleware = new DocMiddleware({
        outputDir: testOutputDir,
        projectRoot: __dirname,
      });

      middleware.onCompileSuccess({
        fileChangedList: ['a.ts', 'b.ts'],
      });

      expect(middleware.generator.sections).toHaveLength(1);
      expect(middleware.generator.sections[0].title).toBe('编译结果');
    });

    it('should generate API doc from file', () => {
      const middleware = new DocMiddleware({
        outputDir: testOutputDir,
        projectRoot: __dirname,
      });

      // 创建一个临时测试文件
      const testFile = join(__dirname, 'fixtures/test_build/a.ts');
      middleware.generateAPIDocFromFile(testFile);

      // 该文件没有 JSDoc 注释，所以不会生成章节
      expect(middleware.generator.sections).toHaveLength(0);
    });

    it('should finalize and save documentation', () => {
      const middleware = new DocMiddleware({
        outputDir: testOutputDir,
        projectRoot: __dirname,
      });

      middleware.beforeCompile({ sourceDir: 'src' });
      const filePath = middleware.finalize('final_doc.md');

      expect(filePath).toBeDefined();
      expect(existsSync(filePath)).toBeTruthy();

      const content = readFileSync(filePath, 'utf8');
      expect(content).toContain('编译配置');
      expect(content).toContain('系统架构');
    });

    it('should return null when finalizing disabled middleware', () => {
      const middleware = new DocMiddleware({
        enabled: false,
      });

      const result = middleware.finalize('doc.md');
      expect(result).toBeNull();
    });
  });
});
