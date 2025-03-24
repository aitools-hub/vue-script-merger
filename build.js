const fs = require('fs');
const path = require('path');

// 确保dist目录存在
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 源文件路径
const srcFile = path.join(__dirname, 'src/index.js');
// 目标文件路径
const distCjsFile = path.join(distDir, 'index.js');
const distEsmFile = path.join(distDir, 'index.mjs');
const distTypesFile = path.join(distDir, 'index.d.ts');

// 复制文件
fs.copyFileSync(srcFile, distCjsFile);
fs.copyFileSync(srcFile, distEsmFile);

// 自动创建类型定义文件
const typesContent = `import type { Plugin } from 'vite';

export interface ScriptMergerOptions {
  /** 脚本查找路径(相对或绝对路径) */
  scriptPaths?: string[];
  /** 脚本文件扩展名 */
  extensions?: string[];
  /** 路径别名映射 */
  aliases?: Record<string, string>;
  /** 是否启用调试日志 */
  debug?: boolean;
  /** 自定义脚本路径解析函数 */
  resolveScriptPath?: (vueFilePath: string) => string | null;
  /** 自定义内容转换函数 */
  transform?: (vueCode: string, scriptContent: string, comment: string, vueFilePath: string, scriptPath: string) => string | null;
  /** 项目根目录 */
  rootDir?: string;
  /** 源代码目录 */
  srcDir?: string;
  /** 注入脚本时的注释模板 */
  injectComment?: string;
  /** 是否优先使用同目录下的脚本文件 */
  useSameDir?: boolean;
}

/**
 * Vue脚本合并器插件
 */
export default function vueScriptMerger(options?: ScriptMergerOptions): Plugin;
`;

// 写入类型定义文件
fs.writeFileSync(distTypesFile, typesContent);

console.log('构建完成: 文件已复制到dist目录');
console.log('- index.js (CommonJS)');
console.log('- index.mjs (ES Module)');
console.log('- index.d.ts (TypeScript 类型定义)'); 