# Pong AI on Sega Genesis

AI-powered Pong game for Sega Genesis using SGDK with neural network opponents.

<img width="752" height="620" alt="Screenshot 2025-09-07 at 11 44 43 PM" src="https://github.com/user-attachments/assets/62ae1ae5-0916-4755-9b12-f1a61332a863" />
<img width="752" height="620" alt="Screenshot 2025-09-07 at 11 44 52 PM" src="https://github.com/user-attachments/assets/543d01e5-9571-4de9-a0f4-ddc27001ebbe" />


## Features
- **3 AI Modes**: Neural Network, Simple, and Predictive AI
- **SGP Input System**: Clean controller handling with edge detection
- **Real-time AI Switching**: Press C to cycle modes
- **Score Display**: Player 1 vs AI scoring
- **Optimized Performance**: Lookup table for fast AI inference on 68000

## Project Structure
```
sgdk-pong-ai/
├── pong/                    # Sega Genesis ROM source code
│   ├── src/                 # C source files
│   ├── inc/                 # Header files
│   ├── res/                 # Resources (sprites, etc.)
│   └── Makefile            # Build configuration
├── scripts/                 # AI training and utilities
│   ├── pong_ai_train.py    # Neural network training
│   ├── get_weights.py      # Weight extraction
│   └── generate_ai_lut.py  # Lookup table generation
├── models/                  # Trained AI models
│   └── pong_ai_model.h5    # Trained neural network
└── README.md               # You are here
```

## Quick Start

### Build and Run Game (sgdk toolchain required)
```bash
cd pong/
make          # Build ROM
make run      # Run in BlastEm emulator 
```

## AI Training & Deployment Workflow

### 1. Train Neural Network
```bash
cd scripts/
python pong_ai_train.py    # Train DQN model (10,000 episodes, ~5-10 min)
```
This creates `models/pong_ai_model.h5` with the trained neural network weights.

### 2. Extract Weights to C Code
```bash
python get_weights.py      # Extract weights from .h5 model
```
This outputs C arrays that you copy into `pong/src/ai.c` to replace the debug weights.

### 3. Generate Lookup Table
```bash
python generate_ai_lut.py  # Create optimized lookup table
```
This generates `pong/src/ai_lut_generated.c` with pre-computed AI decisions for fast Genesis performance.

### 4. Build and Deploy
```bash
cd ../pong/
make          # Compile with new AI weights/lookup table
make run      # Test on emulator
```

## Controls
- **Player 1**: Up/Down arrows
- **C Button**: Cycle AI modes (Neural → Lookup → Simple → Predictive)

## Architecture
- **Neural AI**: Uses full neural network for inference
- **Neural Lookup AI**: Uses lookup table for O(1) inference
- **Simple AI**: Ball-following with dead zone
- **Predictive AI**: Physics prediction with neural guidance

Built with SGDK and enhanced with SGP (Sega Genesis Platform) library.
