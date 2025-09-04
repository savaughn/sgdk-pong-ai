#include "ai.h"
#include <genesis.h>

#define INPUT_SIZE 5
#define HIDDEN_SIZE 8
#define OUTPUT_SIZE 3

// Set to 1 to use debug weights, 0 to use real trained weights
#define USE_DEBUG_WEIGHTS 1

// DEBUG WEIGHTS 
const s16 debug_weights1[INPUT_SIZE][HIDDEN_SIZE] = {
    {3200, -1800, 2400, -800, 1600, 2000, -1200, 800},    // ball_x weights
    {-2400, 3600, -1600, 2800, -2000, 1400, 3200, -2600}, // ball_y weights  
    {4800, -3200, 2600, -1800, 3400, -2400, 1800, 2200},  // ball_vx weights
    {-1600, 2400, -3000, 1800, -2200, 2800, -1400, 3600}, // ball_vy weights
    {2800, -2000, 1600, -2600, 2400, -1800, 2000, -1400}  // ai_y weights
};

const s16 debug_bias1[HIDDEN_SIZE] = {800, -600, 1200, -400, 600, -800, 1000, -200};

const s16 debug_weights2[HIDDEN_SIZE][OUTPUT_SIZE] = {
    {1800, -2400, 1600}, 
    {-1200, 2800, -2000},
    {2400, -1600, 2200}, 
    {-1800, 1400, -2600},
    {1600, -2200, 1800}, 
    {-2000, 2600, -1400},
    {2200, -1800, 2000}, 
    {-1400, 2400, -1600} 
};

const s16 debug_bias2[OUTPUT_SIZE] = {-400, 200, -300};

// REAL TRAINED WEIGHTS - Extracted from the actual neural network training
// First layer weights: 5x8 matrix
const s16 weights1[INPUT_SIZE][HIDDEN_SIZE] = {
    {150, 177, -745, 280, -653, -266, -652, -321},  // ball_x weights
    {400, -513, -583, 466, -260, -350, 8, -24},     // ball_y weights  
    {169, -481, 388, 122, 132, 23, -156, 524},      // ball_vx weights
    {-49, -436, -481, -72, 536, 275, 479, -755},    // ball_vy weights
    {-266, -529, 365, 410, -644, 207, -185, -451}   // ai_y weights
};

// First layer bias: 8 values (REAL TRAINED BIASES!)
const s16 bias1[HIDDEN_SIZE] = {-146, -52, -215, -47, 0, 8, -104, 112};

// Second layer weights: 8x3 matrix (REAL TRAINED WEIGHTS!)
const s16 weights2[HIDDEN_SIZE][OUTPUT_SIZE] = {
    {551, 376, -414},  
    {297, 290, 229},   
    {316, 532, 455},   
    {-14, -627, -323}, 
    {-46, 437, 215},   
    {51, -272, -423},  
    {332, 490, 728},   
    {-437, -90, 343}   
};

// Second layer bias: 3 values (REAL TRAINED BIASES!)
const s16 bias2[OUTPUT_SIZE] = {-213, 79, -42};

// ReLU activation function
static inline s16 relu(s16 x) {
    return (x > 0) ? x : 0;
}

