import fs from 'fs'
import path from 'path'

/**
 * Vue Script Merger - 灵活的Vue组件脚本拆分合并插件
 * 
 * @typedef {Object} ScriptMergerOptions
 * @property {string[]} [scriptPaths=['views','scripts','components']] - 脚本查找路径(相对或绝对路径)
 * @property {string[]} [extensions=['.script.js','.js']] - 脚本文件扩展名
 * @property {Object} [aliases={}] - 路径别名映射
 * @property {boolean} [debug=false] - 是否启用调试日志
 * @property {Function} [resolveScriptPath] - 自定义脚本路径解析函数
 * @property {Function} [transform] - 自定义内容转换函数
 * @property {string} [rootDir=process.cwd()] - 项目根目录
 * @property {string} [srcDir='src'] - 源代码目录
 * @property {string} [injectComment='// 自动导入的外部脚本: {filename}'] - 注入脚本时的注释模板
 * @property {boolean} [useSameDir=true] - 是否优先使用同目录下的脚本文件
 */

/**
 * Vue脚本合并器插件
 * @param {ScriptMergerOptions} options - 配置选项
 * @returns {import('vite').Plugin} Vite插件对象
 */
function vueScriptMerger(options = {}) {
  // 默认配置
  const defaultOptions = {
    scriptPaths: ['views', 'scripts', 'components'],
    extensions: ['.script.js', '.js'],
    aliases: {},
    debug: false,
    rootDir: process.cwd(),
    srcDir: 'src',
    injectComment: '// 自动导入的外部脚本: {filename}',
    useSameDir: true
  }
  
  // 合并配置
  const config = { ...defaultOptions, ...options }
  
  // 创建路径解析器
  const resolveScriptPath = config.resolveScriptPath || createPathResolver(config)
  
  // 缓存找到的脚本文件
  const scriptCache = new Map()
  
  /**
   * 根据配置创建路径解析器
   * @param {ScriptMergerOptions} config - 配置选项
   * @returns {Function} 路径解析函数
   */
  function createPathResolver(config) {
    // 处理别名
    const resolveAlias = (filepath) => {
      for (const [alias, target] of Object.entries(config.aliases)) {
        if (filepath.startsWith(alias)) {
          return filepath.replace(alias, target)
        }
      }
      return filepath
    }
    
    return function(vueFilePath) {
      // 已缓存的结果直接返回
      if (scriptCache.has(vueFilePath)) {
        return scriptCache.get(vueFilePath)
      }
      
      const vueBaseName = path.basename(vueFilePath, '.vue')
      const scriptPaths = []
      
      // 1. 先检查同目录下是否有脚本文件(如果启用)
      if (config.useSameDir) {
        const vueDir = path.dirname(vueFilePath)
        for (const ext of config.extensions) {
          const sameDirPath = path.join(vueDir, vueBaseName + ext)
          if (fs.existsSync(sameDirPath)) {
            log(`在同目录找到脚本文件: ${path.relative(config.rootDir, sameDirPath)}`)
            scriptCache.set(vueFilePath, sameDirPath)
            return sameDirPath
          }
        }
      }
      
      // 2. 在配置的所有路径下查找
      for (const scriptPath of config.scriptPaths) {
        // 处理绝对路径和相对路径
        let searchDir
        if (path.isAbsolute(scriptPath)) {
          searchDir = scriptPath
        } else if (scriptPath.startsWith('./') || scriptPath.startsWith('../')) {
          searchDir = path.join(config.rootDir, scriptPath)
        } else {
          searchDir = path.join(config.rootDir, config.srcDir, scriptPath)
        }
        
        // 支持别名路径
        searchDir = resolveAlias(searchDir)
        
        if (!fs.existsSync(searchDir)) {
          log(`搜索目录不存在: ${searchDir}`, 'warn')
          continue
        }
        
        // 递归搜索目录下所有匹配文件
        try {
          const files = findMatchingFiles(searchDir, config.extensions)
          
          for (const file of files) {
            const fileBaseName = path.basename(file, path.extname(file))
            // 检查文件名是否匹配
            if (fileBaseName === vueBaseName || 
                path.basename(file).startsWith(vueBaseName + '.') ||
                file.includes(`/${vueBaseName}/index`) ||
                file.includes(`\\${vueBaseName}\\index`)) {
              log(`找到匹配的脚本文件: ${path.relative(config.rootDir, file)}`)
              scriptCache.set(vueFilePath, file)
              return file
            }
          }
        } catch (err) {
          log(`搜索目录 ${searchDir} 时出错: ${err.message}`, 'error')
        }
      }
      
      // 未找到匹配脚本
      log(`未找到与 ${path.basename(vueFilePath)} 匹配的脚本文件`, 'warn')
      scriptCache.set(vueFilePath, null)
      return null
    }
  }
  
  /**
   * 查找目录中匹配的文件
   * @param {string} dir - 搜索目录
   * @param {string[]} extensions - 匹配的扩展名
   * @param {string[]} results - 结果数组
   * @returns {string[]} 匹配的文件路径列表
   */
  function findMatchingFiles(dir, extensions, results = []) {
    if (!fs.existsSync(dir)) return results
    
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        
        if (entry.isDirectory()) {
          // 递归搜索子目录
          findMatchingFiles(fullPath, extensions, results)
        } else if (entry.isFile() && extensions.some(ext => entry.name.endsWith(ext))) {
          results.push(fullPath)
        }
      }
    } catch (err) {
      log(`读取目录 ${dir} 失败: ${err.message}`, 'error')
    }
    
    return results
  }
  
  /**
   * 内部日志函数
   * @param {string} message - 日志消息
   * @param {string} level - 日志级别
   */
  function log(message, level = 'debug') {
    if (!config.debug && level === 'debug') return
    
    const prefix = `[vue-script-merger] ${level.toUpperCase()}:`
    
    switch(level) {
      case 'error':
        console.error(prefix, message)
        break
      case 'warn':
        console.warn(prefix, message)
        break
      case 'info':
      case 'debug':
      default:
        if (config.debug) console.log(prefix, message)
    }
  }
  
  // Vite插件定义
  return {
    name: 'vue-script-merger',
    enforce: 'pre',
    
    configResolved(resolvedConfig) {
      // 更新配置，使用vite的别名配置
      if (resolvedConfig.resolve && resolvedConfig.resolve.alias) {
        config.viteAliases = resolvedConfig.resolve.alias
      }
      
      // 输出插件配置信息
      if (config.debug) {
        log('插件配置:', 'info')
        log(JSON.stringify(config, null, 2), 'info')
      }
    },
    
    /**
     * 转换Vue组件文件
     * @param {string} code - 源代码
     * @param {string} id - 文件ID(路径)
     */
    transform(code, id) {
      // 只处理Vue文件
      if (!id.endsWith('.vue')) return null
      
      try {
        // 解析脚本路径
        const scriptPath = resolveScriptPath(id)
        if (!scriptPath) return null
        
        // 读取脚本内容
        const scriptContent = fs.readFileSync(scriptPath, 'utf-8')
        
        // 注入注释，替换{filename}占位符
        const comment = config.injectComment.replace(
          '{filename}', 
          path.relative(path.dirname(id), scriptPath)
        )
        
        // 执行自定义转换或使用默认转换
        if (typeof config.transform === 'function') {
          return config.transform(code, scriptContent, comment, id, scriptPath)
        }
        
        // 默认转换: 在<script setup>中注入代码或创建新标签
        if (/<script\s+setup[^>]*>/.test(code)) {
          return code.replace(
            /(<script\s+setup[^>]*>)([\s\S]*?)(<\/script>)/,
            (match, openTag, content, closeTag) => {
              return `${openTag}\n${comment}\n${scriptContent}\n${content}${closeTag}`
            }
          )
        } else {
          return code.replace(
            /<\/template>/,
            `</template>\n\n<script setup>\n${comment}\n${scriptContent}\n</script>`
          )
        }
      } catch (error) {
        log(`处理文件 ${id} 失败: ${error.stack || error.message}`, 'error')
        return null
      }
    }
  }
}

export default vueScriptMerger 