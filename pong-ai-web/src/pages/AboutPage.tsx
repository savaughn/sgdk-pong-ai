import React from 'react';
import { motion } from 'framer-motion';

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-black text-green-400 p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 neon-text">About SGDK Pong AI</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            A comprehensive exploration of artificial intelligence development for the Sega Genesis, 
            bridging retro gaming with modern machine learning.
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-12">
          {/* Project Overview */}
          <div className="retro-panel p-8">
            <h2 className="text-3xl font-bold mb-6 text-green-400">Project Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4 text-yellow-400">The Genesis Version</h3>
                <p className="text-gray-300 mb-4">
                  The native implementation runs on actual Sega Genesis hardware using the SGDK 
                  (Sega Genesis Development Kit). It features multiple AI algorithms optimized 
                  for the 16-bit constraints of the Motorola 68000 processor.
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>Fixed-point arithmetic for performance</li>
                  <li>Lookup table-based neural networks</li>
                  <li>Real-time physics simulation</li>
                  <li>Memory-efficient data structures</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-bold mb-4 text-yellow-400">The Web Interface</h3>
                <p className="text-gray-300 mb-4">
                  This modern web application provides tools for training, visualizing, and 
                  experimenting with AI algorithms. It serves as both a development environment 
                  and an educational platform.
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  <li>Interactive neural network training</li>
                  <li>Real-time AI decision visualization</li>
                  <li>WebAssembly game engine</li>
                  <li>Seamless Genesis integration</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="retro-panel p-8">
            <h2 className="text-3xl font-bold mb-6 text-green-400">Technical Architecture</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-gray-900 p-6 rounded">
                <h3 className="text-xl font-bold mb-4 text-blue-400">Game Engine</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• C/C++ core implementation</li>
                  <li>• WebAssembly compilation</li>
                  <li>• 60 FPS physics simulation</li>
                  <li>• Cross-platform compatibility</li>
                  <li>• Genesis-accurate timing</li>
                </ul>
              </div>
              
              <div className="bg-gray-900 p-6 rounded">
                <h3 className="text-xl font-bold mb-4 text-purple-400">AI Systems</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• Simple reactive AI</li>
                  <li>• Predictive trajectory AI</li>
                  <li>• Neural network AI</li>
                  <li>• Lookup table optimization</li>
                  <li>• Fixed-point arithmetic</li>
                </ul>
              </div>
              
              <div className="bg-gray-900 p-6 rounded">
                <h3 className="text-xl font-bold mb-4 text-orange-400">Web Framework</h3>
                <ul className="text-gray-300 space-y-2 text-sm">
                  <li>• React 18 with hooks</li>
                  <li>• TensorFlow.js integration</li>
                  <li>• Real-time data visualization</li>
                  <li>• Responsive design</li>
                  <li>• Modern development tools</li>
                </ul>
              </div>
            </div>
          </div>

          {/* AI Algorithms */}
          <div className="retro-panel p-8">
            <h2 className="text-3xl font-bold mb-6 text-green-400">AI Algorithms</h2>
            
            <div className="space-y-6">
              <div className="border-l-4 border-red-500 pl-6">
                <h3 className="text-xl font-bold mb-2 text-red-400">Simple AI</h3>
                <p className="text-gray-300">
                  A basic reactive algorithm that simply follows the ball's Y position. 
                  Demonstrates fundamental game AI concepts and serves as a baseline for comparison.
                </p>
              </div>
              
              <div className="border-l-4 border-yellow-500 pl-6">
                <h3 className="text-xl font-bold mb-2 text-yellow-400">Predictive AI</h3>
                <p className="text-gray-300">
                  Uses physics simulation to predict where the ball will be when it reaches the paddle. 
                  Accounts for wall bounces and ball acceleration, providing challenging gameplay.
                </p>
              </div>
              
              <div className="border-l-4 border-green-500 pl-6">
                <h3 className="text-xl font-bold mb-2 text-green-400">Neural Network AI</h3>
                <p className="text-gray-300">
                  A trained neural network that learns optimal strategies through gameplay data. 
                  Features a 5-8-3 architecture with ReLU activation and fixed-point weight quantization.
                </p>
              </div>
            </div>
          </div>

          {/* Educational Value */}
          <div className="retro-panel p-8">
            <h2 className="text-3xl font-bold mb-6 text-green-400">Educational Goals</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4 text-cyan-400">Learning Objectives</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• Understanding retro gaming constraints</li>
                  <li>• AI algorithm implementation</li>
                  <li>• Performance optimization techniques</li>
                  <li>• Cross-platform development</li>
                  <li>• Machine learning fundamentals</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-bold mb-4 text-cyan-400">Practical Skills</h3>
                <ul className="text-gray-300 space-y-2">
                  <li>• C programming for embedded systems</li>
                  <li>• Neural network training and deployment</li>
                  <li>• Web development with modern frameworks</li>
                  <li>• WebAssembly integration</li>
                  <li>• Real-time graphics programming</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Development Timeline */}
          <div className="retro-panel p-8">
            <h2 className="text-3xl font-bold mb-6 text-green-400">Development Journey</h2>
            
            <div className="space-y-4">
              {[
                { phase: "Genesis Foundation", desc: "Basic Pong implementation in SGDK", color: "red" },
                { phase: "AI Integration", desc: "Simple and predictive AI algorithms", color: "yellow" },
                { phase: "Neural Networks", desc: "Training pipeline and weight extraction", color: "blue" },
                { phase: "Web Platform", desc: "Browser-based training and visualization", color: "green" },
                { phase: "Optimization", desc: "Performance tuning and lookup tables", color: "purple" }
              ].map((item, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`w-4 h-4 rounded-full bg-${item.color}-500`} />
                  <div className="flex-1">
                    <span className="font-bold text-white">{item.phase}:</span>
                    <span className="text-gray-300 ml-2">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className="retro-panel p-8">
            <h2 className="text-3xl font-bold mb-6 text-green-400">Resources & Links</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-bold mb-3 text-yellow-400">Documentation</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• Project README</li>
                  <li>• API Reference</li>
                  <li>• Build Instructions</li>
                  <li>• Troubleshooting Guide</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-bold mb-3 text-yellow-400">Technologies</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• SGDK Framework</li>
                  <li>• TensorFlow.js</li>
                  <li>• React & Vite</li>
                  <li>• WebAssembly</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-bold mb-3 text-yellow-400">Community</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• GitHub Repository</li>
                  <li>• Discussion Forums</li>
                  <li>• Video Tutorials</li>
                  <li>• Developer Blog</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center py-8 border-t border-gray-700">
            <p className="text-gray-400">
              Created with ❤️ for the retro gaming and AI development community
            </p>
            <p className="text-sm text-gray-500 mt-2">
              SGDK Pong AI © 2024 - Educational project exploring AI on classic hardware
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AboutPage;
