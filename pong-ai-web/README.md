# SGDK Pong AI - Web Interface

A comprehensive web-based companion to the SGDK Pong AI project, featuring an interactive game engine, neural network training interface, and AI decision visualizer.

## 🚀 Features

### 🎮 Interactive Game
- WebAssembly-powered Pong game engine
- Multiple AI difficulty modes (Simple, Predictive, Neural Network)
- Real-time gameplay with keyboard controls
- Genesis-accurate game physics and mechanics

### 🧠 Neural Network Training
- In-browser AI training using TensorFlow.js
- Interactive hyperparameter tuning
- Real-time training metrics and visualization
- Export trained weights for SGDK integration

### 📊 AI Decision Visualizer
- Interactive heatmaps of AI decision patterns
- Ball trajectory prediction visualization
- Decision boundary exploration
- Real-time parameter adjustment

## 🛠 Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **AI/ML**: TensorFlow.js
- **Game Engine**: WebAssembly (C compiled with Emscripten)
- **Animations**: Framer Motion
- **Styling**: Retro/cyberpunk theme with scan lines and glow effects

## 🏃 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Emscripten SDK (for WebAssembly compilation)

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Install Emscripten** (for WASM compilation):
   ```bash
   # macOS with Homebrew
   brew install emscripten
   
   # Or download from https://emscripten.org/docs/getting_started/downloads.html
   ```

3. **Build WebAssembly module**:
   ```bash
   cd src/wasm
   make
   ```

4. **Start development server**:
   ```bash
   npm run dev
   ```

5. **Open browser**: Navigate to `http://localhost:5173`

## 📁 Project Structure

```
pong-ai-web/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── layout/         # Navigation, layout components
│   │   └── ui/             # Loading screens, buttons, etc.
│   ├── pages/              # Main application pages
│   │   ├── HomePage.tsx    # Landing page
│   │   ├── GamePage.tsx    # Interactive game
│   │   ├── TrainingPage.tsx # Neural network training
│   │   └── VisualizerPage.tsx # AI decision visualizer
│   ├── hooks/              # Custom React hooks
│   │   └── usePongGame.ts  # WebAssembly game interface
│   ├── wasm/               # WebAssembly source code
│   │   ├── pong.c          # Game engine implementation
│   │   └── Makefile        # WASM build configuration
│   └── styles/             # CSS and styling
└── public/                 # Static assets and WASM output
```

## 🎯 Usage Guide

### Playing the Game

1. Navigate to **Play Game** page
2. Use **W/S** keys to control your paddle
3. Select AI difficulty mode:
   - **Simple**: Basic ball-following AI
   - **Predictive**: Physics-based trajectory prediction
   - **Neural**: Trained neural network AI
4. Click **PLAY** to start, **PAUSE** to pause

### Training Neural Networks

1. Go to **Train AI** page
2. Adjust hyperparameters:
   - Dataset size (1,000 - 50,000 samples)
   - Training epochs (10 - 500)
   - Learning rate (0.0001 - 0.01)
3. Click **Start Training** to begin
4. Monitor real-time training metrics
5. **Export Weights for C** to integrate with SGDK

### Visualizing AI Decisions

1. Open **Visualizer** page
2. Adjust game state parameters using sliders
3. Switch between visualization modes:
   - **Heatmap**: Decision confidence across positions
   - **Trajectory**: Ball path prediction
   - **Decision**: Discrete action boundaries
4. Observe how AI decisions change with different parameters

## 🔧 Development

### Building WebAssembly

The game engine is written in C and compiled to WebAssembly:

```bash
cd src/wasm
make clean
make
```

This generates `pong.js` and `pong.wasm` in the `public/` directory.

### Development Server

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

### Linting

```bash
npm run lint     # Run ESLint
```

## 🎨 Styling

The project uses a retro/cyberpunk aesthetic with:

- **Colors**: Green on black terminal theme
- **Typography**: Monospace fonts with neon glow effects
- **Effects**: Scan lines, matrix-style backgrounds, glowing borders
- **Animations**: Smooth transitions and hover effects

Custom CSS classes:
- `.retro-panel`: Styled container with borders and glow
- `.neon-text`: Glowing text effect
- `.retro-scanlines`: CRT-style scan line overlay

## 🔗 Integration with SGDK

The web interface is designed to complement the SGDK Pong AI project:

1. **Train models** in the browser using TensorFlow.js
2. **Export weights** as JSON files scaled for fixed-point arithmetic
3. **Copy weights** to the SGDK project's AI implementation
4. **Visualize** how the AI makes decisions in real-time

The input normalization and network architecture match the SGDK implementation exactly for seamless integration.

## 📝 License

This project is part of the SGDK Pong AI educational book and follows the same licensing terms.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

## 📚 Related

- [SGDK Pong AI Book](../readme.md) - The main project documentation
- [Original SGDK Implementation](../pong/) - Native Sega Genesis version
- [Training Scripts](../scripts/) - Python training and weight extraction tools
