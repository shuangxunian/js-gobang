import { config } from './config.ts'

// 先入先出缓存
export default class Cache {
  private capacity: number
  private cache: any[]
  private map: Map<any, any>

  constructor(capacity = 1000000) {
    this.capacity = capacity
    this.cache = []
    this.map = new Map()
  }

  // 获取一个键的值
  get(key: any): any {
    if (!config.enableCache) return false
    if (this.map.has(key)) {
      return this.map.get(key)
    }
    return null
  }

  // 设置或插入一个值
  put(key: any, value: any): boolean {
    if (!config.enableCache) return false
    if (this.cache.length >= this.capacity) {
      const oldestKey = this.cache.shift() // 移除最老的键
      this.map.delete(oldestKey) // 从map中也删除它
    }

    if (!this.map.has(key)) {
      this.cache.push(key) // 将新键添加到cache数组
    }
    this.map.set(key, value) // 更新或设置键值
    return true
  }

  // 检查缓存中是否存在某个键
  has(key: any): boolean {
    if (!config.enableCache) return false
    return this.map.has(key)
  }
}
