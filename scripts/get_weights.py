import tensorflow as tf
import numpy as np
import os

# Updated script to extract weights from the optimized 2-layer neural network
# Architecture: 5 inputs -> 8 hidden neurons -> 3 outputs
# Scale factor: 1024 for efficient bit shifting on Genesis (>>10)

# Check if model exists
model_path = '../models/pong_ai_model.h5'
if not os.path.exists(model_path):
    # Try alternative location
    model_path = '../pong_ai_model.h5'
    if not os.path.exists(model_path):
        print("❌ Error: Could not find pong_ai_model.h5")
        print("   Make sure you've trained a model first using pong_ai_train.py")
        exit(1)

print(f"📁 Loading model from: {model_path}")

# Load just the weights without training config
try:
    model = tf.keras.models.load_model(model_path, compile=False)
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    exit(1)

print("\n" + "="*60)
print("🧠 MODEL ARCHITECTURE")
print("="*60)
model.summary()

print("\n" + "="*60)
print("⚙️  EXTRACTING WEIGHTS FOR GENESIS")
print("="*60)

# Verify the expected architecture
expected_layers = 2
if len(model.layers) != expected_layers:
    print(f"⚠️  Warning: Expected {expected_layers} layers, found {len(model.layers)}")
    print("   This script is designed for the simplified 2-layer architecture:")
    print("   Layer 0: Dense(8, input_dim=5, activation='relu')")
    print("   Layer 1: Dense(3, activation='linear')")
    print("   Please check your model architecture.")

# Get the actual trained weights
layer1_weights = model.layers[0].get_weights()[0]  # First Dense layer weights (5x8)
layer1_bias = model.layers[0].get_weights()[1]     # First Dense layer bias (8,)
layer2_weights = model.layers[1].get_weights()[0]  # Second Dense layer weights (8x3)
layer2_bias = model.layers[1].get_weights()[1]     # Second Dense layer bias (3,)

print(f"📊 Layer 1 weights shape: {layer1_weights.shape} (expected: 5x8)")
print(f"📊 Layer 1 bias shape: {layer1_bias.shape} (expected: 8,)")
print(f"📊 Layer 2 weights shape: {layer2_weights.shape} (expected: 8x3)")  
print(f"📊 Layer 2 bias shape: {layer2_bias.shape} (expected: 3,)")

# Verify shapes match expectations
if layer1_weights.shape != (5, 8):
    print(f"❌ Error: Layer 1 weights shape {layer1_weights.shape} doesn't match expected (5, 8)")
    exit(1)
if layer2_weights.shape != (8, 3):
    print(f"❌ Error: Layer 2 weights shape {layer2_weights.shape} doesn't match expected (8, 3)")
    exit(1)

# Scale weights to integers for Genesis (multiply by 1024 for easy bit shifting)
scale_factor = 1024

print(f"\n🎯 Using scale factor: {scale_factor} (for >>10 bit shifting)")
print(f"📈 Weight range after scaling: {layer1_weights.min() * scale_factor:.0f} to {layer1_weights.max() * scale_factor:.0f}")

print("\n" + "="*80)
print("🎮 GENESIS-COMPATIBLE C CODE")
print("="*80)

print("\n// Real trained weights from TensorFlow model - Genesis optimized")
print("// Architecture: 5 inputs -> 8 hidden -> 3 outputs")
print("// Scale factor: 1024 (use >>10 for division)")
print("")
print("// First layer weights: 5x8 matrix")
print("const s16 weights1[INPUT_SIZE][HIDDEN_SIZE] = {")
for i in range(layer1_weights.shape[0]):
    weights_row = [int(w * scale_factor) for w in layer1_weights[i]]
    input_names = ["ball_x", "ball_y", "ball_vx", "ball_vy", "ai_y"]
    print(f"    {{{', '.join(f'{w:5d}' for w in weights_row)}}},  // {input_names[i]} weights")
print("};")

print("\n// First layer bias: 8 values")
bias1_scaled = [int(b * scale_factor) for b in layer1_bias]
print(f"const s16 bias1[HIDDEN_SIZE] = {{{', '.join(f'{b:4d}' for b in bias1_scaled)}}};")

print("\n// Second layer weights: 8x3 matrix")
print("const s16 weights2[HIDDEN_SIZE][OUTPUT_SIZE] = {")
for i in range(layer2_weights.shape[0]):
    weights_row = [int(w * scale_factor) for w in layer2_weights[i]]
    print(f"    {{{', '.join(f'{w:5d}' for w in weights_row)}}},  // hidden neuron {i}")
print("};")

print("\n// Second layer bias: 3 values")
bias2_scaled = [int(b * scale_factor) for b in layer2_bias]
print(f"const s16 bias2[OUTPUT_SIZE] = {{{', '.join(f'{b:4d}' for b in bias2_scaled)}}};")

print("\n" + "="*80)
print("📋 INTEGRATION INSTRUCTIONS")
print("="*80)
print("1. Copy the weights above into pong/src/ai.c")
print("2. Replace the existing weights1, bias1, weights2, bias2 arrays")
print("3. Make sure USE_DEBUG_WEIGHTS is set to 0 in ai.c")
print("4. The C code already uses >>10 bit shifting for the 1024 scale factor")
print("5. Rebuild the game: make clean && make")
print("="*80)
