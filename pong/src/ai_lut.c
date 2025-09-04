// #include "ai.h"
// #include <genesis.h>
// #include "ai_lut_generated.h"
// // Precomputed lookup table approach for Genesis optimization
// // This creates a quantized decision table instead of full neural network inference

// #define LUT_BALL_X_STEPS 20    // 320/16 = 20 steps
// #define LUT_BALL_Y_STEPS 14    // 224/16 = 14 steps  
// #define LUT_VEL_STEPS 5        // -2, -1, 0, 1, 2
// #define LUT_AI_Y_STEPS 14      // 224/16 = 14 steps

// // Fast lookup function - O(1) instead of O(neural network)
// s16 pong_ai_lookup(fix32 ball_x, fix32 ball_y, fix32 ball_vx, fix32 ball_vy, fix32 ai_y) {
//     // Quantize inputs to lookup table indices
//     u16 bx_idx = F32_toInt(ball_x) >> 4;  // Divide by 16 using bit shift
//     u16 by_idx = F32_toInt(ball_y) >> 4;  // Divide by 16 using bit shift
//     u16 vx_idx = F32_toInt(ball_vx) + 2;  // Map -2..2 to 0..4
//     u16 vy_idx = F32_toInt(ball_vy) + 2;  // Map -2..2 to 0..4  
//     u16 ay_idx = F32_toInt(ai_y) >> 4;    // Divide by 16 using bit shift
    
//     // Clamp to valid ranges
//     if (bx_idx >= LUT_BALL_X_STEPS) bx_idx = LUT_BALL_X_STEPS - 1;
//     if (by_idx >= LUT_BALL_Y_STEPS) by_idx = LUT_BALL_Y_STEPS - 1;
//     if (vx_idx >= LUT_VEL_STEPS) vx_idx = LUT_VEL_STEPS - 1;
//     if (vy_idx >= LUT_VEL_STEPS) vy_idx = LUT_VEL_STEPS - 1;
//     if (ay_idx >= LUT_AI_Y_STEPS) ay_idx = LUT_AI_Y_STEPS - 1;
    
//     // Calculate lookup table index (5D to 1D mapping)
//     u32 index = ((((bx_idx * LUT_BALL_Y_STEPS + by_idx) * LUT_VEL_STEPS + vx_idx) 
//                   * LUT_VEL_STEPS + vy_idx) * LUT_AI_Y_STEPS + ay_idx);
    
//     return ai_lookup_table[index];
// }
