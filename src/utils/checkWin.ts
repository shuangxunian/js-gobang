export type CellState = 'black' | 'white' | null

export function checkWin(
  board: CellState[][],
  lastRow: number,
  lastCol: number,
  player: CellState,
  winCount = 5,
  strictExact = false, // 是否严格恰好五子
): boolean {
  if (!player) return false
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ]
  const size = board.length

  for (const [dr, dc] of directions) {
    let count = 1
    let openBefore = 0,
      openAfter = 0

    // 向 “正方向” 扫描
    let r = lastRow + dr,
      c = lastCol + dc
    while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === player) {
      count++
      r += dr
      c += dc
    }
    if (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === null) openAfter++

    // 向 “反方向” 扫描
    r = lastRow - dr
    c = lastCol - dc
    while (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === player) {
      count++
      r -= dr
      c -= dc
    }
    if (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === null) openBefore++

    if (count >= winCount) {
      if (strictExact) {
        if (count === winCount) return true
      } else {
        return true
      }
    }
  }

  return false
}
