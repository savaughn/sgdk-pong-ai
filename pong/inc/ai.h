#ifndef PONG_AI_MODEL_H
#define PONG_AI_MODEL_H

#include <genesis.h>

s16 pong_ai_NN(fix32 ball_x, fix32 ball_y, fix32 ball_vx, fix32 ball_vy, fix32 ai_y);
s16 pong_ai_predict(fix32 ball_x, fix32 ball_y, fix32 ball_vx, fix32 ball_vy, fix32 ai_y);
s16 pong_ai_lookup(fix32 ball_x, fix32 ball_y, fix32 ball_vx, fix32 ball_vy, fix32 ai_y);

#endif // PONG_AI_MODEL_H
