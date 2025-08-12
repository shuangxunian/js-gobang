<template>
  <div class="main-page">
    <p class="board-title">五子棋</p>
    <div class="game-board">
      <el-button type="primary" plain @click="dialogTableVisible = true">开始游戏</el-button>
      <!-- AI控制面板 -->
      <!-- <div class="ai-controls" style="margin-bottom: 12px">
        <label>
          <input type="checkbox" v-model="aiEnabled" @change="onAIEnabledChange" />
          AI对战
        </label>
        <label v-if="aiEnabled">
          <input type="checkbox" v-model="aiFirst" />
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
          {{ isLoading ? '初始化中...' : '开始AI对战' }}
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
      </div> -->

      <div class="board" :class="{ disabled: aiEnabled && turn !== 'human' || isLoading }">
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
    <el-dialog v-model="dialogTableVisible" title="对战配置" width="500">
      <div class="battle-config">
        <div class="config-info">
          <span class="config-info-title">游戏模式</span>
          <el-switch v-model="aiEnabled" @change="onAIEnabledChange" active-text="人机对战" inactive-text="真人对战" />
        </div>
        <div v-if="aiEnabled" class="config-info">
          <span class="config-info-title">先后手</span>
          <el-checkbox v-model="aiFirst" label="AI先手" />
        </div>
        <div v-if="aiEnabled" class="config-info">
          <span class="config-info-title">递归深度</span>
          <el-select v-model="aiDepth" placeholder="请选择AI深度" style="width: 300px;">
            <el-option
              v-for="item in options"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
      </div>
      <div class="option-list">
        <el-button type="primary" @click="handleInitAIGame" :disabled="isLoading">
          {{ isLoading ? '初始化中...' : '开始AI对战' }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRefHistory } from '@vueuse/core'
import Cell from './MyCell.vue'
import { checkWin } from '@/utils/checkWin'
import { useAI } from '@/composables/useAI'

type CellState = 'black' | 'white' | null
const SIZE = 15

// ===== AI相关 =====
const {
  gameState,
  isLoading,
  aiEnabled,
  aiFirst,
  aiDepth,
  initAIGame,
  makeAIMove,       // 若未用可删
  makeAIOnlyMove,
  syncPlayerMove,
  undoAIMove,
  endAIGame,
  convertAIBoardToVue,
} = useAI()

// ===== 棋盘状态 =====
const board = ref<CellState[][]>(Array.from({ length: SIZE }, () => Array(SIZE).fill(null)))
const { undo, clear, canUndo } = useRefHistory(board, { deep: true })

// 只用于非AI模式恢复先后手；AI模式下我们用 turn 计算
const moveHistory = ref<{ row: number; col: number; player: CellState }[]>([])

