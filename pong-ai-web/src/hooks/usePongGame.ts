/**
 * WebAssembly Pong Game Hook
 * Manages the WebAssembly game instance and provides React-friendly interface
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface GameState {
  ballX: number;
  ballY: number;
  player1Y: number;
  player2Y: number;
  score1: number;
  score2: number;
}

interface PongModule {
  ccall: (name: string, returnType: string | null, argTypes: string[], args: any[]) => any;
  cwrap: (name: string, returnType: string | null, argTypes: string[]) => (...args: any[]) => any;
  HEAPF32: Float32Array;
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
}

export enum AIMode {
  NEURAL = 0,
  PREDICTIVE = 1,
  SIMPLE = 2
}

export const usePongGame = () => {
  const moduleRef = useRef<PongModule | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    ballX: 160,
    ballY: 112,
    player1Y: 88,
    player2Y: 88,
    score1: 0,
    score2: 0
  });

  // Wrapped WASM functions
  const [wasmFunctions, setWasmFunctions] = useState<{
    updateGame: () => void;
    getBallX: () => number;
    getBallY: () => number;
    getPlayer1Y: () => number;
    getPlayer2Y: () => number;
    getScore1: () => number;
    getScore2: () => number;
    setAIMode: (mode: number) => void;
    handleKeyDown: (keyCode: number) => void;
    handleKeyUp: (keyCode: number) => void;
    resetGame: () => void;
    updateNNWeights: (w1: number, b1: number, w2: number, b2: number) => void;
  } | null>(null);

  // Initialize WebAssembly module
  useEffect(() => {
    const initWasm = async () => {
      try {
        setIsLoading(true);
        
        // Import the WebAssembly module from assets
        const PongModule = await import('../assets/pong.js');
        const module = await PongModule.default() as PongModule;        moduleRef.current = module;

        // Wrap WASM functions for easier use
        const functions = {
          updateGame: module.cwrap('update_game_state', null, []),
          getBallX: module.cwrap('get_ball_x', 'number', []),
          getBallY: module.cwrap('get_ball_y', 'number', []),
          getPlayer1Y: module.cwrap('get_player1_y', 'number', []),
          getPlayer2Y: module.cwrap('get_player2_y', 'number', []),
          getScore1: module.cwrap('get_score1', 'number', []),
          getScore2: module.cwrap('get_score2', 'number', []),
          setAIMode: module.cwrap('set_ai_mode', null, ['number']),
          handleKeyDown: module.cwrap('handle_key_down', null, ['number']),
          handleKeyUp: module.cwrap('handle_key_up', null, ['number']),
          resetGame: module.cwrap('reset_game', null, []),
          updateNNWeights: module.cwrap('update_nn_weights', null, ['number', 'number', 'number', 'number'])
        };

        setWasmFunctions(functions);
        
        // Initialize the game
        module.ccall('main', null, [], []);
        
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load WebAssembly module:', err);
        setError('Failed to load game engine. Please check if WebAssembly is supported.');
        setIsLoading(false);
      }
    };

    initWasm();
  }, []);

  // Game loop
  const startGameLoop = useCallback(() => {
    if (!wasmFunctions || gameLoopRef.current) return;

    const loop = () => {
      wasmFunctions.updateGame();
      
      setGameState({
        ballX: wasmFunctions.getBallX(),
        ballY: wasmFunctions.getBallY(),
        player1Y: wasmFunctions.getPlayer1Y(),
        player2Y: wasmFunctions.getPlayer2Y(),
        score1: wasmFunctions.getScore1(),
        score2: wasmFunctions.getScore2()
      });

      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
  }, [wasmFunctions]);

  const stopGameLoop = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, []);

  // Keyboard handling
  useEffect(() => {
    if (!wasmFunctions) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      let keyCode = 0;
      if (event.code === 'KeyW') keyCode = 87;
      else if (event.code === 'KeyS') keyCode = 83;
      if (keyCode) wasmFunctions.handleKeyDown(keyCode);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      let keyCode = 0;
      if (event.code === 'KeyW') keyCode = 87;
      else if (event.code === 'KeyS') keyCode = 83;
      if (keyCode) wasmFunctions.handleKeyUp(keyCode);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [wasmFunctions]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopGameLoop();
    };
  }, [stopGameLoop]);

  // Public API
  const setAIMode = useCallback((mode: AIMode) => {
    if (wasmFunctions) {
      wasmFunctions.setAIMode(mode);
    }
  }, [wasmFunctions]);

  const resetGame = useCallback(() => {
    if (wasmFunctions) {
      wasmFunctions.resetGame();
    }
  }, [wasmFunctions]);

  const updateNeuralNetwork = useCallback((weights: {
    layer1_weights: number[][];
    layer1_bias: number[];
    layer2_weights: number[][];
    layer2_bias: number[];
  }) => {
    if (!wasmFunctions) return;

    // Flatten weight matrices
    const w1 = new Float32Array(weights.layer1_weights.flat());
    const b1 = new Float32Array(weights.layer1_bias);
    const w2 = new Float32Array(weights.layer2_weights.flat());
    const b2 = new Float32Array(weights.layer2_bias);

    // Allocate memory and copy data
    const module = moduleRef.current;
    if (!module) return;
    
    const w1Ptr = module._malloc(w1.length * 4);
    const b1Ptr = module._malloc(b1.length * 4);
    const w2Ptr = module._malloc(w2.length * 4);
    const b2Ptr = module._malloc(b2.length * 4);

    module.HEAPF32.set(w1, w1Ptr / 4);
    module.HEAPF32.set(b1, b1Ptr / 4);
    module.HEAPF32.set(w2, w2Ptr / 4);
    module.HEAPF32.set(b2, b2Ptr / 4);

    wasmFunctions.updateNNWeights(w1Ptr, b1Ptr, w2Ptr, b2Ptr);

    // Free memory
    module._free(w1Ptr);
    module._free(b1Ptr);
    module._free(w2Ptr);
    module._free(b2Ptr);
  }, [wasmFunctions]);

  return {
    gameState,
    isLoading,
    error,
    isReady: !isLoading && !error && wasmFunctions !== null,
    startGameLoop,
    stopGameLoop,
    setAIMode,
    resetGame,
    updateNeuralNetwork
  };
};
