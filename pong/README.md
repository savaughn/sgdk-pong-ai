# Pong AI on Sega Genesis

AI-powered Pong game for Sega Genesis using SGDK with neural network opponents.

## Features
- **3 AI Modes**: Neural Network, Simple, and Predictive AI
- **SGP Input System**: Clean controller handling with edge detection
- **Real-time AI Switching**: Press C to cycle modes
- **Score Display**: Player 1 vs AI scoring

## Quick Start
```bash
make          # Build ROM
make run      # Run in BlastEm emulator
```

## AI Training
```bash
cd ../scripts
python pong_ai_train.py    # Train neural network (5-10 min)
python get_weights.py      # Extract weights
# Copy weights to src/ai.c and set USE_DEBUG_WEIGHTS = 0
```

## Controls
- **Player 1**: Up/Down arrows
- **C Button**: Cycle AI modes (Neural → Simple → Predictive)

Built with SGDK and enhanced with SGP (Sega Genesis PAL) library.