const options = ref([{ value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4' }, { value: 5, label: '5' }])

// 动态角色颜色：AI 先手 -> AI=black，人=white；否则相反
const AI_COLOR = computed<'black' | 'white'>(() => (aiFirst.value ? 'black' : 'white'))
const HUMAN_COLOR = computed<'black' | 'white'>(() => (aiFirst.value ? 'white' : 'black'))

type Turn = 'human' | 'ai'
const turn = ref<Turn>('human')

// 仅用于显示：当前执子颜色 = 轮到谁 + 角色颜色
const currentPlayer = computed<CellState>(() => (turn.value === 'human' ? HUMAN_COLOR.value : AI_COLOR.value))

const gameOver = ref(false)
const winner = ref<CellState>(null)
const dialogTableVisible = ref(false)

const aiRunning = ref(false)

watch(turn, async (nv, ov) => {
  if (nv === 'ai' && aiEnabled.value && !gameOver.value) {
    await runAIMove()
  }
})


// 渲染数据
const flatCells = computed(() =>
  board.value.flatMap((rowArr, row) => rowArr.map((value, col) => ({ row, col, value }))),
)

// 工具：求下一回合（用于悔棋后还原）
function nextTurnAfter(historyLen: number): Turn {
  const start: Turn = aiEnabled.value && aiFirst.value ? 'ai' : 'human'
  // 偶数步 -> 轮到起始方；奇数步 -> 轮到另一方
  return historyLen % 2 === 0 ? start : (start === 'human' ? 'ai' : 'human')
}

// 切到某回合并打点
function setTurn(t: Turn) {
  turn.value = t
  console.log('[TURN] =>', t, 'currentPlayer=', currentPlayer.value)
}

// ===== 事件：AI开关 =====
const onAIEnabledChange = () => {
  if (!aiEnabled.value) {
    endAIGame()
    resetGame()
  }
}

// ===== 统一的AI走子流程 =====
async function runAIMove() {
  if (!aiEnabled.value || gameOver.value) return
  if (turn.value !== 'ai') return
  if (aiRunning.value || isLoading.value) return  // 避免并发/连点

  aiRunning.value = true
  try {
    const result = await makeAIOnlyMove()
    if (!result) return

    board.value = convertAIBoardToVue(result.board)

    if (result.winner !== 0) {
      gameOver.value = true
      winner.value = result.winner === 1 ? 'black' : 'white'
      await endAIGame()
    } else {
      turn.value = 'human'   // 统一在这里切回合
    }
  } finally {
    aiRunning.value = false
  }
}



const boardHasAnyStone = (b: CellState[][]) => b.some(row => row.some(c => c !== null))

const handleInitAIGame = async () => {
  dialogTableVisible.value = false
  await initAIGame()
  if (!gameState.value) return

  board.value = convertAIBoardToVue(gameState.value.board)

  if (gameState.value.winner !== 0) {
    gameOver.value = true
    winner.value = gameState.value.winner === 1 ? 'black' : 'white'
    return
  }

  // 起手回合：AI 先手就切到 ai —— watcher 会自动让 AI 下
  const boardEmpty = !board.value.some(r => r.some(c => c !== null))
  turn.value = aiFirst.value && boardEmpty ? 'ai' : 'human'
}
async function onSelect(row: number, col: number) {
  if (!gameState.value) {
    dialogTableVisible.value = true
    return
  }
  if (board.value[row][col] !== null || gameOver.value || isLoading.value) return
  if (aiEnabled.value && turn.value !== 'human') return

  // 人类（随 aiFirst 决定黑/白）
  board.value[row][col] = HUMAN_COLOR.value
  moveHistory.value.push({ row, col, player: HUMAN_COLOR.value })

  // 同步给引擎，并以引擎结果为准回写（非常关键）
  if (aiEnabled.value) {
    const res = await syncPlayerMove([row, col])
    if (res) board.value = convertAIBoardToVue(res.board)
  }

  // 判胜…
  if (checkWin(board.value, row, col, HUMAN_COLOR.value, 5, false)) {
    gameOver.value = true
    winner.value = HUMAN_COLOR.value
    if (aiEnabled.value) await endAIGame()
    return
  } else if (board.value.flat().every(c => c !== null)) {
    gameOver.value = true
    winner.value = null
    if (aiEnabled.value) await endAIGame()
    return
  }

  // 把回合切给 AI —— watcher 会自动触发 AI 思考与落子
  if (aiEnabled.value) {
    turn.value = 'ai'
  } else {
    // 真人对战看你逻辑，这里随便切
    turn.value = turn.value === 'human' ? 'ai' : 'human'
  }
}


// ===== 悔棋 =====
async function undoMove() {
  if (!canUndo.value || isLoading.value) return

  if (aiEnabled.value) {
    const result = await undoAIMove()
    if (!result) return

    board.value = convertAIBoardToVue(result.board)
    gameOver.value = false
    winner.value = null

    // 重建 moveHistory（从AI返回的 history）
    moveHistory.value = []
    for (const mv of result.history) {
      moveHistory.value.push({ row: mv[0], col: mv[1], player: mv[2] === 1 ? 'black' : 'white' })
    }

    // 依据历史步数恢复回合
    const next = nextTurnAfter(result.history.length)
    setTurn(next)

  } else {
    // 普通模式悔棋
    undo()
    moveHistory.value.pop()
    gameOver.value = false
    winner.value = null

    const next = nextTurnAfter(moveHistory.value.length)
    setTurn(next)
  }
}

// ===== 重开 =====
function resetGame() {
  clear()
  board.value = Array.from({ length: SIZE }, () => Array(SIZE).fill(null))
  moveHistory.value = []
  gameOver.value = false
  winner.value = null

  // 非AI或AI不开启 -> 人先
  const start: Turn = aiEnabled.value && aiFirst.value ? 'ai' : 'human'
  setTurn(start)

  if (aiEnabled.value) {
    endAIGame()
  }
}
</script>


<style lang="scss" scoped>
.main-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  height: 100%;
  .board-title {
    font-size: 40px;
    font-weight: bold;
    margin: 0;
    text-align: center;
  }

  .game-board {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 12px;

    .board {
      display: grid;
      grid-template-columns: repeat(15, 30px);
      grid-template-rows: repeat(15, 30px);
      gap: 2px;
      background-color: rgb(245, 179, 80);
    }
    .board.disabled {
      pointer-events: none;
      cursor: not-allowed;
    }
  }

  .battle-config {
    display: flex;
    flex-direction: column;
    gap: 12px;
    .config-info {
      display: flex;
      .config-info-title {
        width: 100px;
        font-weight: bold;
        line-height: 32px;
      }
    }
    
    // gap: 12px;
    // align-items: center;

  }

  .option-list {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
    // flex-direction: column;
  }


}
</style>
