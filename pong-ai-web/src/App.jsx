import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import Navbar from './components/layout/Navbar'
import LoadingScreen from './components/ui/LoadingScreen'

// Lazy load pages for better performance
const HomePage = React.lazy(() => import('./pages/HomePage'))
const GamePage = React.lazy(() => import('./pages/GamePage'))
const TrainingPage = React.lazy(() => import('./pages/TrainingPage'))
const VisualizerPage = React.lazy(() => import('./pages/VisualizerPage'))
const AboutPage = React.lazy(() => import('./pages/AboutPage'))

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white scan-lines">
      {/* Matrix-style background */}
      <div className="fixed inset-0 matrix-bg pointer-events-none" />
      
      {/* Main content */}
      <div className="relative z-10">
        <Navbar />
        
        <main className="container mx-auto px-4 py-8">
          <Suspense fallback={<LoadingScreen />}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/game" element={<GamePage />} />
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/visualizer" element={<VisualizerPage />} />
                <Route path="/about" element={<AboutPage />} />
              </Routes>
            </motion.div>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export default App
