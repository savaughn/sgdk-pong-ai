import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

const VisualizerPage = () => {
  const canvasRef = useRef(null);
  const [lookupTable, setLookupTable] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [visualizationMode, setVisualizationMode] = useState('heatmap');
  const [params, setParams] = useState({
    ballX: 160,
    ballY: 112,
    ballVx: 2,
    ballVy: 1,
    aiY: 88
  });
  const [isLoading, setIsLoading] = useState(false);

  // Generate sample lookup table data
  const generateLookupTable = useCallback(() => {
    setIsLoading(true);
    const entries = [];
    
    // Sample the game state space
    for (let bx = 0; bx < 320; bx += 20) {
      for (let by = 0; by < 224; by += 16) {
        for (let vx = -4; vx <= 4; vx += 2) {
          for (let vy = -4; vy <= 4; vy += 2) {
            for (let ay = 0; ay < 176; ay += 32) {
              // Simulate neural network decision
              const inputs = [
                ((bx * 2) * 13) >> 6,
                (by * 37) >> 6,
                vx * 16,
                vy * 16,
                (ay * 37) >> 6
              ].map(val => val / 1024);

              // Simple mock neural network
              let action = 1; // Default: stay
              let confidence = 0.33;

              if (vx > 0) { // Ball moving toward AI
                const timeToReach = (296 - bx) / vx;
                const predictedY = by + vy * timeToReach;
                const paddleCenter = ay + 24;
                const diff = predictedY - paddleCenter;
                
                if (diff < -8) {
                  action = 0; // Move up
                  confidence = Math.min(0.9, 0.5 + Math.abs(diff) / 50);
                } else if (diff > 8) {
                  action = 2; // Move down
                  confidence = Math.min(0.9, 0.5 + Math.abs(diff) / 50);
                } else {
                  confidence = 0.8;
                }
              }

              entries.push({
                ballX: bx,
                ballY: by,
                ballVx: vx,
                ballVy: vy,
                aiY: ay,
                action,
                confidence
              });
            }
          }
        }
      }
    }

    setLookupTable(entries);
    setIsLoading(false);
  }, []);

  // Initialize lookup table
  useEffect(() => {
    generateLookupTable();
  }, [generateLookupTable]);

  // Canvas visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || lookupTable.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = 2;
    const canvasWidth = 320 * scale;
    const canvasHeight = 224 * scale;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (visualizationMode === 'heatmap') {
      // Draw action heatmap
      const relevantEntries = lookupTable.filter(entry => 
        Math.abs(entry.ballVx - params.ballVx) <= 1 &&
        Math.abs(entry.ballVy - params.ballVy) <= 1 &&
        Math.abs(entry.aiY - params.aiY) <= 16
      );

      relevantEntries.forEach(entry => {
        const alpha = entry.confidence;
        let color = '';
        
        switch (entry.action) {
          case 0: color = `rgba(255, 0, 0, ${alpha})`; break;   // Red: move up
          case 1: color = `rgba(0, 255, 0, ${alpha})`; break;   // Green: stay
          case 2: color = `rgba(0, 0, 255, ${alpha})`; break;   // Blue: move down
        }

        ctx.fillStyle = color;
        ctx.fillRect(
          entry.ballX * scale,
          entry.ballY * scale,
          20 * scale,
          16 * scale
        );
      });

    } else if (visualizationMode === 'trajectory') {
      // Draw ball trajectory prediction
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      let x = params.ballX;
      let y = params.ballY;
      let vx = params.ballVx;
      let vy = params.ballVy;
      
      ctx.moveTo(x * scale, y * scale);
      
      for (let i = 0; i < 50; i++) {
        x += vx;
        y += vy;
        
        // Bounce off walls
        if (y <= 8 || y >= 216) vy = -vy;
        if (x <= 0 || x >= 320) break;
        
        ctx.lineTo(x * scale, y * scale);
      }
      
      ctx.stroke();

    } else if (visualizationMode === 'decision') {
      // Draw decision boundary visualization
      const gridSize = 16;
      for (let x = 0; x < 320; x += gridSize) {
        for (let y = 0; y < 224; y += gridSize) {
          const entry = lookupTable.find(e => 
            Math.abs(e.ballX - x) < 10 &&
            Math.abs(e.ballY - y) < 8 &&
            Math.abs(e.ballVx - params.ballVx) <= 1 &&
            Math.abs(e.ballVy - params.ballVy) <= 1 &&
            Math.abs(e.aiY - params.aiY) <= 16
          );

          if (entry) {
            ctx.fillStyle = entry.action === 0 ? '#ff4444' : 
                           entry.action === 1 ? '#44ff44' : '#4444ff';
            ctx.fillRect(x * scale, y * scale, gridSize * scale, gridSize * scale);
          }
        }
      }
    }

    // Draw current ball position
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      (params.ballX - 4) * scale,
      (params.ballY - 4) * scale,
      8 * scale,
      8 * scale
    );

    // Draw AI paddle
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(
      (320 - 24) * scale,
      params.aiY * scale,
      8 * scale,
      48 * scale
    );

    // Draw center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2, 0);
    ctx.lineTo(canvasWidth / 2, canvasHeight);
    ctx.stroke();
    ctx.setLineDash([]);

  }, [lookupTable, visualizationMode, params]);

  // Find closest lookup table entry
  const findClosestEntry = useCallback(() => {
    if (lookupTable.length === 0) return null;

    let closest = lookupTable[0];
    let minDistance = Infinity;

    for (const entry of lookupTable) {
      const distance = Math.sqrt(
        Math.pow(entry.ballX - params.ballX, 2) +
        Math.pow(entry.ballY - params.ballY, 2) +
        Math.pow(entry.ballVx - params.ballVx, 2) * 100 +
        Math.pow(entry.ballVy - params.ballVy, 2) * 100 +
        Math.pow(entry.aiY - params.aiY, 2)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closest = entry;
      }
    }

    setSelectedEntry(closest);
  }, [lookupTable, params]);

  useEffect(() => {
    findClosestEntry();
  }, [findClosestEntry]);

  const actionNames = ['Move Up', 'Stay', 'Move Down'];
  const actionColors = ['#ff4444', '#44ff44', '#4444ff'];

  return (
    <div className="min-h-screen bg-black text-green-400 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 neon-text">AI Decision Visualizer</h1>
          <p className="text-gray-300">
            Explore how the AI makes decisions based on game state
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Visualization Canvas */}
          <div className="lg:col-span-2">
            <div className="retro-panel p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Game State Visualization</h2>
                <div className="flex space-x-2">
                  {['heatmap', 'trajectory', 'decision'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setVisualizationMode(mode)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        visualizationMode === mode
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      }`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-center mb-4">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={448}
                  className="border border-green-400 retro-scanlines"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                {actionNames.map((name, index) => (
                  <div key={name} className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: actionColors[index] }}
                    />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Parameter Controls */}
            <div className="retro-panel p-6">
              <h3 className="text-lg font-bold mb-4">Game State Parameters</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-1">
                    Ball X: {params.ballX}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="320"
                    value={params.ballX}
                    onChange={(e) => setParams(prev => ({ ...prev, ballX: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">
                    Ball Y: {params.ballY}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="224"
                    value={params.ballY}
                    onChange={(e) => setParams(prev => ({ ...prev, ballY: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">
                    Ball Velocity X: {params.ballVx}
                  </label>
                  <input
                    type="range"
                    min="-6"
                    max="6"
                    value={params.ballVx}
                    onChange={(e) => setParams(prev => ({ ...prev, ballVx: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">
                    Ball Velocity Y: {params.ballVy}
                  </label>
                  <input
                    type="range"
                    min="-6"
                    max="6"
                    value={params.ballVy}
                    onChange={(e) => setParams(prev => ({ ...prev, ballVy: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-1">
                    AI Paddle Y: {params.aiY}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="176"
                    value={params.aiY}
                    onChange={(e) => setParams(prev => ({ ...prev, aiY: Number(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>

              <button
                onClick={generateLookupTable}
                disabled={isLoading}
                className="w-full mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:bg-gray-600"
              >
                {isLoading ? 'Generating...' : 'Regenerate Data'}
              </button>
            </div>

            {/* Current Decision */}
            {selectedEntry && (
              <div className="retro-panel p-6">
                <h3 className="text-lg font-bold mb-4">Current Decision</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Action:</span>
                    <span 
                      className="font-bold"
                      style={{ color: actionColors[selectedEntry.action] }}
                    >
                      {actionNames[selectedEntry.action]}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span className="font-bold">
                      {(selectedEntry.confidence * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${selectedEntry.confidence * 100}%`,
                        backgroundColor: actionColors[selectedEntry.action]
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Statistics */}
            <div className="retro-panel p-6">
              <h3 className="text-lg font-bold mb-4">Lookup Table Stats</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Entries:</span>
                  <span className="font-mono">{lookupTable.length.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Move Up:</span>
                  <span className="font-mono">
                    {lookupTable.filter(e => e.action === 0).length.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Stay:</span>
                  <span className="font-mono">
                    {lookupTable.filter(e => e.action === 1).length.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Move Down:</span>
                  <span className="font-mono">
                    {lookupTable.filter(e => e.action === 2).length.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div className="mt-8 retro-panel p-6">
          <h2 className="text-2xl font-bold mb-6">Visualization Modes</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-bold text-green-400 mb-2">Heatmap Mode</h3>
              <p className="text-gray-300">
                Shows AI decision confidence as colored intensity across ball positions.
                Filters by current velocity and paddle position parameters.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-green-400 mb-2">Trajectory Mode</h3>
              <p className="text-gray-300">
                Displays predicted ball trajectory with current velocity settings.
                Helps understand how the AI anticipates ball movement.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-green-400 mb-2">Decision Mode</h3>
              <p className="text-gray-300">
                Shows discrete decision boundaries across the play field.
                Each colored region represents a different AI action choice.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default VisualizerPage;
