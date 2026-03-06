/**
 * 文档中介使用示例
 * 展示如何在 mwtsc 编译流程中集成文档生成功能
 */

const { DocMiddleware } = require('../lib/doc');

// 创建文档中间件实例
const docMiddleware = new DocMiddleware({
  outputDir: './docs',
  projectRoot: process.cwd(),
  enabled: true,
});

// 模拟编译上下文
const context = {
  sourceDir: 'src',
  outDir: 'dist',
  tsconfigPath: 'tsconfig.json',
  fileChangedList: ['src/app.ts', 'src/controller/user.ts'],
};

// 在编译前调用
console.log('=== 编译前 ===');
docMiddleware.beforeCompile(context);

// 解析源代码生成 API 文档
console.log('=== 解析 API 文档 ===');
docMiddleware.generateAPIDocFromFile('./lib/index.js');
docMiddleware.generateAPIDocFromFile('./lib/process.js');
docMiddleware.generateAPIDocFromFile('./lib/util.js');

// 在编译成功后调用
console.log('=== 编译成功 ===');
docMiddleware.onCompileSuccess(context);

// 生成并保存文档
console.log('=== 生成文档 ===');
const docPath = docMiddleware.finalize('PROJECT_DOC.md');

if (docPath) {
  console.log(`✅ 文档已生成: ${docPath}`);
  
  // 读取并显示生成的文档内容
  const fs = require('fs');
  const content = fs.readFileSync(docPath, 'utf8');
  console.log('\n=== 生成的文档预览 ===');
  console.log(content.substring(0, 2000) + '...');
} else {
  console.log('❌ 文档生成失败');
}

console.log('\n=== 使用说明 ===');
console.log(`
文档中介模块提供了三个核心类:

1. DocGenerator - 文档生成器
   - addSection(title, content, level) - 添加文档章节
   - generateAPIDoc(apiInfo) - 生成 API 文档
   - generateArchitectureDoc() - 生成架构文档
   - save(filename) - 保存文档到文件

2. DocParser - 文档解析器
   - parseFunctionComments(code) - 解析代码中的 JSDoc 注释

3. DocMiddleware - 文档中间件
   - beforeCompile(context) - 编译前调用
   - onCompileSuccess(context) - 编译成功后调用
   - generateAPIDocFromFile(filePath) - 从文件生成 API 文档
   - finalize(filename) - 完成文档生成

使用方式:
  const { DocMiddleware } = require('mwtsc/lib/doc');
  const docMiddleware = new DocMiddleware({
    outputDir: './docs',
    enabled: true,
  });
  
  // 在编译流程中集成
  docMiddleware.beforeCompile(context);
  // ... 编译 ...
  docMiddleware.onCompileSuccess(context);
  docMiddleware.finalize('doc.md');
`);
