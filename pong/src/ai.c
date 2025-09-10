#include <genesis.h>
#include "ai.h"
#include "resources.h"
#include "weights.h"

static u8 lut_ram[sizeof(ai_lut_bin)];

void init_ai()
{
    #if PUT_LUT_IN_RAM
        memcpy(lut_ram, ai_lut_bin, sizeof(ai_lut_bin));
    #endif
}

// ReLU activation function
static inline s16 relu(s16 x)
{
    return (x > 0) ? x : 0;
}

// Neural network forward pass
u16 pong_ai_NN(s16 ball_x, s16 ball_y, s16 ball_vx, s16 ball_vy, s16 ai_y)
{
    // Convert to tile coordinates and normalize to [0, 1024]
    u16 tile_ball_x = ball_x >> 3; // ball_x >> 3
    u16 tile_ball_y = ball_y >> 3; // ball_y >> 3
    u16 tile_ai_y = ai_y >> 3;     // ai_y >> 3
    u16 norm_ball_x = (tile_ball_x * 1024) / 17;
    u16 norm_ball_y = (tile_ball_y * 1024) / 25;
    u16 norm_ball_vx = ((ball_vx + 4) * 1024) >> 3;
    u16 norm_ball_vy = ((ball_vy + 4) * 1024) >> 3;
    u16 norm_ai_y = (tile_ai_y * 1024) / 25;

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
    u16 best_action = 0;
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

u16 pong_ai_predict(s16 ball_x, s16 ball_y, s16 ball_vx, s16 ball_vy, s16 ai_y)
{
    // Convert fixed-point to integers for simpler math
    s16 bx = ball_x;
    s16 by = ball_y;
    s16 bvx = ball_vx;
    s16 bvy = ball_vy;
    s16 ay = ai_y;

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
#define LUT_BALL_X_STEPS 7 // (296 - 160) / 8 = 17 steps (8px resolution)
#define LIMIT_X 232
#define LUT_BALL_Y_STEPS 18 // (244 - 16 - 24) / 8 = 19 + 1 steps (8px resolution)
#define LUT_VEL_X_STEPS 4   // Only positive vx: 1, 2, 3, 4
#define LUT_VEL_Y_STEPS 9   // -4, -3, -2, -1, 0, 1, 2, 3, 4
#define LUT_AI_Y_STEPS 24   // 208/8 = 26 steps (8px resolution)

// Fast lookup function - O(1) instead of O(neural network)
#define GET_ACTION_2BIT(packed, bitpos) (((packed) >> (6 - 2 * (bitpos))) & 0x3)
u16 pong_ai_lookup(s16 ball_x, s16 ball_y, s16 ball_vx, s16 ball_vy, s16 ai_y)
{
    static u8 recent_actions[4];
    static int action_idx = 0;

    // Don't use LUT if ball is out of range or moving away
    // LUT doesn't cover left side or negative vx
    if (ball_x < LIMIT_X || ball_x > 296 || ball_vx <= 0)
    {
        // Don't let AI center paddle too aggressively
        // wait for ball to pass paddle and reset
        if (ball_x < 296 + 4 && ball_x > 296)
            return AI_ACTION_STAY;
        // start moving to center if ball is out of range
        if (ai_y + 24 < 112)
            return AI_ACTION_MOVE_DOWN;
        else if (ai_y + 24 > 112)
            return AI_ACTION_MOVE_UP;
        return AI_ACTION_STAY;
    }

    // if (ball_y > 32 || ball_y < 184)
        // return AI_ACTION_STAY; // Out of vertical bounds

    // Emergency aggregation: if ball is about to cross paddle
    // (Assume ai_y is paddle->y, ball_x is ball.x, paddle is on right side)
    // if (ball_x >= 296 - 1) {
    //     int up_count = 0, down_count = 0;
    //     for (int i = 0; i < 4; i++) {
    //         if (recent_actions[i] == AI_ACTION_MOVE_UP) up_count++;
    //         if (recent_actions[i] == AI_ACTION_MOVE_DOWN) down_count++;
    //     }
    //     if (up_count > down_count) return AI_ACTION_MOVE_UP;
    //     if (down_count > up_count) return AI_ACTION_MOVE_DOWN;
    //     // else stay
    // }

    // Quantize inputs to lookup table indices (8px resolution, offset by BALL_X_MIN)
    s16 bx_idx = (ball_x - LIMIT_X) >> 3;
    s16 by_idx = (ball_y - 16) >> 3;
    // Only allow positive vx (1..4), LUT stores only rightward motion
    s16 vx_idx = ball_vx - 1; // 1->0, 2->1, 3->2, 4->3
    s16 vy_idx = ball_vy + 4;
    s16 ay_idx = (ai_y - 16) >> 3;

    // Clamp all indices to valid ranges
    if (bx_idx < 0)
        bx_idx = 0;
    if (bx_idx >= LUT_BALL_X_STEPS)
        bx_idx = LUT_BALL_X_STEPS - 1;
    if (by_idx < 0)
        by_idx = 0;
    if (by_idx >= LUT_BALL_Y_STEPS)
        by_idx = LUT_BALL_Y_STEPS - 1;
    if (vx_idx < 0)
        vx_idx = 0;
    if (vx_idx >= LUT_VEL_X_STEPS)
        vx_idx = LUT_VEL_X_STEPS - 1;
    if (vy_idx < 0)
        vy_idx = 0;
    if (vy_idx >= LUT_VEL_Y_STEPS)
        vy_idx = LUT_VEL_Y_STEPS - 1;
    if (ay_idx < 0)
        ay_idx = 0;
    if (ay_idx >= LUT_AI_Y_STEPS)
        ay_idx = LUT_AI_Y_STEPS - 1;

    // Calculate compressed LUT index directly
    u16 compressed_lut_index = (((((bx_idx * LUT_BALL_Y_STEPS + by_idx)
        * LUT_VEL_X_STEPS + vx_idx)
        * LUT_VEL_Y_STEPS + vy_idx)
        * (LUT_AI_Y_STEPS >> 2)) + (ay_idx >> 2));

    if (compressed_lut_index >= sizeof(ai_lut_bin))
    {
        return AI_ACTION_STAY;
        int up_count = 0, down_count = 0;
        for (int i = 0; i < 4; i++) {
            if (recent_actions[i] == AI_ACTION_MOVE_UP) up_count++;
            if (recent_actions[i] == AI_ACTION_MOVE_DOWN) down_count++;
        }
        if (up_count > down_count) return AI_ACTION_MOVE_UP;
        if (down_count > up_count) return AI_ACTION_MOVE_DOWN;
        // else stay
    }
    #if PUT_LUT_IN_RAM
        u8 packed_byte = ((u8 *)lut_ram)[compressed_lut_index];
    #else
        u8 packed_byte = ((u8 *)ai_lut_bin)[compressed_lut_index];
    #endif
    u8 bitpos = ay_idx & 3;
    u8 action = (u8)GET_ACTION_2BIT(packed_byte, bitpos);
    recent_actions[action_idx] = action;
    action_idx = (action_idx + 1) % 4;

    // Anti-jitter logic: suppress up-down-up-down pattern
    int up_down_pattern = 0;
    if ((recent_actions[0] == AI_ACTION_MOVE_UP && recent_actions[1] == AI_ACTION_MOVE_DOWN &&
         recent_actions[2] == AI_ACTION_MOVE_UP && recent_actions[3] == AI_ACTION_MOVE_DOWN) ||
        (recent_actions[0] == AI_ACTION_MOVE_DOWN && recent_actions[1] == AI_ACTION_MOVE_UP &&
         recent_actions[2] == AI_ACTION_MOVE_DOWN && recent_actions[3] == AI_ACTION_MOVE_UP)) {
        up_down_pattern = 1;
    }
    if (up_down_pattern) {
        return AI_ACTION_STAY;
    }
    return action;
}

// NOTES:
// Since we are only storing the right half of the table (ball moving right),
// we need to mirror the state when the ball is on the left side for
// AI vs AI matches. This can be done in the calling code.
// For left paddle (AI)
// if (ball.dx < 0 && ball.x < SCREEN_WIDTH / 2) {
//     u16 ai_action = pong_ai_lookup(
//         SCREEN_WIDTH - ball.x,
//         ball.y,
//         -ball.dx,
//         ball.dy,
//         player1.y
//     );
//     // Execute action for player1
// }