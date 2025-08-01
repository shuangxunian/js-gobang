import type { AIGameState } from '@/composables/useAI';

interface WorkerMessage {
  action: 'start' | 'move' | 'undo' | 'end';
  payload?: any;
}

interface WorkerResponse {
  action: string;
  payload: any;
}

const worker = new Worker(new URL('./minmax.worker.ts', import.meta.url), { type: 'module' });

export const start = async (board_size: number, aiFirst: boolean, depth: number): Promise<AIGameState> => {
  return new Promise((resolve, reject) => {
    worker.postMessage({
      action: 'start',
      payload: {
        board_size,
        aiFirst,
        depth,
      },
    } as WorkerMessage);
    
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { action, payload } = event.data;
      if (action === 'start') {
        resolve(payload);
      }
    };
  });
};

export const move = async (position: number, depth: number): Promise<AIGameState> => {
  return new Promise((resolve, reject) => {
    worker.postMessage({
      action: 'move',
      payload: {
        position,
        depth,
      },
    } as WorkerMessage);
    
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { action, payload } = event.data;
      if (action === 'move') {
        resolve(payload);
      }
    };
  });
};

export const end = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    worker.postMessage({
      action: 'end',
    } as WorkerMessage);
    
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const { action, payload } = event.data;
      if (action === 'end') {
        resolve(payload);
      }
    };
  });
};

export const undo = async (): Promise<AIGameState> => {
  return new Promise((resolve, reject) => {
    worker.postMessage({
      action: 'undo',
    } as WorkerMessage);
    
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      console.log('undo', event);
      const { action, payload } = event.data;
      if (action === 'undo') {
        resolve(payload);
      }
    };
  });
}; 