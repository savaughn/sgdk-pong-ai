import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Brain, 
  Gamepad2, 
  Eye, 
  Zap, 
  Cpu, 
  Target,
  ArrowRight,
  Sparkles
} from 'lucide-react'

const HomePage = () => {
  const features = [
    {
      icon: Gamepad2,
      title: "Play Classic Pong",
      description: "Experience the reimagined classic with AI opponents of varying difficulty levels",
      link: "/game",
      color: "retro-green"
    },
    {
      icon: Brain,
      title: "Train Neural Networks",
      description: "Build and train your own AI using TensorFlow.js in the browser",
      link: "/training", 
      color: "ai-cyan"
    },
    {
      icon: Eye,
      title: "Visualize AI Decisions",
      description: "See how your trained AI makes decisions with interactive visualizations",
      link: "/visualizer",
      color: "genesis-purple"
    }
  ]

  const stats = [
    { label: "AI Models", value: "∞", icon: Brain },
    { label: "Game States", value: "2.5M", icon: Target },
    { label: "Training Speed", value: "Real-time", icon: Zap },
    { label: "Compatibility", value: "Web+WASM", icon: Cpu }
  ]

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center py-20"
      >
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity }}
          className="text-8xl mb-8"
        >
          🧠
        </motion.div>
        
        <h1 className="retro-text text-4xl md:text-6xl text-retro-green mb-6 glow-text">
          PONG AI LAB
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
          The ultimate playground for exploring artificial intelligence through the classic game of Pong. 
          Train neural networks, visualize AI decisions, and experience retro gaming enhanced by modern machine learning.
        </p>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link 
            to="/game" 
            className="btn-retro text-lg px-8 py-4 flex items-center space-x-2"
          >
            <Gamepad2 />
            <span>Start Playing</span>
            <ArrowRight />
          </Link>
          
          <Link 
            to="/training" 
            className="btn-ai text-lg px-8 py-4 flex items-center space-x-2"
          >
            <Brain />
            <span>Train AI</span>
            <Sparkles />
          </Link>
        </motion.div>
      </motion.section>

      {/* Features Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.2 }}
            whileHover={{ scale: 1.05, y: -10 }}
            className="card-retro group cursor-pointer"
          >
            <Link to={feature.link} className="block">
              <div className={`text-${feature.color} text-4xl mb-4 group-hover:animate-bounce`}>
                <feature.icon size={48} />
              </div>
              
              <h3 className="text-xl font-bold mb-3 text-white group-hover:text-retro-green transition-colors">
                {feature.title}
              </h3>
              
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
              
              <div className="mt-4 flex items-center text-retro-green opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">Explore</span>
                <ArrowRight size={16} className="ml-2" />
              </div>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* Stats Section */}
      <motion.section 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700"
      >
        <h2 className="retro-text text-2xl text-center text-retro-green mb-8">
          BY THE NUMBERS
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-ai-cyan text-3xl mb-2">
                <stat.icon size={32} className="mx-auto" />
              </div>
              <div className="text-2xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-center py-16 border-t border-gray-700"
      >
        <h2 className="text-3xl font-bold mb-4 text-white">
          Ready to dive into AI-powered gaming?
        </h2>
        <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
          This web application is a companion to the comprehensive SGDK Pong AI book. 
          Experience everything you've learned in an interactive, browser-based environment.
        </p>
        <Link 
          to="/about" 
          className="btn-retro text-lg px-8 py-4 inline-flex items-center space-x-2"
        >
          <span>Learn More</span>
          <ArrowRight />
        </Link>
      </motion.section>
    </div>
  )
}

export default HomePage
