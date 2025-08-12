import { ref, reactive } from 'vue'
import { start, move, undo, end, aiMove, encodeIndex } from '@/utils/bridge'

export interface AIGameState {
  board: number[][]
  winner: number
  current_player: number
  history: any[]
  size: number
  score: number
  bestPath: any[]
  currentDepth: number
}

export function useAI() {
  const gameState = ref<AIGameState | null>(null)
  const isLoading = ref(false)
  const aiEnabled = ref(false)
  const aiFirst = ref(false)
  const aiDepth = ref(4)

  // 初始化AI遊戲
  const initAIGame = async () => {
    isLoading.value = true
    try {
      const result = await start(15, aiFirst.value, aiDepth.value)
      gameState.value = result
      aiEnabled.value = true
    } catch (error) {
      console.error('AI初始化失敗:', error)
    } finally {
      isLoading.value = false
    }
  }

  // AI下棋
  const makeAIMove = async (position: [number, number]) => {
    if (!aiEnabled.value || !gameState.value) return null
    isLoading.value = true
    try {
      // ✅ 直接传坐标
      const result = await move([position[0], position[1]], aiDepth.value)
      gameState.value = result
      return result
    } finally {
      isLoading.value = false
    }
  }

  const makeAIOnlyMove = async () => {
    if (!aiEnabled.value || !gameState.value) return null
    isLoading.value = true
    try {
      const result = await aiMove(aiDepth.value)
      gameState.value = result
      return result
    } catch (e) {
      console.error('AI下棋失敗:', e)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 同步玩家下棋到AI棋盘
  const syncPlayerMove = async (position: [number, number]) => {
    if (!aiEnabled.value || !gameState.value) return null
    isLoading.value = true
    try {
      // ✅ 直接传坐标
      const result = await move([position[0], position[1]], aiDepth.value)
      gameState.value = result
      return result
    } finally {
      isLoading.value = false
    }
  }

  // AI悔棋
  const undoAIMove = async () => {
    if (!aiEnabled.value || !gameState.value) return null
    
    isLoading.value = true
    try {
      const result = await undo()
      gameState.value = result
      return result
    } catch (error) {
      console.error('AI悔棋失敗:', error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 結束AI遊戲
  const endAIGame = async () => {
    if (!aiEnabled.value) return
    
    try {
      await end()
      aiEnabled.value = false
      gameState.value = null
    } catch (error) {
      console.error('結束AI遊戲失敗:', error)
    }
  }

  // 轉換AI棋盤格式為Vue格式
  const convertAIBoardToVue = (aiBoard: number[][]): ('black' | 'white' | null)[][] => {
    return aiBoard.map(row => 
      row.map(cell => {
        if (cell === 1) return 'black'
        if (cell === -1) return 'white'
        return null
      })
    )
  }

  // 轉換Vue棋盤格式為AI格式
  const convertVueBoardToAI = (vueBoard: ('black' | 'white' | null)[][]): number[][] => {
    return vueBoard.map(row => 
      row.map(cell => {
        if (cell === 'black') return 1
        if (cell === 'white') return -1
        return 0
      })
    )
  }

  return {
    gameState,
    isLoading,
    aiEnabled,
    aiFirst,
    aiDepth,
    initAIGame,
    makeAIMove,
    makeAIOnlyMove,
    syncPlayerMove,
    undoAIMove,
    endAIGame,
    convertAIBoardToVue,
    convertVueBoardToAI
  }
} 