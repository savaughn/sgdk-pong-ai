import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as tf from '@tensorflow/tfjs';

const TrainingPage = () => {
  const [isTraining, setIsTraining] = useState(false);
  const [model, setModel] = useState(null);
  const [trainingData, setTrainingData] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [epochs, setEpochs] = useState(100);
  const [learningRate, setLearningRate] = useState(0.001);
  const [datasetSize, setDatasetSize] = useState(10000);
  const fileInputRef = useRef(null);

  // Generate synthetic training data
  const generateTrainingData = useCallback((size) => {
    const inputs = [];
    const outputs = [];

    for (let i = 0; i < size; i++) {
      // Random game state
      const ballX = Math.random() * 320;
      const ballY = Math.random() * 224;
      const ballVx = (Math.random() - 0.5) * 8;
      const ballVy = (Math.random() - 0.5) * 8;
      const aiY = Math.random() * (224 - 48);

      // Normalize inputs (matching our C implementation)
      const input = [
        ((ballX * 2) * 13) >> 6,  // bx scaled
        (ballY * 37) >> 6,        // by scaled  
        ballVx * 16,              // vx scaled
        ballVy * 16,              // vy scaled
        (aiY * 37) >> 6           // ay scaled
      ].map(val => val / 1024);   // Scale by our factor

      // Simple predictive AI logic for labels
      let action = 1; // Default: stay
      if (ballVx > 0) { // Ball moving toward AI
        const timeToReach = (296 - ballX) / ballVx;
        const predictedY = ballY + ballVy * timeToReach;
        const paddleCenter = aiY + 24;
        
        if (predictedY < paddleCenter - 8) action = 0; // Move up
        else if (predictedY > paddleCenter + 8) action = 2; // Move down
      }

      const output = [0, 0, 0];
      output[action] = 1; // One-hot encoding

      inputs.push(input);
      outputs.push(output);
    }

    return { inputs, outputs };
  }, []);

  // Create neural network model
  const createModel = useCallback(() => {
    const newModel = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [5],
          units: 8,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 3,
          activation: 'softmax'
        })
      ]
    });

    newModel.compile({
      optimizer: tf.train.adam(learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });

    setModel(newModel);
    return newModel;
  }, [learningRate]);

  // Train the model
  const trainModel = useCallback(async () => {
    if (isTraining) return;

    setIsTraining(true);
    setMetrics([]);

    try {
      // Generate or use existing training data
      const data = trainingData || generateTrainingData(datasetSize);
      if (!trainingData) setTrainingData(data);

      // Create model
      const trainModel = model || createModel();

      // Convert to tensors
      const xs = tf.tensor2d(data.inputs);
      const ys = tf.tensor2d(data.outputs);

      // Training configuration
      const startTime = Date.now();
      
      await trainModel.fit(xs, ys, {
        epochs: epochs,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: async (epoch, logs) => {
            const currentTime = Date.now();
            const newMetric = {
              epoch: epoch + 1,
              loss: logs?.loss || 0,
              accuracy: logs?.acc || 0,
              time: currentTime - startTime
            };
            
            setMetrics(prev => [...prev.slice(-49), newMetric]); // Keep last 50
            
            // Force UI update
            await tf.nextFrame();
          }
        }
      });

      // Cleanup tensors
      xs.dispose();
      ys.dispose();

      console.log('Training completed!');
    } catch (error) {
      console.error('Training failed:', error);
    } finally {
      setIsTraining(false);
    }
  }, [isTraining, trainingData, datasetSize, epochs, model, createModel, generateTrainingData]);

  // Download model
  const downloadModel = useCallback(async () => {
    if (!model) return;

    await model.save('downloads://pong-ai-model');
  }, [model]);

  // Load model from file
  const loadModel = useCallback(async (event) => {
    const files = event.target.files;
    if (!files || files.length < 2) return;

    try {
      const loadedModel = await tf.loadLayersModel(tf.io.browserFiles(Array.from(files)));
      setModel(loadedModel);
      console.log('Model loaded successfully!');
    } catch (error) {
      console.error('Failed to load model:', error);
    }
  }, []);

  // Extract weights for C code
  const extractWeights = useCallback(() => {
    if (!model) return;

    const weights = model.getWeights();
    const layer1Weights = weights[0].arraySync();
    const layer1Bias = weights[1].arraySync();
    const layer2Weights = weights[2].arraySync();
    const layer2Bias = weights[3].arraySync();

    // Scale weights by our factor (1024)
    const scaledWeights = {
      layer1_weights: layer1Weights.map(row => row.map(w => Math.round(w * 1024))),
      layer1_bias: layer1Bias.map(b => Math.round(b * 1024)),
      layer2_weights: layer2Weights.map(row => row.map(w => Math.round(w * 1024))),
      layer2_bias: layer2Bias.map(b => Math.round(b * 1024))
    };

    // Create downloadable file
    const blob = new Blob([JSON.stringify(scaledWeights, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pong_ai_weights.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [model]);

  const currentMetric = metrics[metrics.length - 1];

  return (
    <div className="min-h-screen bg-black text-green-400 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 neon-text">Neural Network Training</h1>
          <p className="text-gray-300">
            Train a neural network to play Pong using TensorFlow.js
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Training Controls */}
          <div className="retro-panel p-6">
            <h2 className="text-2xl font-bold mb-6">Training Configuration</h2>
            
            <div className="space-y-6">
              {/* Hyperparameters */}
              <div>
                <label className="block text-sm font-bold mb-2">
                  Dataset Size: {datasetSize.toLocaleString()}
                </label>
                <input
                  type="range"
                  min="1000"
                  max="50000"
                  step="1000"
                  value={datasetSize}
                  onChange={(e) => setDatasetSize(Number(e.target.value))}
                  className="w-full"
                  disabled={isTraining}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Epochs: {epochs}
                </label>
                <input
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  value={epochs}
                  onChange={(e) => setEpochs(Number(e.target.value))}
                  className="w-full"
                  disabled={isTraining}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">
                  Learning Rate: {learningRate}
                </label>
                <input
                  type="range"
                  min="0.0001"
                  max="0.01"
                  step="0.0001"
                  value={learningRate}
                  onChange={(e) => setLearningRate(Number(e.target.value))}
                  className="w-full"
                  disabled={isTraining}
                />
              </div>

              {/* Training Controls */}
              <div className="space-y-4">
                <button
                  onClick={trainModel}
                  disabled={isTraining}
                  className={`w-full py-3 px-4 rounded font-bold transition-all ${
                    isTraining
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isTraining ? 'Training...' : 'Start Training'}
                </button>

                <button
                  onClick={createModel}
                  disabled={isTraining}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-colors disabled:bg-gray-600 disabled:text-gray-400"
                >
                  Create New Model
                </button>
              </div>

              {/* Model Management */}
              <div className="border-t border-gray-700 pt-6">
                <h3 className="text-lg font-bold mb-4">Model Management</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={downloadModel}
                    disabled={!model}
                    className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors disabled:bg-gray-600 disabled:text-gray-400"
                  >
                    Download Model
                  </button>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".json,.bin"
                      onChange={loadModel}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isTraining}
                      className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors disabled:bg-gray-600 disabled:text-gray-400"
                    >
                      Load Model Files
                    </button>
                  </div>

                  <button
                    onClick={extractWeights}
                    disabled={!model}
                    className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:bg-gray-600 disabled:text-gray-400"
                  >
                    Export Weights for C
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Training Progress */}
          <div className="retro-panel p-6">
            <h2 className="text-2xl font-bold mb-6">Training Progress</h2>
            
            {/* Current Metrics */}
            {currentMetric && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-900 p-4 rounded">
                  <div className="text-sm text-gray-400">Epoch</div>
                  <div className="text-2xl font-bold">{currentMetric.epoch}</div>
                </div>
                <div className="bg-gray-900 p-4 rounded">
                  <div className="text-sm text-gray-400">Loss</div>
                  <div className="text-2xl font-bold">{currentMetric.loss.toFixed(4)}</div>
                </div>
                <div className="bg-gray-900 p-4 rounded">
                  <div className="text-sm text-gray-400">Accuracy</div>
                  <div className="text-2xl font-bold">{(currentMetric.accuracy * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-gray-900 p-4 rounded">
                  <div className="text-sm text-gray-400">Time</div>
                  <div className="text-2xl font-bold">{Math.round(currentMetric.time / 1000)}s</div>
                </div>
              </div>
            )}

            {/* Progress Chart */}
            <div className="bg-gray-900 p-4 rounded h-64 mb-6">
              {metrics.length > 0 ? (
                <div className="w-full h-full flex items-end space-x-1">
                  {metrics.slice(-20).map((metric, index) => (
                    <div
                      key={`metric-${metric.epoch}-${index}`}
                      className="flex-1 bg-green-400 rounded-t"
                      style={{
                        height: `${Math.max(5, (1 - metric.loss) * 100)}%`,
                        opacity: 0.7 + (index / 20) * 0.3
                      }}
                      title={`Epoch ${metric.epoch}: Loss ${metric.loss.toFixed(4)}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  No training data yet
                </div>
              )}
            </div>

            {/* Network Architecture */}
            <div className="bg-gray-900 p-4 rounded">
              <h3 className="text-lg font-bold mb-4">Network Architecture</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Input Layer:</span>
                  <span className="font-mono">5 neurons</span>
                </div>
                <div className="flex justify-between">
                  <span>Hidden Layer:</span>
                  <span className="font-mono">8 neurons (ReLU)</span>
                </div>
                <div className="flex justify-between">
                  <span>Output Layer:</span>
                  <span className="font-mono">3 neurons (Softmax)</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2">
                  <span>Total Parameters:</span>
                  <span className="font-mono">{model ? model.countParams().toLocaleString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Model Information */}
        <div className="mt-8 retro-panel p-6">
          <h2 className="text-2xl font-bold mb-6">About the Neural Network</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-bold text-green-400 mb-3">Input Features</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Ball X position (normalized)</li>
                <li>• Ball Y position (normalized)</li>
                <li>• Ball X velocity (normalized)</li>
                <li>• Ball Y velocity (normalized)</li>
                <li>• AI paddle Y position (normalized)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-green-400 mb-3">Output Actions</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Move Up (action 0)</li>
                <li>• Stay Still (action 1)</li>
                <li>• Move Down (action 2)</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-900 rounded">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">Integration Notes</h3>
            <p className="text-sm text-gray-300">
              The trained weights can be exported and integrated into the SGDK C code. The network uses
              the same input normalization as the native implementation for consistency. Weights are
              scaled by 1024 for efficient fixed-point arithmetic on the Genesis hardware.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TrainingPage;
