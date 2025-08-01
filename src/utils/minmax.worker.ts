import Board from '../ai/board.ts';
import { minmax } from '../ai/minmax.ts';
import { board_size } from '../ai/config.ts';
import type { AIGameState } from '@/composables/useAI';

interface WorkerMessage {
  action: 'start' | 'move' | 'undo' | 'end';
  payload?: any;
}

interface WorkerResponse {
  action: string;
  payload: any;
}

type Role = 1 | -1;
type Move = [number, number];

onmessage = function (event: MessageEvent<WorkerMessage>) {
  const { action, payload } = event.data;
  let res: any = null;
  switch (action) {
    case 'start':
      res = start(payload.board_size, payload.aiFirst, payload.depth);
      break;
    case 'move':
      res = move(payload.position, payload.depth);
      break;
    case 'undo':
      res = undo();
      break;
    case 'end':
      res = end();
      break;
    default:
      break;
  }
  postMessage({
    action,
    payload: res,
  } as WorkerResponse);
};

let board = new Board(board_size);
let score = 0;
let bestPath: Move[] = [];
let currentDepth = 0;

const getBoardData = (): AIGameState => {
  return {
    board: JSON.parse(JSON.stringify(board.board)),
    winner: board.getWinner(),
    current_player: board.role,
    history: JSON.parse(JSON.stringify(board.history)),
    size: board.size,
    score,
    bestPath,
    currentDepth,
  };
};

export const start = (board_size: number, aiFirst = true, depth = 4): AIGameState => {
  console.log('start', board_size, aiFirst, depth);
  board = new Board(board_size);
  try {
    if (aiFirst) {
      const res = minmax(board, board.role, depth);
      let move: Move | null;
      [score, move, bestPath] = res;
      if (move) {
        board.put(move[0], move[1]);
      }
    }
  } catch (e) {
    console.log(e);
  }
  return getBoardData();
};

export const move = (position: Move, depth: number): AIGameState => {
  try {
    board.put(position[0], position[1]);
  } catch (e) {
    console.log(e);
  }
  if (!board.isGameOver()) {
    const res = minmax(board, board.role, depth);
    let move: Move | null;
    [score, move, bestPath] = res;
    if (move) {
      board.put(move[0], move[1]);
    }
  }
  return getBoardData();
};

export const end = (): AIGameState => {
  // do nothing
  return getBoardData();
};

export const undo = (): AIGameState => {
  board.undo();
  board.undo();
  return getBoardData();
}; 