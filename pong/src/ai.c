#include <genesis.h>
#include "ai.h"
#include "resources.h"

#if !USE_BINARY_LUT
#include "ai_lut_generated.h"
#endif

#define INPUT_SIZE 5
#define HIDDEN_SIZE 8
#define OUTPUT_SIZE 3

// Set to 1 to use debug weights, 0 to use real trained weights
#define USE_DEBUG_WEIGHTS 0

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
    {-1400, 2400, -1600}};

const s16 debug_bias2[OUTPUT_SIZE] = {-400, 200, -300};

// Real trained weights from TensorFlow model
// First layer weights: 5x8 matrix
const s16 weights1[INPUT_SIZE][HIDDEN_SIZE] = {
    {-1822, -811, 1724, 1640, -422, -415, 76, 1398},      // ball_x weights
    {-2106, 1719, -1864, -1155, 1860, -1776, 4256, 5352}, // ball_y weights
    {3098, 410, -688, 996, -1955, 4908, -1385, 1130},     // ball_vx weights
    {-1488, 790, -545, -190, 1440, -498, 759, 2052},      // ball_vy weights
    {342, 1048, 4850, 3532, 134, 2237, -298, -2745},      // ai_y weights
};

// First layer bias: 8 values
const s16 bias1[HIDDEN_SIZE] = {1290, 1480, -53, -804, 952, 1604, 321, 851};

// Second layer weights: 8x3 matrix
const s16 weights2[HIDDEN_SIZE][OUTPUT_SIZE] = {
    {3703, 2942, 4013},    // hidden neuron 0
    {-543, 2240, 995},     // hidden neuron 1
    {-4234, -4597, -4437}, // hidden neuron 2
    {-3348, -4562, -2511}, // hidden neuron 3
    {3661, 1650, 2479},    // hidden neuron 4
    {3433, 3378, 2508},    // hidden neuron 5
    {2705, 2116, 2444},    // hidden neuron 6
    {-3185, -3414, -2910}, // hidden neuron 7
};

// Second layer bias: 3 values
const s16 bias2[OUTPUT_SIZE] = {627, 1694, 150};

// ReLU activation function
static inline s16 relu(s16 x)
{
    return (x > 0) ? x : 0;
}

// Neural network forward pass
s16 pong_ai_NN(fix32 ball_x, fix32 ball_y, fix32 ball_vx, fix32 ball_vy, fix32 ai_y)
{
    s16 inputs[INPUT_SIZE];

    s16 bx = F32_toInt(ball_x);
    inputs[0] = (bx << 1) * 13 >> 6;

    s16 by = F32_toInt(ball_y);
    inputs[1] = by * 37 >> 6;

    inputs[2] = F32_toInt(ball_vx) << 4;
    inputs[3] = F32_toInt(ball_vy) << 4;

    s16 ay = F32_toInt(ai_y);
    inputs[4] = ay * 37 >> 6;

    s16 hidden[HIDDEN_SIZE];
    for (u8 h = 0; h < HIDDEN_SIZE; h++)
    {
#if USE_DEBUG_WEIGHTS
        s32 sum = debug_bias1[h];
        for (u8 i = 0; i < INPUT_SIZE; i++)
        {
            sum += (s32)inputs[i] * debug_weights1[i][h] >> 6;
        }
#else
        s32 sum = bias1[h];
        for (u8 i = 0; i < INPUT_SIZE; i++)
        {
            // Use 1024 scale factor for easy bit shifting: >>10 is divide by 1024
            sum += ((s32)inputs[i] * weights1[i][h]) >> 10;
        }
#endif
        hidden[h] = relu((s16)sum);
    }

    s16 outputs[OUTPUT_SIZE];
    for (u8 o = 0; o < OUTPUT_SIZE; o++)
    {
#if USE_DEBUG_WEIGHTS
        s32 sum = debug_bias2[o];
        for (u8 h = 0; h < HIDDEN_SIZE; h++)
        {
            sum += (s32)hidden[h] * debug_weights2[h][o] >> 6; // /64 using bit shift
        }
#else
        s32 sum = bias2[o];
        for (u8 h = 0; h < HIDDEN_SIZE; h++)
        {
            // Use 1024 scale factor for easy bit shifting: >>10 is divide by 1024
            sum += ((s32)hidden[h] * weights2[h][o]) >> 10;
        }
#endif
        outputs[o] = (s16)sum;
    }

    s16 best_action = 0;
    s16 best_value = outputs[0];
    for (u8 i = 1; i < OUTPUT_SIZE; i++)
    {
        if (outputs[i] > best_value)
        {
            best_value = outputs[i];
            best_action = i;
        }
    }

    return best_action; // 0=up, 1=stay, 2=down
}

