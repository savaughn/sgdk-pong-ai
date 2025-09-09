#ifndef PONG_AI_MODEL_H
#define PONG_AI_MODEL_H

#include <genesis.h>

typedef enum
{
    AI_ACTION_STAY,
    AI_ACTION_MOVE_UP,
    AI_ACTION_MOVE_DOWN
} AIAction;

s16 pong_ai_NN(s16 ball_x, s16 ball_y, s16 ball_vx, s16 ball_vy, s16 ai_y);
s16 pong_ai_predict(s16 ball_x, s16 ball_y, s16 ball_vx, s16 ball_vy, s16 ai_y);
s16 pong_ai_lookup(s16 ball_x, s16 ball_y, s16 ball_vx, s16 ball_vy, s16 ai_y);

#endif // PONG_AI_MODEL_H
