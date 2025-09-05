#!/usr/bin/env python3
"""
Generate AI Lookup Table for Genesis Pong
Precomputes neural network decisions for all quantized input combinations

Updated to use EXACT same input normalization as training script and ai.c:
- Uses same preprocessing: (bx<<1)*13>>6, by*37>>6, vx<<4, vy<<4, ay*37>>6
- Normalizes by 1024 to match scale factor for Genesis bit shifting
- Ensures perfect consistency between training, inference, and lookup table
"""

import numpy as np
import sys
import os

# Add scripts directory to path to import existing model
sys.path.append('../scripts')

# Try to load the trained model if available
try:
    import tensorflow as tf
    
    # Look for models in the models directory
    model_dir = '../models'
    model_files = []
    
    if os.path.exists(model_dir):
        for f in os.listdir(model_dir):
            if f.endswith('.h5'):
                model_files.append(os.path.join(model_dir, f))
    
    if model_files:
        # Sort by modification time, newest first
        model_files.sort(key=os.path.getmtime, reverse=False)
        model_path = model_files[0]
        model = tf.keras.models.load_model(model_path, compile=False)
        
        # Get file modification time for verification
        import time
        mod_time = os.path.getmtime(model_path)
        mod_time_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mod_time))
        
        print(f"✓ Loaded trained neural network model: {model_path}")
        print(f"  Model last modified: {mod_time_str}")
        print(f"  Model summary: {model.count_params()} parameters")
        
        use_neural_network = True
    else:
        raise FileNotFoundError("No model files found")
except Exception as e:
        print(f"⚠️  Warning: {e}")
        use_neural_network = False

# Lookup table dimensions - optimized for model differentiation vs memory usage
# Target: ~250KB for meaningful resolution differences between models
LUT_BALL_X_STEPS = 40    # 320/8 = 40 steps (8px resolution)
LUT_BALL_Y_STEPS = 28    # 224/8 = 28 steps (8px resolution)  
LUT_VEL_X_STEPS = 9      # -4, -3, -2, -1, 0, 1, 2, 3, 4 (covers realistic velocity range)
LUT_VEL_Y_STEPS = 9      # -4, -3, -2, -1, 0, 1, 2, 3, 4 (covers realistic velocity range)
LUT_AI_Y_STEPS = 28      # 224/8 = 28 steps (8px resolution for precise paddle positioning)

def neural_network_ai(ball_x, ball_y, ball_vx, ball_vy, ai_y):
    """Use the trained neural network with EXACT same input normalization as training"""
    # Use the EXACT same input normalization as in ai.c and training script
    # This ensures the LUT matches the actual game implementation
    
    # ai.c uses: inputs[0] = (bx << 1) * 13 >> 6;
    bx_input = (ball_x << 1) * 13 >> 6
    
    # ai.c uses: inputs[1] = by * 37 >> 6;
    by_input = ball_y * 37 >> 6
    
    # ai.c uses: inputs[2] = F32_toInt(ball_vx) << 4;
    vx_input = ball_vx << 4
    
    # ai.c uses: inputs[3] = F32_toInt(ball_vy) << 4;
    vy_input = ball_vy << 4
    
    # ai.c uses: inputs[4] = ay * 37 >> 6;
    ay_input = ai_y * 37 >> 6
    
    # Normalize to training range (divide by 1024 to match scale factor)
    state = np.array([
        bx_input / 1024.0,
        by_input / 1024.0, 
        vx_input / 1024.0,
        vy_input / 1024.0,
        ay_input / 1024.0
    ])
    
    # Get prediction from neural network
    q_values = model.predict(state.reshape(1, -1), verbose=0)
    action = np.argmax(q_values[0])
    
    # Debug output for first few predictions
    global debug_count
    if 'debug_count' not in globals():
        debug_count = 0
    
    if debug_count < 10:
        print(f"Debug {debug_count}: pos=({ball_x},{ball_y},{ball_vx},{ball_vy},{ai_y}) -> inputs=({bx_input},{by_input},{vx_input},{vy_input},{ay_input}) -> normalized={state} -> q_values={q_values[0]} -> action={action}")
        debug_count += 1
    
    return action

def neural_network_ai_batch(states):
    """Use the trained neural network for batch predictions (faster)"""
    # Get predictions for all states at once
    q_values_batch = model.predict(states, verbose=0)
    actions = np.argmax(q_values_batch, axis=1)
    return actions

