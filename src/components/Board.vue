<template>
  <div>
    <div class="controls" style="margin-bottom: 12px">
      <button @click="undoMove" :disabled="!canUndo">悔棋</button>
      <button @click="resetGame">重开</button>
    </div>

    <div class="status" style="margin-bottom: 12px">
      <p v-if="gameOver">
        <template v-if="winner">
          游戏结束，胜者：<strong>{{ winner }}</strong>
        </template>
        <template v-else> 平局，没有赢家 </template>
      </p>
      <p v-else>
        当前玩家：<strong>{{ currentPlayer }}</strong>
      </p>
    </div>

    <div class="board">
      <Cell
        v-for="(cell, idx) in flatCells"
        :key="idx"
        :row="cell.row"
        :col="cell.col"
        :value="cell.value"
        @select="onSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRefHistory } from '@vueuse/core'
import Cell from './Cell.vue'
import { checkWin } from '@/utils/checkWin'

const SIZE = 15
type CellState = 'black' | 'white' | null

// 棋盘状态，响应式二维数组
const board = ref<CellState[][]>(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)))

// 使用 useRefHistory 自动记录棋盘历史（深度跟踪）
const { undo, clear, canUndo } = useRefHistory(board, {
  deep: true,
})

// 人工维护落子历史（每步动作），用来恢复当前玩家状态
const moveHistory = ref<{ row: number; col: number; player: CellState }[]>([])

const currentPlayer = ref<CellState>('black')
const gameOver = ref(false)
const winner = ref<CellState>(null)

// 扁平化棋盘数据，方便渲染
const flatCells = computed(() =>
  board.value.flatMap((rowArr, row) => rowArr.map((value, col) => ({ row, col, value }))),
)

// 轮流落子函数
function onSelect(row: number, col: number) {
  if (board.value[row][col] !== null || gameOver.value) return

  // 先记录历史供撤销用
  // 先触发 useRefHistory 记录
  board.value[row][col] = currentPlayer.value

  // 维护动作历史
  moveHistory.value.push({ row, col, player: currentPlayer.value })

  // 检查胜负
  if (checkWin(board.value, row, col, currentPlayer.value, 5, false)) {
    gameOver.value = true
    winner.value = currentPlayer.value
  } else if (board.value.flat().every((cell) => cell !== null)) {
    // 平局判断
    gameOver.value = true
    winner.value = null
  } else {
    // 轮换玩家
    currentPlayer.value = currentPlayer.value === 'black' ? 'white' : 'black'
  }
}

// 悔棋逻辑：撤销棋盘状态和动作历史，恢复玩家和胜负状态
function undoMove() {
  if (!canUndo.value || moveHistory.value.length === 0) return

  undo() // 用 useRefHistory 回退棋盘状态

  // 撤销动作历史最后一步
  moveHistory.value.pop()

  // 撤销后更新状态
  gameOver.value = false
  winner.value = null

  // 恢复当前玩家
  if (moveHistory.value.length === 0) {
    currentPlayer.value = 'black' // 初始是黑先
  } else {
    // 取最后一步玩家，轮换回去
    const lastPlayer = moveHistory.value[moveHistory.value.length - 1].player
    currentPlayer.value = lastPlayer === 'black' ? 'white' : 'black'
  }
}

// 重盘逻辑：重置所有状态和历史
function resetGame() {
  clear() // 清空 useRefHistory 的历史
  board.value = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  moveHistory.value = []
  currentPlayer.value = 'black'
  gameOver.value = false
  winner.value = null
}
</script>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(15, 30px);
  grid-template-rows: repeat(15, 30px);
  gap: 2px;
}

/* 按钮和状态简单样式 */
.controls button {
  margin-right: 8px;
  padding: 6px 12px;
  cursor: pointer;
}

.status p {
  font-size: 16px;
}
</style>
