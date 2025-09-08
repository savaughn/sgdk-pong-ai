#ifndef WEIGHTS_H
#define WEIGHTS_H

#include <genesis.h>

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
const s16 weights1[INPUT_SIZE][HIDDEN_SIZE] = {
    {260, -738, 244, -260, -712, 62, 160, -861},      // ball_x weights
    {1987, -86, -392, 759, -230, -1882, -2603, -415}, // ball_y weights
    {-773, 1266, -76, -855, 1146, -638, -329, 1417},  // ball_vx weights
    {645, 389, -425, 216, 356, -231, -282, 480},      // ball_vy weights
    {-1599, 352, -564, -774, 496, 1606, 2691, 1009},  // ai_y weights
};

// First layer bias: 8 values
const s16 bias1[HIDDEN_SIZE] = {-150, 1102, -8, 128, 1074, 303, 520, 1084};

// Second layer weights: 8x3 matrix
const s16 weights2[HIDDEN_SIZE][OUTPUT_SIZE] = {
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
const s16 bias2[OUTPUT_SIZE] = {773, 790, 707};

#endif // WEIGHTS_H
