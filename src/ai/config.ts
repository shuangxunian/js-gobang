// 一些全局配置放在这里，其中有一些配置是用来控制一些不稳定的功能是否开启的，比如缓存，只搜索一条线上的点位等。
export interface Config {
  enableCache: boolean // 是否开启缓存
  pointsLimit: number // 每一层最多搜索节点数
  onlyInLine: boolean // 是否只搜索一条线上的点位，一种优化方式。
  inlineCount: number // 最近多少个点位能算作
  inLineDistance: number // 判断点位是否在一条线上的最大距离
}

export const config: Config = {
  enableCache: true, // 是否开启缓存
  pointsLimit: 20, // 每一层最多搜索节点数
  onlyInLine: false, // 是否只搜索一条线上的点位，一种优化方式。
  inlineCount: 4, // 最近多少个点位能算作
  inLineDistance: 5, // 判断点位是否在一条线上的最大距离
}

export const board_size: number = 15
