import type { AIGameState } from '@/composables/useAI'

type Action = 'start' | 'move' | 'undo' | 'end' | 'aiMove'

interface WorkerMessage {
  action: Action
  payload?: any
}

interface WorkerResponse {
  action: Action
  payload: any
}

const worker = new Worker(new URL('./minmax.worker.ts', import.meta.url), { type: 'module' })

let CURRENT_SIZE = 15

function callWorker<T>(msg: WorkerMessage, expect: Action, timeoutMs = 300000): Promise<T> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent<WorkerResponse>) => {
      const { action, payload } = event.data || {}
      if (action !== expect) return
      clearTimeout(timer)
      worker.removeEventListener('message', handler)
      resolve(payload as T)
    }

    const timer = setTimeout(() => {
      worker.removeEventListener('message', handler)
      reject(new Error(`Worker "${expect}" timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    worker.addEventListener('message', handler)
    worker.postMessage(msg)
  })
}

// 统一导出 API
export const start = async (board_size: number, aiFirst: boolean, depth: number): Promise<AIGameState> => {
  const res = await callWorker<AIGameState>({ action: 'start', payload: { board_size, aiFirst, depth } }, 'start')
  CURRENT_SIZE = board_size || res.size || 15
  return res
}

export const move = async (
  position: number | [number, number],
  depth: number
): Promise<AIGameState> => {
  return new Promise((resolve) => {
    worker.postMessage({
      action: 'move',
      payload: { position, depth },
    })
    worker.onmessage = (event) => {
      const { action, payload } = event.data
      if (action === 'move') resolve(payload)
    }
  })
}


export const aiMove = async (depth: number): Promise<AIGameState> => {
  return callWorker<AIGameState>({ action: 'aiMove', payload: { depth } }, 'aiMove')
}

export const undo = async (): Promise<AIGameState> => {
  return callWorker<AIGameState>({ action: 'undo' }, 'undo')
}

export const end = async (): Promise<void> => {
  return callWorker<void>({ action: 'end' }, 'end')
}

// 给 useAI 用的安全索引编码（避免写死 15）
export const encodeIndex = (row: number, col: number, size = CURRENT_SIZE) => row * size + col
