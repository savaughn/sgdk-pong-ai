# Pong AI on Sega Genesis

AI-powered Pong game for Sega Genesis using SGDK with neural network opponents.

## Features
- **3 AI Modes**: Neural Network, Simple, and Predictive AI
- **SGP Input System**: Clean controller handling with edge detection
- **Real-time AI Switching**: Press C to cycle modes
- **Score Display**: Player 1 vs AI scoring
- **Optimized Performance**: Lookup table for fast AI inference on 68000

## Quick Start
```bash
make          # Build ROM
make run      # Run in BlastEm emulator
```

## AI Training & Deployment Workflow

### 1. Train Neural Network
```bash
cd ../scripts
python pong_ai_train.py    # Train DQN model (10,000 episodes, ~5-10 min)
```
This creates `pong_ai_model.h5` with the trained neural network weights.

### 2. Extract Weights to C Code
```bash
python get_weights.py      # Extract weights from .h5 model
```
This outputs C arrays that you copy into `src/ai.c` to replace the debug weights.

### 3. Generate Lookup Table
```bash
python generate_ai_lut.py  # Create optimized lookup table
```
This generates `ai_lut_generated.h` with pre-computed AI decisions for fast Genesis performance.

### 4. Build and Deploy
```bash
make          # Compile with new AI weights/lookup table
make run      # Test on emulator
```

## Controls
- **Player 1**: Up/Down arrows
- **C Button**: Cycle AI modes (Neural → Simple → Predictive)

## Architecture
- **Neural AI**: Uses lookup table for O(1) inference
- **Simple AI**: Ball-following with dead zone
- **Predictive AI**: Physics prediction with neural guidance

Built with SGDK and enhanced with SGP (Sega Genesis Platform) library.
