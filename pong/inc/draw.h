#ifndef DRAW_H
#define DRAW_H

#include <genesis.h>

// Forward declarations for types from main.c
typedef struct
{
    s16 x, y;
    s16 oldX, oldY;
} Paddle;

typedef struct
{
    s16 x, y;
    s16 dx, dy;
    s16 oldX, oldY;
} Ball;

typedef enum
{
    AI_MODE_NEURAL,
    AI_MODE_NLOOKUP,
    AI_MODE_SIMPLE,
    AI_MODE_PREDICTIVE
} AIMode;

typedef enum
{
    AI_ACTION_MOVE_UP,
    AI_ACTION_STAY,
    AI_ACTION_MOVE_DOWN
} AIAction;

// External variables that draw functions need access to
extern Ball ball;
extern Paddle player1, player2;
extern u16 score1, score2;
extern u16 oldScore1, oldScore2;
extern AIMode aiMode, lastAiMode;
extern Sprite *ball_sm;
extern Sprite *paddle_sprite, *paddle_sprite2;
extern const u16 palette[16];

// Drawing function declarations
void drawPaddle(Paddle *paddle, Sprite *sprite);
void drawBall(void);
void drawPauseMenu(void);
void drawBorder(void);
void drawStartScreen(void);
void drawScore(void);

// Animation function declarations
void animateDoorOpening(void);
void animateDoorClosing(void);

#endif // DRAW_H