def generate_lookup_table():
    """Generate the complete lookup table"""
    print(f"Generating {LUT_BALL_X_STEPS}×{LUT_BALL_Y_STEPS}×{LUT_VEL_X_STEPS}×{LUT_VEL_Y_STEPS}×{LUT_AI_Y_STEPS} lookup table...")
    
    total_entries = LUT_BALL_X_STEPS * LUT_BALL_Y_STEPS * LUT_VEL_X_STEPS * LUT_VEL_Y_STEPS * LUT_AI_Y_STEPS
    print(f"Total entries: {total_entries}")
    print(f"Memory usage: {total_entries} bytes = {total_entries/1024:.1f} KB")
    
    if use_neural_network:
        # Batch processing for neural network (much faster)
        print("Preparing batch prediction...")
        all_states = []
        
        for bx in range(LUT_BALL_X_STEPS):
            for by in range(LUT_BALL_Y_STEPS):
                for vx in range(LUT_VEL_X_STEPS):
                    for vy in range(LUT_VEL_Y_STEPS):
                        for ay in range(LUT_AI_Y_STEPS):
                            # Convert indices back to actual game values (8px resolution)
                            ball_x = bx * 8   # 0, 8, 16, ..., 312
                            ball_y = by * 8   # 0, 8, 16, ..., 216
                            ball_vx = vx - 4  # -4, -3, -2, -1, 0, 1, 2, 3, 4
                            ball_vy = vy - 4  # -4, -3, -2, -1, 0, 1, 2, 3, 4
                            ai_y = ay * 8     # 0, 8, 16, ..., 216
                            
                            # Use the EXACT same input normalization as ai.c and training script
                            bx_input = (ball_x << 1) * 13 >> 6
                            by_input = ball_y * 37 >> 6
                            vx_input = ball_vx << 4
                            vy_input = ball_vy << 4
                            ay_input = ai_y * 37 >> 6
                            
                            # Normalize to training range (divide by 1024 to match scale factor)
                            state = np.array([
                                bx_input / 1024.0,
                                by_input / 1024.0, 
                                vx_input / 1024.0,
                                vy_input / 1024.0,
                                ay_input / 1024.0
                            ])
                            all_states.append(state)
        
        print("Running batch prediction...")
        all_states = np.array(all_states)
        lookup_table = neural_network_ai_batch(all_states).tolist()
        
    else:
        # Sequential processing for simple AI
        lookup_table = []
        entry_count = 0
        
        for bx in range(LUT_BALL_X_STEPS):
            for by in range(LUT_BALL_Y_STEPS):
                for vx in range(LUT_VEL_X_STEPS):
                    for vy in range(LUT_VEL_Y_STEPS):
                        for ay in range(LUT_AI_Y_STEPS):
                            # Convert indices back to actual game values (8px resolution)
                            ball_x = bx * 8   # 0, 8, 16, ..., 312
                            ball_y = by * 8   # 0, 8, 16, ..., 216
                            ball_vx = vx - 4  # -4, -3, -2, -1, 0, 1, 2, 3, 4
                            ball_vy = vy - 4  # -4, -3, -2, -1, 0, 1, 2, 3, 4
                            ai_y = ay * 8     # 0, 8, 16, ..., 216
                            
                            action = simple_predictive_ai(ball_x, ball_y, ball_vx, ball_vy, ai_y)
                            lookup_table.append(action)
                            entry_count += 1
                            
                            # Progress indicator
                            if entry_count % 10000 == 0:
                                progress = (entry_count / total_entries) * 100
                                print(f"Progress: {progress:.1f}% ({entry_count}/{total_entries})")
    
    return lookup_table

def write_c_array(lookup_table, output_file):
    """Write the lookup table as a C array"""
    print(f"Writing C array to {output_file}...")
    
    with open(output_file, 'w') as f:
        f.write("// Auto-generated AI lookup table for Genesis Pong\n")
        f.write("// Generated by generate_ai_lut.py\n\n")
        f.write("#include <genesis.h>\n\n")
        f.write("// Precomputed AI decisions for quantized input space\n")
        f.write("// Each entry is an action: 0=up, 1=stay, 2=down\n")
        f.write(f"const u8 ai_lookup_table[{len(lookup_table)}] = {{\n")
        
        # Write data in rows of 20 for readability
        for i in range(0, len(lookup_table), 20):
            row = lookup_table[i:i+20]
            f.write("    " + ", ".join(map(str, row)))
            if i + 20 < len(lookup_table):
                f.write(",")
            f.write("\n")
        
        f.write("};\n")

def write_binary_file(lookup_table, output_file):
    """Write the lookup table as a binary file for SGDK resources"""
    print(f"Writing binary file to {output_file}...")
    
    # Convert to bytes
    binary_data = bytes(lookup_table)
    
    with open(output_file, 'wb') as f:
        f.write(binary_data)
    
    print(f"Binary file size: {len(binary_data)} bytes ({len(binary_data)/1024:.1f} KB)")

def main():
    print("🧠 AI Lookup Table Generator for Sega Genesis")
    print("=" * 50)
    
    # Generate the lookup table
    lookup_table = generate_lookup_table()
    
    # Write to both C header (legacy) and binary file (optimized)
    header_file = "../pong/inc/ai_lut_generated.h"
    binary_file = "../pong/res/ai_lut.bin"
    
    write_c_array(lookup_table, header_file)
    write_binary_file(lookup_table, binary_file)
    
    # Statistics
    actions = np.array(lookup_table)
    print("\n📊 Statistics:")
    print(f"Total entries: {len(lookup_table)}")
    print(f"Memory usage: {len(lookup_table)} bytes ({len(lookup_table)/1024:.1f} KB)")
    print(f"Actions - Up: {np.sum(actions == 0)} ({np.mean(actions == 0)*100:.1f}%)")
    print(f"Actions - Stay: {np.sum(actions == 1)} ({np.mean(actions == 1)*100:.1f}%)")
    print(f"Actions - Down: {np.sum(actions == 2)} ({np.mean(actions == 2)*100:.1f}%)")
    
    print(f"\n✅ Lookup table generated successfully!")

if __name__ == "__main__":
    main()