// Neural network forward pass
s16 pong_ai_NN(fix32 ball_x, fix32 ball_y, fix32 ball_vx, fix32 ball_vy, fix32 ai_y) {
    // Normalize inputs using optimized math (avoid expensive division)
    s16 inputs[INPUT_SIZE];
    
    // ball_x: 0-320 -> scale by 64/160 = 2/5 -> multiply by 2, then divide by 5
    // Use bit shift for *2, then multiply by reciprocal for /5
    s16 bx = F32_toInt(ball_x);
    inputs[0] = (bx << 1) * 13 >> 6;  // *2 * (64/5) / 64 = *2/5, approx with 13/32
    
    // ball_y: 0-224 -> scale by 64/112 = 4/7 -> use reciprocal approximation
    s16 by = F32_toInt(ball_y);
    inputs[1] = by * 37 >> 6;  // *37/64 ≈ *4/7 (37/64 = 0.578, 4/7 = 0.571)
    
    // ball velocities are already small, just scale
    inputs[2] = F32_toInt(ball_vx) << 4;  // *16 using bit shift
    inputs[3] = F32_toInt(ball_vy) << 4;  // *16 using bit shift  
    
    // ai_y: 0-224 -> same as ball_y scaling
    s16 ay = F32_toInt(ai_y);
    inputs[4] = ay * 37 >> 6;  // *37/64 ≈ *4/7
    
    // First layer: input -> hidden
    s16 hidden[HIDDEN_SIZE];
    for (u8 h = 0; h < HIDDEN_SIZE; h++) {
#if USE_DEBUG_WEIGHTS
        s32 sum = debug_bias1[h];
        for (u8 i = 0; i < INPUT_SIZE; i++) {
            sum += (s32)inputs[i] * debug_weights1[i][h] >> 6;  // /64 using bit shift
        }
#else
        s32 sum = bias1[h];
        for (u8 i = 0; i < INPUT_SIZE; i++) {
            // Avoid /1000 division - use approximation: /1000 ≈ *33/32768 (33/32768 = 0.00101)
            sum += ((s32)inputs[i] * weights1[i][h] * 33) >> 15;  // /1000 approximation
        }
#endif
        hidden[h] = relu((s16)sum);
    }
    
    // Second layer: hidden -> output
    s16 outputs[OUTPUT_SIZE];
    for (u8 o = 0; o < OUTPUT_SIZE; o++) {
#if USE_DEBUG_WEIGHTS
        s32 sum = debug_bias2[o];
        for (u8 h = 0; h < HIDDEN_SIZE; h++) {
            sum += (s32)hidden[h] * debug_weights2[h][o] >> 6;  // /64 using bit shift
        }
#else
        s32 sum = bias2[o];
        for (u8 h = 0; h < HIDDEN_SIZE; h++) {
            // Same /1000 approximation
            sum += ((s32)hidden[h] * weights2[h][o] * 33) >> 15;
        }
#endif
        outputs[o] = (s16)sum;
    }
    
    // Find the output with the highest activation (argmax)
    s16 best_action = 0;
    s16 best_value = outputs[0];
    for (u8 i = 1; i < OUTPUT_SIZE; i++) {
        if (outputs[i] > best_value) {
            best_value = outputs[i];
            best_action = i;
        }
    }
    
    return best_action;  // 0=up, 1=stay, 2=down
}

s16 pong_ai_predict(fix32 ball_x, fix32 ball_y, fix32 ball_vx, fix32 ball_vy, fix32 ai_y) {
    // Convert fixed-point to integers for simpler math
    s16 bx = F32_toInt(ball_x);
    s16 by = F32_toInt(ball_y);
    s16 bvx = F32_toInt(ball_vx);
    s16 bvy = F32_toInt(ball_vy);
    s16 ay = F32_toInt(ai_y);
    
    // Predict where ball will be when it reaches paddle
    s16 ball_future_y = by;
    if (bvx > 0) {  // Ball moving toward AI
        s16 time_to_paddle = (290 - bx) / bvx;
        ball_future_y = by + (bvy * time_to_paddle);
        
        // Handle wall bounces
        while (ball_future_y < 0 || ball_future_y > 224) {
            if (ball_future_y < 0) ball_future_y = -ball_future_y;
            if (ball_future_y > 224) ball_future_y = 224 - (ball_future_y - 224);
        }
    }
    
    s16 paddle_center = ay + 24;  // Paddle is 48 pixels tall
    s16 diff = ball_future_y - paddle_center;
    
    // Dead zone to avoid jittery movement
    if (diff < -8) return 0;  // Move up
    if (diff > 8) return 2;   // Move down
    return 1;  // Stay
}
