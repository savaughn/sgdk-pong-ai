import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePongGame, AIMode } from '../hooks/usePongGame';
import { useModel } from '../contexts/ModelContext';

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 448;
const SCALE = 2; // 2x scale for better visibility

const GamePage = () => {
  const { hasTrainedModel, extractModelWeights } = useModel();
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAiMode, setCurrentAiMode] = useState(AIMode.PREDICTIVE);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  const {
    gameState,
    isLoading,
    error,
    isReady,
    startGameLoop,
    stopGameLoop,
    setAIMode,
    resetGame,
    updateNeuralNetwork
  } = usePongGame();

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = '#00ff00';
    // Player 1 paddle
    ctx.fillRect(
      16 * SCALE,  // Fixed X position for player 1
      gameState.player1Y * SCALE,
      8 * SCALE,
      48 * SCALE
    );
    // Player 2 paddle  
    ctx.fillRect(
      (320 - 24) * SCALE,
      gameState.player2Y * SCALE,
      8 * SCALE,
      48 * SCALE
    );

    // Draw ball
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      gameState.ballX * SCALE,
      gameState.ballY * SCALE,
      8 * SCALE,
      8 * SCALE
    );

    // Draw score
    ctx.fillStyle = '#00ff00';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${gameState.score1}`,
      CANVAS_WIDTH / 4,
      60
    );
    ctx.fillText(
      `${gameState.score2}`,
      (CANVAS_WIDTH * 3) / 4,
      60
    );

    // Draw AI mode indicator
    ctx.font = '16px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffff00';
    let modeText = 'SIMPLE';
    if (currentAiMode === AIMode.NEURAL) modeText = 'NEURAL';
    else if (currentAiMode === AIMode.PREDICTIVE) modeText = 'PREDICTIVE';
    ctx.fillText(`AI: ${modeText}`, 10, CANVAS_HEIGHT - 20);

  }, [gameState, isReady, currentAiMode]);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopGameLoop();
      setIsPlaying(false);
    } else {
      startGameLoop();
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    resetGame();
    setIsPlaying(false);
    stopGameLoop();
  };

  const handleAIModeChange = (newMode) => {
    setCurrentAiMode(newMode);
    setAIMode(newMode);
    
    // If switching to neural mode and we have a trained model, load it
    if (newMode === AIMode.NEURAL && hasTrainedModel()) {
      const weights = extractModelWeights();
      if (weights) {
        updateNeuralNetwork(weights);
        setModelLoaded(true);
        console.log('Loaded trained model into game engine');
      }
    } else if (newMode === AIMode.NEURAL && !hasTrainedModel()) {
      console.warn('No trained model available. Please train a model first.');
    } else {
      setModelLoaded(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-green-400 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-400 mx-auto mb-4"></div>
          <p className="text-xl">Loading Game Engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-red-400 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Game Engine Error</h2>
          <p className="mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 neon-text">Pong AI Game</h1>
          <p className="text-gray-300">
            Use W/S keys to control your paddle. Watch the AI adapt!
          </p>
        </div>

        {/* Game Canvas */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border border-green-400 retro-scanlines"
              style={{ imageRendering: 'pixelated' }}
            />
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
                <div className="text-center">
                  <p className="text-2xl mb-4">Game Paused</p>
                  <p className="text-sm text-gray-400">Click Play to continue</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Game Controls */}
          <div className="retro-panel p-6">
            <h3 className="text-xl font-bold mb-4">Game Controls</h3>
            <div className="space-y-4">
              <button
                onClick={handlePlayPause}
                className={`w-full py-3 px-4 rounded font-bold transition-all ${
                  isPlaying 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isPlaying ? 'PAUSE' : 'PLAY'}
              </button>
              <button
                onClick={handleReset}
                className="w-full py-3 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-bold transition-colors"
              >
                RESET
              </button>
            </div>
          </div>

          {/* AI Mode Selection */}
          <div className="retro-panel p-6">
            <h3 className="text-xl font-bold mb-4">AI Mode</h3>
            <div className="space-y-2">
              {[
                { mode: AIMode.SIMPLE, label: 'Simple', desc: 'Basic ball following' },
                { mode: AIMode.PREDICTIVE, label: 'Predictive', desc: 'Ball trajectory prediction' },
                { mode: AIMode.NEURAL, label: 'Neural Network', desc: 'ML-based decision making' }
              ].map(({ mode, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => handleAIModeChange(mode)}
                  className={`w-full p-3 text-left rounded transition-all ${
                    currentAiMode === mode
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <div className="font-bold">{label}</div>
                  <div className="text-sm opacity-75">{desc}</div>
                </button>
              ))}
            </div>
            
            {/* Model Status */}
            {currentAiMode === AIMode.NEURAL && (
              <div className="mt-4 p-3 rounded border">
                {hasTrainedModel() ? (
                  modelLoaded ? (
                    <div className="flex items-center space-x-2 text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="font-medium">Trained Model Active</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-yellow-400">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="font-medium">Model Available</span>
                      </div>
                      <button
                        onClick={() => {
                          const weights = extractModelWeights();
                          if (weights) {
                            updateNeuralNetwork(weights);
                            setModelLoaded(true);
                          }
                        }}
                        className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                      >
                        Load Trained Model
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex items-center space-x-2 text-red-400">
                    <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                    <span className="font-medium">No Trained Model</span>
                    <span className="text-sm">- Train one first!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Game Stats */}
          <div className="retro-panel p-6">
            <h3 className="text-xl font-bold mb-4">Game Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Player Score:</span>
                <span className="font-bold">{gameState.score1}</span>
              </div>
              <div className="flex justify-between">
                <span>AI Score:</span>
                <span className="font-bold">{gameState.score2}</span>
              </div>
              <div className="flex justify-between">
                <span>Ball Position:</span>
                <span className="font-mono text-sm">
                  ({Math.round(gameState.ballX)}, {Math.round(gameState.ballY)})
                </span>
              </div>
              <div className="flex justify-between">
                <span>AI Y Position:</span>
                <span className="font-mono text-sm">{Math.round(gameState.player2Y)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 retro-panel p-6">
          <h3 className="text-xl font-bold mb-4">How to Play</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-bold text-green-400 mb-2">Controls:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• <kbd className="bg-gray-800 px-2 py-1 rounded">W</kbd> - Move paddle up</li>
                <li>• <kbd className="bg-gray-800 px-2 py-1 rounded">S</kbd> - Move paddle down</li>
                <li>• Left paddle is controlled by you</li>
                <li>• Right paddle is controlled by AI</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-green-400 mb-2">AI Modes:</h4>
              <ul className="space-y-1 text-gray-300">
                <li>• <strong>Simple:</strong> Follows ball position directly</li>
                <li>• <strong>Predictive:</strong> Calculates ball trajectory with physics</li>
                <li>• <strong>Neural:</strong> Uses trained neural network for decisions</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GamePage;