s16 pong_ai_predict(fix32 ball_x, fix32 ball_y, fix32 ball_vx, fix32 ball_vy, fix32 ai_y)
{
    // Convert fixed-point to integers for simpler math
    s16 bx = F32_toInt(ball_x);
    s16 by = F32_toInt(ball_y);
    s16 bvx = F32_toInt(ball_vx);
    s16 bvy = F32_toInt(ball_vy);
    s16 ay = F32_toInt(ai_y);

    // Predict where ball will be when it reaches paddle
    s16 ball_future_y = by;
    if (bvx > 0)
    { // Ball moving toward AI
        s16 time_to_paddle = (290 - bx) / bvx;
        ball_future_y = by + (bvy * time_to_paddle);

        // Handle wall bounces
        while (ball_future_y < 0 || ball_future_y > 224)
        {
            if (ball_future_y < 0)
                ball_future_y = -ball_future_y;
            if (ball_future_y > 224)
                ball_future_y = 224 - (ball_future_y - 224);
        }
    }

    s16 paddle_center = ay + 24; // Paddle is 48 pixels tall
    s16 diff = ball_future_y - paddle_center;

    // Dead zone to avoid jittery movement
    if (diff < -8)
        return 0; // Move up
    if (diff > 8)
        return 2; // Move down
    return 1;     // Stay
}

// Precomputed lookup table approach for Genesis optimization
// This creates a quantized decision table instead of full neural network inference
#define LUT_BALL_X_STEPS 40 // 320/8 = 40 steps (8px resolution)
#define LUT_BALL_Y_STEPS 28 // 224/8 = 28 steps (8px resolution)
#define LUT_VEL_X_STEPS 9   // -4, -3, -2, -1, 0, 1, 2, 3, 4
#define LUT_VEL_Y_STEPS 9   // -4, -3, -2, -1, 0, 1, 2, 3, 4
#define LUT_AI_Y_STEPS 28   // 224/8 = 28 steps (8px resolution)

// Fast lookup function - O(1) instead of O(neural network)
s16 pong_ai_lookup(fix32 ball_x, fix32 ball_y, fix32 ball_vx, fix32 ball_vy, fix32 ai_y)
{
    // Quantize inputs to lookup table indices (8px resolution)
    u16 bx_idx = F32_toInt(ball_x) >> 3; // Divide by 8 using bit shift
    u16 by_idx = F32_toInt(ball_y) >> 3; // Divide by 8 using bit shift
    u16 vx_idx = F32_toInt(ball_vx) + 4; // Map -4..4 to 0..8
    u16 vy_idx = F32_toInt(ball_vy) + 4; // Map -4..4 to 0..8
    u16 ay_idx = F32_toInt(ai_y) >> 3;   // Divide by 8 using bit shift

    // Clamp to valid ranges
    if (bx_idx >= LUT_BALL_X_STEPS)
        bx_idx = LUT_BALL_X_STEPS - 1;
    if (by_idx >= LUT_BALL_Y_STEPS)
        by_idx = LUT_BALL_Y_STEPS - 1;
    if (vx_idx >= LUT_VEL_X_STEPS)
        vx_idx = LUT_VEL_X_STEPS - 1;
    if (vy_idx >= LUT_VEL_Y_STEPS)
        vy_idx = LUT_VEL_Y_STEPS - 1;
    if (ay_idx >= LUT_AI_Y_STEPS)
        ay_idx = LUT_AI_Y_STEPS - 1;

    // Calculate lookup table index (5D to 1D mapping)
    // Must match the order in generate_ai_lut.py: bx, by, vx, vy, ay
    u32 index = ((((bx_idx * LUT_BALL_Y_STEPS + by_idx) * LUT_VEL_X_STEPS + vx_idx) * LUT_VEL_Y_STEPS + vy_idx) * LUT_AI_Y_STEPS + ay_idx);

#if USE_BINARY_LUT
    // Use binary resource (faster build, smaller memory footprint)
    const u8* lut_data = (const u8*)ai_lut;
    return lut_data[index];
#else
    // Use header array (legacy)
    return ai_lookup_table[index];
#endif
}
