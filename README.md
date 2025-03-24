# vue-script-merger

一个灵活的Vue组件脚本拆分合并插件，允许将Vue组件的脚本逻辑拆分到外部文件中，提高代码可维护性和组织结构。

## 特性

- 🚀 **简化组件结构** - 将复杂的脚本逻辑从Vue组件中分离
- 🔍 **灵活的文件查找** - 多种命名约定和目录结构支持
- ⚙️ **高度可配置** - 自定义查找路径、文件扩展名和合并行为
- 🔄 **开发与构建支持** - 在开发和构建过程中无缝工作
- 🔌 **零依赖** - 仅使用Node.js内置模块

## 安装

```bash
npm install vue-script-merger --save-dev
# 或
yarn add vue-script-merger -D
# 或
pnpm add vue-script-merger -D
```

## 基本使用

### 1. 在vite.config.js中配置插件

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueScriptMerger from 'vue-script-merger'

export default defineConfig({
  plugins: [
    vue(),
    vueScriptMerger()
  ]
})
```

### 2. 创建外部脚本文件

**组件文件 (RelationShip.vue):**

```vue
<template>
  <div>
    <!-- 组件模板 -->
  </div>
</template>

<script setup>
// 组件内可以保留必要的导入或简单逻辑
// 复杂逻辑已移至外部脚本文件
</script>

<style scoped>
/* 样式代码 */
</style>
```

**外部脚本文件 (relationship.script.js):**

```javascript
import { ref, onMounted } from 'vue'

// 状态变量
const relationships = ref([])
const isLoading = ref(false)

// 方法
function loadRelationships() {
  isLoading.value = true
  // 加载数据逻辑...
}

// 生命周期钩子
onMounted(() => {
  loadRelationships()
})
```

## 配置选项

```javascript
vueScriptMerger({
  // 脚本查找路径(相对于src目录、项目根目录或绝对路径)
  scriptPaths: ['views', 'scripts', 'components'],
  
  // 脚本文件扩展名(按优先级排序)
  extensions: ['.script.js', '.vue.js', '.js'],
  
  // 路径别名映射
  aliases: {
    '@scripts': '/path/to/scripts'
  },
  
  // 是否启用调试日志
  debug: false,
  
  // 项目根目录(默认为process.cwd())
  rootDir: process.cwd(),
  
  // 源代码目录(默认为src)
  srcDir: 'src',
  
  // 注入脚本时的注释模板
  injectComment: '// 自动导入的外部脚本: {filename}',
  
  // 是否优先使用同目录下的脚本文件
  useSameDir: true
})
```

## 文件查找逻辑

插件按以下顺序查找外部脚本文件:

1. 如果`useSameDir`为`true`，首先在与Vue组件相同的目录中查找同名的脚本文件
2. 如果同目录下未找到，则在`scriptPaths`配置的所有目录中查找匹配的文件
3. 匹配逻辑包括:
   - 完全匹配文件名(`RelationShip.vue` → `RelationShip.script.js`)
   - 基本名称匹配(`RelationShip.vue` → `relationship.js`)
   - 目录结构匹配(`RelationShip.vue` → `RelationShip/index.script.js`)

## 高级用法

### 自定义路径解析

```javascript
vueScriptMerger({
  resolveScriptPath: (vueFilePath) => {
    // 自定义脚本路径解析逻辑
    const vueBaseName = path.basename(vueFilePath, '.vue')
    const customScriptPath = path.join('/custom/path', `${vueBaseName}.logic.js`)
    
    return fs.existsSync(customScriptPath) ? customScriptPath : null
  }
})
```

### 自定义转换逻辑

```javascript
vueScriptMerger({
  transform: (vueCode, scriptContent, comment, vueFilePath, scriptPath) => {
    // 自定义代码合并逻辑
    
    if (/<script\s+setup[^>]*>/.test(vueCode)) {
      return vueCode.replace(
        /(<script\s+setup[^>]*>)([\s\S]*?)(<\/script>)/,
        (match, openTag, content, closeTag) => {
          return `${openTag}\n/* 自定义注入逻辑 */\n${scriptContent}\n${content}${closeTag}`
        }
      )
    }
    
    return vueCode.replace(
      /<\/template>/,
      `</template>\n\n<script setup>\n${comment}\n${scriptContent}\n</script>`
    )
  }
})
```

## 项目结构建议

vue-script-merger支持多种项目结构组织方式:

### 方式1: 组件同目录

```
src/
  └── views/
      ├── book/
      │   ├── RelationShip.vue
      │   └── RelationShip.script.js  // 与组件同目录
```

### 方式2: 集中管理

```
src/
  ├── views/
  │   └── book/
  │       └── RelationShip.vue
  └── scripts/
      └── relationship.script.js  // 集中管理的脚本目录
```

### 方式3: 嵌套结构

```
src/
  ├── views/
  │   └── book/
  │       └── RelationShip.vue
  └── scripts/
      └── book/
          └── relationship.script.js  // 与目录结构匹配
```

## 常见问题

### Q: 插件会影响构建性能吗?
A: 插件使用了文件缓存机制，仅在首次加载时查找文件，对构建性能影响很小。

### Q: 如何知道脚本是否正确合并?
A: 启用`debug: true`选项，插件会在控制台输出详细的匹配和合并信息。

### Q: 支持TypeScript吗?
A: 是的，只需将`.script.js`改为`.script.ts`，并在`extensions`配置中添加`.ts`扩展名。

### Q: 热更新时会重新合并吗?
A: 是的，当您修改外部脚本文件时，Vite会检测到更改并重新运行插件。

## 许可证

MIT

