import { config } from './config.ts'

// 坐標轉換函數
export const position2Coordinate = function (position: number, size: number): [number, number] {
  return [Math.floor(position / size), position % size]
}

export const coordinate2Position = function (x: number, y: number, size: number): number {
  return x * size + y
}

// a和b是否在一條直線上，且距離小於maxDistance
export const isLine = function (a: number, b: number, size: number): boolean {
  const maxDistance = config.inLineDistance
  const [x1, y1] = position2Coordinate(a, size)
  const [x2, y2] = position2Coordinate(b, size)
  return (
    (x1 === x2 && Math.abs(y1 - y2) < maxDistance) ||
    (y1 === y2 && Math.abs(x1 - x2) < maxDistance) ||
    (Math.abs(x1 - x2) === Math.abs(y1 - y2) && Math.abs(x1 - x2) < maxDistance)
  )
}

export const isAllInLine = function (p: number, arr: number[], size: number): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (!isLine(p, arr[i], size)) {
      return false
    }
  }
  return true
}

export const hasInLine = function (p: number, arr: number[], size: number): boolean {
  for (let i = 0; i < arr.length; i++) {
    if (isLine(p, arr[i], size)) {
      return true
    }
  }
  return false
}
