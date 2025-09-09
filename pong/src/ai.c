#include <genesis.h>
#include "ai.h"
#include "resources.h"
#include "weights.h"

// ReLU activation function
static inline s16 relu(s16 x)
{
    return (x > 0) ? x : 0;
}

// Neural network forward pass
s16 pong_ai_NN(s16 ball_x, s16 ball_y, s16 ball_vx, s16 ball_vy, s16 ai_y)
{
    // Convert to tile coordinates and normalize to [0, 1024]
    u16 tile_ball_x = F32_toInt(ball_x) >> 3; // ball_x >> 3
    u16 tile_ball_y = F32_toInt(ball_y) >> 3; // ball_y >> 3
    u16 tile_ai_y = F32_toInt(ai_y) >> 3;     // ai_y >> 3
    u16 norm_ball_x = (tile_ball_x * 1024) / 39;
    u16 norm_ball_y = (tile_ball_y * 1024) / 27;
    u16 norm_ball_vx = ((F32_toInt(ball_vx) + 4) * 1024) >> 3;
    u16 norm_ball_vy = ((F32_toInt(ball_vy) + 4) * 1024) >> 3;
    u16 norm_ai_y = (tile_ai_y * 1024) / 27;

    const u16 inputs[INPUT_SIZE] = {
        norm_ball_x,
        norm_ball_y,
        norm_ball_vx,
        norm_ball_vy,
        norm_ai_y};

    s16 hidden[HIDDEN_SIZE];
    for (u8 h = 0; h < HIDDEN_SIZE; h++)
    {
        s16 sum = bias1[h];
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
    s16 best_value = outputs[0];
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

s16 pong_ai_predict(s16 ball_x, s16 ball_y, s16 ball_vx, s16 ball_vy, s16 ai_y)
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
#define LUT_BALL_X_STEPS 34 // 320/8 = 40 steps (8px resolution)
#define LUT_BALL_Y_STEPS 25 // 224/8 = 28 steps (8px resolution)
#define LUT_VEL_X_STEPS 8   // -4, -3, -2, -1, 0, 1, 2, 3, 4
#define LUT_VEL_Y_STEPS 9   // -4, -3, -2, -1, 0, 1, 2, 3, 4
#define LUT_AI_Y_STEPS 25   // 224/8 = 28 steps (8px resolution)

// Fast lookup function - O(1) instead of O(neural network)
s16 pong_ai_lookup(s16 ball_x, s16 ball_y, s16 ball_vx, s16 ball_vy, s16 ai_y)
{
    if (ball_x < 24 || ball_x > 296)
        return AI_ACTION_STAY; // Ball out of range, do nothing

    // Quantize inputs to lookup table indices (8px resolution)
    u16 bx_idx = ball_x >> 3; // Divide by 8 using bit shift
    u16 by_idx = ball_y >> 3; // Divide by 8 using bit shift
    s16 vx_idx = ball_vx + 4; // Map -4..4 to 0..8
    s16 vy_idx = ball_vy + 4; // Map -4..4 to 0..8
    u16 ay_idx = ai_y >> 3;   // Divide by 8 using bit shift

    // Calculate lookup table index (5D to 1D mapping)
    s32 index = ((((bx_idx * LUT_BALL_Y_STEPS + by_idx) * LUT_VEL_X_STEPS + vx_idx) * LUT_VEL_Y_STEPS + vy_idx) * LUT_AI_Y_STEPS + ay_idx);
    return (s16)((u8*)ai_lut_bin)[index];

    // Easy LUT has different action mapping
    // u16 action = ((u8*)ai_lut_bin)[index];
    // if (action == 0) // Move up
    //     return AI_ACTION_MOVE_UP;
    // else if (action == 1) // Move down
    //     return AI_ACTION_STAY;
    // else // Stay
    //     return AI_ACTION_MOVE_DOWN;
}
