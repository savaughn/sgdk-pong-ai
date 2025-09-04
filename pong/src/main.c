#include <genesis.h>
#include "ai.h"
#include "sgp/sgp.h"

SGP sgp;

#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 224
#define PADDLE_WIDTH 8
#define PADDLE_HEIGHT 48
#define BALL_SIZE 8
#define PADDLE_SPEED 3
#define BALL_SPEED 1
#define DEAD_ZONE 8

typedef struct
{
    s16 x, y;
    s16 dx, dy;
    s16 oldX, oldY;
} Ball;

typedef struct
{
    s16 x, y;
    s16 oldX, oldY;
} Paddle;

Ball ball;
Paddle player1, player2;
u16 score1 = 0, score2 = 0;
u16 oldScore1 = 99, oldScore2 = 99;

typedef enum
{
    AI_MODE_NEURAL,    // Use neural network AI
    AI_MODE_SIMPLE,    // Use simple ball-following AI
    AI_MODE_PREDICTIVE // Use simple predictive AI
} AIMode;

typedef enum
{
    AI_ACTION_MOVE_UP,
    AI_ACTION_STAY,
    AI_ACTION_MOVE_DOWN
} AIAction;

AIMode aiMode = AI_MODE_NEURAL;
AIMode lastAiMode = AI_MODE_PREDICTIVE;

const u16 palette[16] = {
    0x0000, // Black background
    0x0EEE, // White
    0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    0x0000, 0x0EEE // 15 = White for text
};

void initGame()
{

    VDP_init();
    SGP_init();

    PAL_setPalette(PAL0, palette, DMA);
    VDP_setTextPalette(PAL0);
    VDP_clearPlane(BG_A, TRUE);

    // paddles and ball
    u32 whiteTile[8] = {
        0x11111111, 0x11111111, 0x11111111, 0x11111111,
        0x11111111, 0x11111111, 0x11111111, 0x11111111};
    VDP_loadTileData(whiteTile, TILE_USER_INDEX, 1, DMA);

    ball.x = SCREEN_WIDTH / 2;
    ball.y = SCREEN_HEIGHT / 2;
    ball.oldX = ball.x;
    ball.oldY = ball.y;
    ball.dx = BALL_SPEED;
    ball.dy = BALL_SPEED;

    player1.x = 16;
    player1.y = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    player1.oldX = player1.x;
    player1.oldY = player1.y;

    player2.x = SCREEN_WIDTH - 24;
    player2.y = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    player2.oldX = player2.x;
    player2.oldY = player2.y;

    score1 = 0;
    score2 = 0;
}

void clearPaddle(Paddle *paddle)
{
    u16 tileX = paddle->oldX / 8;
    u16 tileY = paddle->oldY / 8;

    for (int i = 0; i < 6; i++)
    {
        VDP_setTileMapXY(BG_A, 0, tileX, tileY + i);
    }
}

void drawPaddle(Paddle *paddle)
{
    u16 tileX = paddle->x / 8;
    u16 tileY = paddle->y / 8;

    for (int i = 0; i < 6; i++)
    {
        VDP_setTileMapXY(BG_A, TILE_ATTR_FULL(PAL0, FALSE, FALSE, FALSE, TILE_USER_INDEX),
                         tileX, tileY + i);
    }
}

void clearBall()
{
    u16 tileX = ball.oldX / 8;
    u16 tileY = ball.oldY / 8;

    VDP_setTileMapXY(BG_A, 0, tileX, tileY);
}

void drawBall()
{
    u16 tileX = ball.x / 8;
    u16 tileY = ball.y / 8;

    VDP_setTileMapXY(BG_A, TILE_ATTR_FULL(PAL0, FALSE, FALSE, FALSE, TILE_USER_INDEX),
                     tileX, tileY);
}

void updateBall()
{
    ball.oldX = ball.x;
    ball.oldY = ball.y;

    ball.x += ball.dx;
    ball.y += ball.dy;

    if (ball.y <= 16 || ball.y >= SCREEN_HEIGHT - 32)
    {
        ball.dy = -ball.dy;
    }

    // Check collision with paddles
    if (ball.x <= player1.x + PADDLE_WIDTH &&
        ball.x >= player1.x &&
        ball.y >= player1.y &&
        ball.y <= player1.y + PADDLE_HEIGHT)
    {
        ball.dx = -ball.dx;
        ball.x = player1.x + PADDLE_WIDTH;
    }

    if (ball.x >= player2.x - BALL_SIZE &&
        ball.x <= player2.x &&
        ball.y >= player2.y &&
        ball.y <= player2.y + PADDLE_HEIGHT)
    {
        ball.dx = -ball.dx;
        ball.x = player2.x - BALL_SIZE;
    }

    // Check for scoring
    if (ball.x < 0)
    {
        score2++;
        ball.x = SCREEN_WIDTH / 2;
        ball.y = SCREEN_HEIGHT / 2;
        ball.dx = BALL_SPEED;
    }

    if (ball.x > SCREEN_WIDTH)
    {
        score1++;
        ball.x = SCREEN_WIDTH / 2;
        ball.y = SCREEN_HEIGHT / 2;
        ball.dx = -BALL_SPEED;
    }
}

