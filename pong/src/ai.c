#include <genesis.h>
#include "ai.h"
#include "resources.h"

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

// First layer weights: 5x8 matrix
const s32 weights1[INPUT_SIZE][HIDDEN_SIZE] = {
    {260, -738, 244, -260, -712, 62, 160, -861},      // ball_x weights
    {1987, -86, -392, 759, -230, -1882, -2603, -415}, // ball_y weights
    {-773, 1266, -76, -855, 1146, -638, -329, 1417},  // ball_vx weights
    {645, 389, -425, 216, 356, -231, -282, 480},      // ball_vy weights
    {-1599, 352, -564, -774, 496, 1606, 2691, 1009},  // ai_y weights
};

// First layer bias: 8 values
const s32 bias1[HIDDEN_SIZE] = {-150, 1102, -8, 128, 1074, 303, 520, 1084};

// Second layer weights: 8x3 matrix
const s32 weights2[HIDDEN_SIZE][OUTPUT_SIZE] = {
    {-2960, -3011, -2847}, // hidden neuron 0
    {1289, 509, 1139},     // hidden neuron 1
    {384, -485, -264},     // hidden neuron 2
    {1332, 1446, 1235},    // hidden neuron 3
    {509, 1524, 960},      // hidden neuron 4
    {2996, 2627, 3258},    // hidden neuron 5
    {-3906, -3781, -4017}, // hidden neuron 6
    {978, 849, 777},       // hidden neuron 7
};

// Second layer bias: 3 values
const s32 bias2[OUTPUT_SIZE] = {773, 790, 707};

// Real trained weights from TensorFlow model - using s32 for higher precision
const s32 expert_weights1[INPUT_SIZE][HIDDEN_SIZE] = {
    {440, -789, 267, -550, -739, 83, 139, -890},      // ball_x weights
    {1777, -28, -375, 136, -173, -1717, -2536, -333}, // ball_y weights
    {-764, 1212, -48, -85, 1121, -468, -147, 1386},   // ball_vx weights
    {598, 414, -450, 448, 344, -223, -170, 481},      // ball_vy weights
    {-1548, 351, -514, -630, 504, 1351, 2566, 1033},  // ai_y weights
};

// First layer bias: 8 values
const s32 expert_bias1[HIDDEN_SIZE] = {-189, 1043, 9, 60, 1013, 246, 355, 1017};

// Second layer weights: 8x3 matrix
const s32 expert_weights2[HIDDEN_SIZE][OUTPUT_SIZE] = {
    {-2711, -2753, -2598}, // hidden neuron 0
    {1262, 476, 1116},     // hidden neuron 1
    {346, -551, -216},     // hidden neuron 2
    {405, 763, 671},       // hidden neuron 3
    {479, 1489, 936},      // hidden neuron 4
    {2368, 2056, 2692},    // hidden neuron 5
    {-3633, -3490, -3764}, // hidden neuron 6
    {955, 821, 746},       // hidden neuron 7
};

// Second layer bias: 3 values
const s32 expert_bias2[OUTPUT_SIZE] = {721, 739, 690};

// ReLU activation function
static inline s32 relu(s32 x)
{
    return (x > 0) ? x : 0;
}

// Neural network forward pass
s16 pong_ai_NN(fix32 ball_x, fix32 ball_y, fix32 ball_vx, fix32 ball_vy, fix32 ai_y)
{
    // Convert to tile coordinates and normalize to [0, 1024]
    s32 tile_ball_x = F32_toInt(ball_x) >> 3; // ball_x >> 3
    s32 tile_ball_y = F32_toInt(ball_y) >> 3; // ball_y >> 3
    s32 tile_ai_y = F32_toInt(ai_y) >> 3;     // ai_y >> 3
    s32 norm_ball_x = (tile_ball_x * 1024) / 39;
    s32 norm_ball_y = (tile_ball_y * 1024) / 27;
    s32 norm_ball_vx = ((F32_toInt(ball_vx) + 4) * 1024) >> 3;
    s32 norm_ball_vy = ((F32_toInt(ball_vy) + 4) * 1024) >> 3;
    s32 norm_ai_y = (tile_ai_y * 1024) / 27;

    s32 inputs[INPUT_SIZE] = {
        norm_ball_x,
        norm_ball_y,
        norm_ball_vx,
        norm_ball_vy,
        norm_ai_y};

    s32 hidden[HIDDEN_SIZE];
    for (u8 h = 0; h < HIDDEN_SIZE; h++)
    {
        s32 sum = bias1[h];
        for (u8 i = 0; i < INPUT_SIZE; i++)
        {
            sum += (inputs[i] * weights1[i][h]) >> 10; // scale back down
        }
        hidden[h] = relu(sum);
    }
    s32 outputs[OUTPUT_SIZE];
    for (u8 o = 0; o < OUTPUT_SIZE; o++)
    {
        s32 sum = bias2[o];
        for (u8 h = 0; h < HIDDEN_SIZE; h++)
        {
            sum += (hidden[h] * weights2[h][o]) >> 10;
        }
        outputs[o] = sum;
    }
    // Return action with highest output
    s16 best_action = 0;
    s32 best_value = outputs[0];
    for (u8 o = 1; o < OUTPUT_SIZE; o++)
    {
        if (outputs[o] > best_value)
        {
            best_action = o;
            best_value = outputs[o];
        }
    }
    return best_action;
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
        return AI_ACTION_MOVE_UP; // Move up
    if (diff > 8)
        return AI_ACTION_MOVE_DOWN; // Move down
    return AI_ACTION_STAY;          // Stay
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
    u32 index = ((((bx_idx * LUT_BALL_Y_STEPS + by_idx) * LUT_VEL_X_STEPS + vx_idx) * LUT_VEL_Y_STEPS + vy_idx) * LUT_AI_Y_STEPS + ay_idx);

    return (s16)((u8*)ai_lut_bin)[index];
}
