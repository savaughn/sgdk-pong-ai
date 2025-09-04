import tensorflow as tf
import numpy as np

# Load just the weights without training config
model = tf.keras.models.load_model('../models/pong_ai_model.h5', compile=False)

print("Model architecture:")
model.summary()

print("\nExtracting weights...")

# Get the actual trained weights
layer1_weights = model.layers[0].get_weights()[0]  # Dense layer weights
layer1_bias = model.layers[0].get_weights()[1]     # Dense layer bias
layer2_weights = model.layers[1].get_weights()[0]  # Dense_1 layer weights  
layer2_bias = model.layers[1].get_weights()[1]     # Dense_1 layer bias

print(f"Layer 1 weights shape: {layer1_weights.shape}")
print(f"Layer 1 bias shape: {layer1_bias.shape}")
print(f"Layer 2 weights shape: {layer2_weights.shape}")
print(f"Layer 2 bias shape: {layer2_bias.shape}")

# Scale weights to integers for Genesis (multiply by 1000 for fixed-point)
scale_factor = 1000

print("\n// Real trained weights from TensorFlow model")
print("// First layer weights: 5x8 matrix")
print("const s16 weights1[INPUT_SIZE][HIDDEN_SIZE] = {")
for i in range(layer1_weights.shape[0]):
    weights_row = [int(w * scale_factor) for w in layer1_weights[i]]
    print(f"    {{{', '.join(map(str, weights_row))}}},  // input {i}")
print("};")

print("\n// First layer bias: 8 values")
bias1_scaled = [int(b * scale_factor) for b in layer1_bias]
print(f"const s16 bias1[HIDDEN_SIZE] = {{{', '.join(map(str, bias1_scaled))}}};")

print("\n// Second layer weights: 8x3 matrix")
print("const s16 weights2[HIDDEN_SIZE][OUTPUT_SIZE] = {")
for i in range(layer2_weights.shape[0]):
    weights_row = [int(w * scale_factor) for w in layer2_weights[i]]
    print(f"    {{{', '.join(map(str, weights_row))}}},  // hidden neuron {i}")
print("};")

print("\n// Second layer bias: 3 values")
bias2_scaled = [int(b * scale_factor) for b in layer2_bias]
print(f"const s16 bias2[OUTPUT_SIZE] = {{{', '.join(map(str, bias2_scaled))}}};")

print("\n// Don't forget to update the scaling factor in the C code!")
print(f"// Use scale factor: {scale_factor}")