void updateInput()
{
    SGP_PollInput();

    if (SGP_ButtonPressed(JOY_1, BUTTON_C))
    {
        switch (aiMode)
        {
        case AI_MODE_NEURAL:
            aiMode = AI_MODE_SIMPLE;
            break;
        case AI_MODE_SIMPLE:
            aiMode = AI_MODE_PREDICTIVE;
            break;
        case AI_MODE_PREDICTIVE:
            aiMode = AI_MODE_NEURAL;
            break;
        }
    }

    player1.oldX = player1.x;
    player1.oldY = player1.y;
    player2.oldX = player2.x;
    player2.oldY = player2.y;

    if (SGP_ButtonDown(JOY_1, BUTTON_UP) && player1.y > 16)
    {
        player1.y -= PADDLE_SPEED;
    }
    if (SGP_ButtonDown(JOY_1, BUTTON_DOWN) && player1.y < SCREEN_HEIGHT - PADDLE_HEIGHT - 32)
    {
        player1.y += PADDLE_SPEED;
    }

    if (aiMode == AI_MODE_NEURAL)
    {
        s16 ai_action = pong_ai_NN(
            FIX32(ball.x),
            FIX32(ball.y),
            FIX32(ball.dx),
            FIX32(ball.dy),
            FIX32(player2.y)
        );

        // Execute AI action: 0=up, 1=stay, 2=down
        if (ai_action == AI_ACTION_MOVE_UP && player2.y > 16)
        {
            player2.y -= PADDLE_SPEED;
        }
        else if (ai_action == AI_ACTION_MOVE_DOWN && player2.y < SCREEN_HEIGHT - PADDLE_HEIGHT - 32)
        {
            player2.y += PADDLE_SPEED;
        }
    }
    else if (aiMode == AI_MODE_PREDICTIVE)
    {
        s16 ai_action = pong_ai_predict(
            FIX32(ball.x),
            FIX32(ball.y),
            FIX32(ball.dx),
            FIX32(ball.dy),
            FIX32(player2.y)
        );

        if (ai_action == AI_ACTION_MOVE_UP && player2.y > 16)
        {
            player2.y -= PADDLE_SPEED;
        }
        else if (ai_action == AI_ACTION_MOVE_DOWN && player2.y < SCREEN_HEIGHT - PADDLE_HEIGHT - 32)
        {
            player2.y += PADDLE_SPEED;
        }
    }
    else
    {
        // Simple ball-following AI
        s16 paddle_center = player2.y + PADDLE_HEIGHT / 2;
        s16 ball_center = ball.y + BALL_SIZE / 2;
        s16 diff = ball_center - paddle_center;

        // Dead zone to prevent jittery movement
        if (diff < -DEAD_ZONE && player2.y > 16)
        {
            player2.y -= PADDLE_SPEED;
        }
        else if (diff > DEAD_ZONE && player2.y < SCREEN_HEIGHT - PADDLE_HEIGHT - 32)
        {
            player2.y += PADDLE_SPEED;
        }
    }
}

void drawScore()
{
    if (score1 != oldScore1 || score2 != oldScore2)
    {
        VDP_clearTileMapRect(BG_A, 0, 1, 40, 1);

        char player1_score_text[5];
        intToStr(score1, player1_score_text, 1);
        VDP_drawText(player1_score_text, 5, 2);

        char player2_score_text[5];
        intToStr(score2, player2_score_text, 1);
        VDP_drawText(player2_score_text, 32, 2);

        oldScore1 = score1;
        oldScore2 = score2;
    }

    if (aiMode != lastAiMode)
    {
        VDP_clearTileMapRect(BG_A, 0, 27, 40, 1);

        if (aiMode == AI_MODE_NEURAL)
        {
            VDP_drawText("C:NEURAL NETWORK", 22, 27);
        }
        else if (aiMode == AI_MODE_PREDICTIVE)
        {
            VDP_drawText("C:PREDICTIVE", 22, 27);
        }
        else
        {
            VDP_drawText("C:SIMPLE FOLLOW", 22, 27);
        }

        lastAiMode = aiMode;
    }
}

void main(_Bool reset)
{
    initGame();

    while (1)
    {
        updateInput();
        updateBall();

        clearBall();
        if (player1.x != player1.oldX || player1.y != player1.oldY)
        {
            clearPaddle(&player1);
        }
        if (player2.x != player2.oldX || player2.y != player2.oldY)
        {
            clearPaddle(&player2);
        }

        drawBall();
        drawPaddle(&player1);
        drawPaddle(&player2);
        drawScore();

        SYS_doVBlankProcess();
    }
}
