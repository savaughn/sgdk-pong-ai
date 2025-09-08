/**
 * WebAssembly Pong Game Hook
 * Manages the WebAssembly game instance and provides React-friendly interface
 */

import { useEffect, useRef, useState, useCallback } from 'react';

const AIMode = {
  NEURAL: 0,
  PREDICTIVE: 1,
  SIMPLE: 2
};

export { AIMode };

export const usePongGame = () => {
  const moduleRef = useRef(null);
  const gameLoopRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameState, setGameState] = useState({
    ballX: 160,
    ballY: 112,
    player1Y: 88,
    player2Y: 88,
    score1: 0,
    score2: 0
  });

  // Wrapped WASM functions
  const [wasmFunctions, setWasmFunctions] = useState(null);

  // Initialize WebAssembly module
  useEffect(() => {
    const initWasm = async () => {
      try {
        setIsLoading(true);
        
        // Load the WebAssembly module via script tag
        console.log('Loading WASM module...');
        
        let module;
        
        // Check if PongModule is already loaded globally
        if (typeof window.PongModule === 'function') {
          console.log('PongModule already available');
          module = await window.PongModule({
            locateFile: (path) => {
              console.log('Locating file:', path);
              if (path.endsWith('.wasm')) {
                return '/pong.wasm';
              }
              return path;
            }
          });
          console.log('Module instantiated from cached:', module);
          moduleRef.current = module;
        } else {
          // Load the script dynamically
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = '/pong.js';
            script.onload = () => {
              console.log('Script loaded successfully');
              resolve();
            };
            script.onerror = (error) => {
              console.error('Failed to load script:', error);
              reject(error);
            };
            document.head.appendChild(script);
          });
          
          // Now check if PongModule is available
          if (typeof window.PongModule === 'function') {
            console.log('PongModule loaded via script');
            module = await window.PongModule({
              locateFile: (path) => {
                console.log('Locating file:', path);
                if (path.endsWith('.wasm')) {
                  return '/pong.wasm';
                }
                return path;
              }
            });
            console.log('Module instantiated:', module);
            moduleRef.current = module;
          } else {
            throw new Error('PongModule not available after script load');
          }
        }

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

    const handleKeyDown = (event) => {
      let keyCode = 0;
      if (event.code === 'KeyW') keyCode = 87;
      else if (event.code === 'KeyS') keyCode = 83;
      if (keyCode) wasmFunctions.handleKeyDown(keyCode);
    };

    const handleKeyUp = (event) => {
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
  const setAIMode = useCallback((mode) => {
    if (wasmFunctions) {
      wasmFunctions.setAIMode(mode);
    }
  }, [wasmFunctions]);

  const resetGame = useCallback(() => {
    if (wasmFunctions) {
      wasmFunctions.resetGame();
    }
  }, [wasmFunctions]);

  const updateNeuralNetwork = useCallback((weights) => {
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
