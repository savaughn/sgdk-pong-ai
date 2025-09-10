#ifndef UPDATE_H
#define UPDATE_H

#include <genesis.h>
#include "draw.h"

// Constants used by update functions
#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 224
#define PADDLE_WIDTH 8
#define PADDLE_HEIGHT 48
#define BALL_SIZE 8
#define PADDLE_SPEED 3
#define BALL_SPEED 3
#define DEAD_ZONE 8

// Update function declarations
void updateBall(void);
void updateAI(Paddle *paddle);
void updateInput(void);

#endif // UPDATE_H
