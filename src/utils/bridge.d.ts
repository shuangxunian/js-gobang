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

export function start(board_size: number, aiFirst?: boolean, depth?: number): Promise<AIGameState>
export function move(position: [number, number], depth?: number): Promise<AIGameState>
export function undo(): Promise<AIGameState>
export function end(): Promise<AIGameState> 