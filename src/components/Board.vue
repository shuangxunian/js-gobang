<template>
  <div>
    <!-- AI控制面板 -->
    <div class="ai-controls" style="margin-bottom: 12px">
      <label>
        <input type="checkbox" v-model="aiEnabled" @change="onAIEnabledChange">
        AI對戰
      </label>
      <label v-if="aiEnabled">
        <input type="checkbox" v-model="aiFirst">
        AI先手
      </label>
      <label v-if="aiEnabled">
        AI深度：
        <select v-model="aiDepth">
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </label>
      <button v-if="aiEnabled" @click="handleInitAIGame" :disabled="isLoading">
        {{ isLoading ? '初始化中...' : '開始AI對戰' }}
      </button>
    </div>

    <div class="controls" style="margin-bottom: 12px">
      <button @click="undoMove" :disabled="!canUndo || isLoading">悔棋</button>
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
        <span v-if="aiEnabled && isLoading"> (AI思考中...)</span>
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
import { ref, computed, watch } from 'vue'
import { useRefHistory } from '@vueuse/core'
import Cell from './Cell.vue'
import { checkWin } from '@/utils/checkWin'
import { useAI } from '@/composables/useAI'

const SIZE = 15
type CellState = 'black' | 'white' | null

// AI相關狀態
const {
  gameState,
  isLoading,
  aiEnabled,
  aiFirst,
  aiDepth,
  initAIGame,
  makeAIMove,
  undoAIMove,
  endAIGame,
  convertAIBoardToVue,
  convertVueBoardToAI
} = useAI()

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

// AI啟用狀態變化處理
const onAIEnabledChange = () => {
  if (!aiEnabled.value) {
    endAIGame()
    resetGame()
  }
}

// 初始化AI遊戲
const handleInitAIGame = async () => {
  await initAIGame()
  if (aiFirst.value && gameState.value) {
    // 如果AI先手，同步AI棋盤到Vue棋盤
    board.value = convertAIBoardToVue(gameState.value.board)
    currentPlayer.value = 'white'
    if (gameState.value.winner !== 0) {
      gameOver.value = true
      winner.value = gameState.value.winner === 1 ? 'black' : 'white'
    }
  }
}

// 轮流落子函数
async function onSelect(row: number, col: number) {
  if (board.value[row][col] !== null || gameOver.value || isLoading.value) return

  // 玩家下棋
  board.value[row][col] = currentPlayer.value
  moveHistory.value.push({ row, col, player: currentPlayer.value })

  // 检查胜负
  if (checkWin(board.value, row, col, currentPlayer.value, 5, false)) {
    gameOver.value = true
    winner.value = currentPlayer.value
    if (aiEnabled.value) {
      await endAIGame()
    }
    return
  } else if (board.value.flat().every((cell) => cell !== null)) {
    // 平局判断
    gameOver.value = true
    winner.value = null
    if (aiEnabled.value) {
      await endAIGame()
    }
    return
  }

  // 轮换玩家
  currentPlayer.value = currentPlayer.value === 'black' ? 'white' : 'black'

  // 如果啟用AI且輪到AI下棋
  if (aiEnabled.value && currentPlayer.value === 'white') {
    const result = await makeAIMove([row, col])
    if (result) {
      // 同步AI棋盤到Vue棋盤
      board.value = convertAIBoardToVue(result.board)
      currentPlayer.value = 'black'
      
      if (result.winner !== 0) {
        gameOver.value = true
        winner.value = result.winner === 1 ? 'black' : 'white'
        await endAIGame()
      }
    }
  }
}

// 悔棋逻辑：撤销棋盘状态和动作历史，恢复玩家和胜负状态
async function undoMove() {
  if (!canUndo.value || moveHistory.value.length === 0 || isLoading.value) return

  if (aiEnabled.value) {
    // AI模式下使用AI的悔棋
    const result = await undoAIMove()
    if (result) {
      board.value = convertAIBoardToVue(result.board)
      currentPlayer.value = 'black'
      gameOver.value = false
      winner.value = null
      // 重新計算moveHistory
      moveHistory.value = []
      for (let i = 0; i < result.history.length; i++) {
        const move = result.history[i]
        moveHistory.value.push({
          row: move[0],
          col: move[1],
          player: move[2] === 1 ? 'black' : 'white'
        })
      }
    }
  } else {
    // 普通模式下的悔棋
    undo()
    moveHistory.value.pop()
    gameOver.value = false
    winner.value = null

    if (moveHistory.value.length === 0) {
      currentPlayer.value = 'black'
    } else {
      const lastPlayer = moveHistory.value[moveHistory.value.length - 1].player
      currentPlayer.value = lastPlayer === 'black' ? 'white' : 'black'
    }
  }
}

// 重盘逻辑：重置所有状态和历史
function resetGame() {
  clear()
  board.value = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  moveHistory.value = []
  currentPlayer.value = 'black'
  gameOver.value = false
  winner.value = null
  
  if (aiEnabled.value) {
    endAIGame()
  }
}
</script>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(15, 30px);
  grid-template-rows: repeat(15, 30px);
  gap: 2px;
  background-color: rgb(245, 179, 80);
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
