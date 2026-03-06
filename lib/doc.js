/**
 * 技术文档中介模块
 * 用于生成、管理和处理项目技术文档
 */

const fs = require('fs');
const path = require('path');
const { debug } = require('./util');

/**
 * 文档生成器类
 * 负责生成项目的技术文档
 */
class DocGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || './docs';
    this.projectRoot = options.projectRoot || process.cwd();
    this.sections = [];
  }

  /**
   * 添加文档章节
   * @param {string} title - 章节标题
   * @param {string} content - 章节内容
   * @param {number} level - 标题级别 (1-6)
   */
  addSection(title, content, level = 2) {
    this.sections.push({
      title,
      content,
      level,
      timestamp: Date.now(),
    });
    debug(`Added section: ${title}`);
  }

  /**
   * 生成 API 文档
   * @param {Object} apiInfo - API 信息对象
   * @returns {string} 生成的文档内容
   */
  generateAPIDoc(apiInfo) {
    const lines = [];
    lines.push(`## ${apiInfo.name || 'API'}\n`);
    
    if (apiInfo.description) {
      lines.push(`${apiInfo.description}\n`);
    }

    if (apiInfo.params && apiInfo.params.length > 0) {
      lines.push('### 参数\n');
      lines.push('| 参数名 | 类型 | 必填 | 描述 |');
      lines.push('|--------|------|------|------|');
      apiInfo.params.forEach(param => {
        lines.push(`| ${param.name} | ${param.type} | ${param.required ? '是' : '否'} | ${param.description || ''} |`);
      });
      lines.push('');
    }

    if (apiInfo.returns) {
      lines.push('### 返回值\n');
      lines.push(`类型: \`${apiInfo.returns.type}\``);
      if (apiInfo.returns.description) {
        lines.push(`\n${apiInfo.returns.description}`);
      }
      lines.push('');
    }

    if (apiInfo.example) {
      lines.push('### 示例\n');
      lines.push('```javascript');
      lines.push(apiInfo.example);
      lines.push('```\n');
    }

    return lines.join('\n');
  }

  /**
   * 生成架构文档
   * @returns {string} 生成的文档内容
   */
  generateArchitectureDoc() {
    const lines = [];
    lines.push('# 架构文档\n');
    lines.push('## 系统架构图\n');
    lines.push('```');
    lines.push('┌─────────────────┐');
    lines.push('│   解析命令行参数   │');
    lines.push('└────────┬────────┘');
    lines.push('         ▼');
    lines.push('┌─────────────────┐');
    lines.push('│  读取 tsconfig   │');
    lines.push('└────────┬────────┘');
    lines.push('         ▼');
    lines.push('┌─────────────────┐');
    lines.push('│  fork TSC 进程   │──▶ 编译 TypeScript');
    lines.push('└────────┬────────┘');
    lines.push('         ▼');
    lines.push('┌─────────────────┐');
    lines.push('│  后处理阶段      │──▶ alias 替换 + 非 TS 文件拷贝');
    lines.push('└────────┬────────┘');
    lines.push('         ▼');
    lines.push('┌─────────────────┐');
    lines.push('│  fork 应用进程   │──▶ 启动 Node.js 应用');
    lines.push('└────────┬────────┘');
    lines.push('         ▼');
    lines.push('┌─────────────────┐');
    lines.push('│  监听文件变化    │──▶ chokidar 监听，触发增量编译');
    lines.push('└─────────────────┘');
    lines.push('```\n');

    lines.push('## 核心模块\n');
    lines.push('| 模块 | 职责 |');
    lines.push('|------|------|');
    lines.push('| `lib/index.js` | 主入口，负责整体流程编排 |');
    lines.push('| `lib/process.js` | 子进程管理（fork tsc 和运行应用） |');
    lines.push('| `lib/util.js` | 工具函数集 |');
    lines.push('| `lib/proxy.js` | 代理服务器（用于调试） |');
    lines.push('| `lib/output.js` | 控制台输出格式化 |');
    lines.push('| `lib/wrap.js` | 应用启动包装器 |');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * 生成完整的文档
   * @returns {string} 完整的文档内容
   */
  generate() {
    const lines = [];
    
    // 文档头部
    lines.push('# mwtsc 技术文档\n');
    lines.push(`> 生成时间: ${new Date().toLocaleString()}\n`);
    
    // 目录
    lines.push('## 目录\n');
    this.sections.forEach((section, index) => {
      const indent = '  '.repeat(section.level - 1);
      lines.push(`${indent}- [${section.title}](#${this._slugify(section.title)})`);
    });
    lines.push('');

    // 各章节内容
    this.sections.forEach(section => {
      const prefix = '#'.repeat(section.level);
      lines.push(`${prefix} ${section.title}\n`);
      lines.push(section.content);
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * 保存文档到文件
   * @param {string} filename - 文件名
   */
  save(filename = 'TECHNICAL_DOC.md') {
    const outputPath = path.join(this.projectRoot, this.outputDir, filename);
    const content = this.generate();
    
    // 确保目录存在
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content, 'utf8');
    debug(`Documentation saved to: ${outputPath}`);
    return outputPath;
  }

  /**
   * 将标题转换为锚点链接
   * @param {string} title - 标题
   * @returns {string} 锚点链接
   * @private
   */
  _slugify(title) {
    return title.toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
  }
}

/**
 * 文档解析器类
 * 用于解析代码中的 JSDoc 注释
 */
class DocParser {
  /**
   * 解析函数注释
   * @param {string} code - 源代码
   * @returns {Object[]} 解析出的文档对象数组
   */
  parseFunctionComments(code) {
    const comments = [];
    const regex = /\/\*\*([\s\S]*?)\*\/\s*(?:async\s+)?function\s+(\w+)/g;
    let match;

    while ((match = regex.exec(code)) !== null) {
      const docBlock = match[1];
      const functionName = match[2];
      
      const doc = {
        name: functionName,
        description: this._extractTag(docBlock, 'description'),
        params: this._extractParams(docBlock),
        returns: this._extractReturns(docBlock),
        example: this._extractTag(docBlock, 'example'),
      };

      comments.push(doc);
    }

    return comments;
  }

  /**
   * 提取标签内容
   * @param {string} docBlock - 文档块
   * @param {string} tag - 标签名
   * @returns {string} 标签内容
   * @private
   */
  _extractTag(docBlock, tag) {
    const regex = new RegExp(`@${tag}\\s+(.+?)(?=\\n\\s*\\*\\s*@|\\n\\s*\\*\\/|$)`, 's');
    const match = docBlock.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * 提取参数信息
   * @param {string} docBlock - 文档块
   * @returns {Object[]} 参数信息数组
   * @private
   */
  _extractParams(docBlock) {
    const params = [];
    const regex = /@param\s+\{([^}]+)\}\s+(\w+)\s*-?\s*(.*)?/g;
    let match;

    while ((match = regex.exec(docBlock)) !== null) {
      params.push({
        type: match[1],
        name: match[2],
        description: match[3] || '',
        required: !match[0].includes('['),
      });
    }

    return params;
  }

  /**
   * 提取返回值信息
   * @param {string} docBlock - 文档块
   * @returns {Object} 返回值信息
   * @private
   */
  _extractReturns(docBlock) {
    const regex = /@returns\s+\{([^}]+)\}\s*(.*)?/;
    const match = docBlock.match(regex);
    
    if (match) {
      return {
        type: match[1],
        description: match[2] || '',
      };
    }
    return null;
  }
}

/**
 * 文档中间件类
 * 用于在编译过程中集成文档生成
 */
class DocMiddleware {
  constructor(options = {}) {
    this.generator = new DocGenerator(options);
    this.parser = new DocParser();
    this.enabled = options.enabled !== false;
  }

  /**
   * 在编译前执行
   * @param {Object} context - 编译上下文
   */
  beforeCompile(context) {
    if (!this.enabled) return;
    
    debug('DocMiddleware: beforeCompile');
    this.generator.addSection('编译配置', `
- 源目录: ${context.sourceDir || 'src'}
- 输出目录: ${context.outDir || 'dist'}
- TypeScript配置: ${context.tsconfigPath || 'tsconfig.json'}
    `);
  }

  /**
   * 在编译成功后执行
   * @param {Object} context - 编译上下文
   */
  onCompileSuccess(context) {
    if (!this.enabled) return;
    
    debug('DocMiddleware: onCompileSuccess');
    this.generator.addSection('编译结果', `
编译成功完成
- 编译时间: ${new Date().toLocaleString()}
- 变更文件数: ${context.fileChangedList?.length || 0}
    `);
  }

  /**
   * 解析并生成 API 文档
   * @param {string} filePath - 源代码文件路径
   */
  generateAPIDocFromFile(filePath) {
    if (!this.enabled || !fs.existsSync(filePath)) return;

    const code = fs.readFileSync(filePath, 'utf8');
    const docs = this.parser.parseFunctionComments(code);

    docs.forEach(doc => {
      const content = this.generator.generateAPIDoc(doc);
      this.generator.addSection(`API: ${doc.name}`, content);
    });
  }

  /**
   * 生成并保存完整文档
   * @param {string} filename - 输出文件名
   * @returns {string} 生成的文件路径
   */
  finalize(filename) {
    if (!this.enabled) return null;
    
    // 添加架构文档
    this.generator.addSection('系统架构', this.generator.generateArchitectureDoc(), 1);
    
    return this.generator.save(filename);
  }
}

module.exports = {
  DocGenerator,
  DocParser,
  DocMiddleware,
};
