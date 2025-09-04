#include <genesis.h>
#include "ai.h"
#include "sgp/sgp.h"
#include "resources.h"
#include "draw.h"
#include "update.h"

SGP sgp;

// Variable definitions (these are the actual variables, not extern declarations)
Ball ball;
Paddle player1, player2;
u16 score1 = 0, score2 = 0;
u16 oldScore1 = 99, oldScore2 = 99;
AIMode aiMode = AI_MODE_NEURAL;
AIMode lastAiMode = AI_MODE_PREDICTIVE;

const u16 palette[16] = {
    0x0000, // Black background
    0x0EEE, // White
    0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    0x0000, 0x0EEE // 15 = White for text
};

Sprite *ball_sm;
Sprite *paddle_sprite, *paddle_sprite2;

GameState gameState = START;

void initGame()
{
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
    oldScore1 = 99;  // Force score redraw
    oldScore2 = 99;  // Force score redraw
    lastAiMode = AI_MODE_PREDICTIVE; // Force AI mode text redraw

    SPR_setVisibility(paddle_sprite, VISIBLE);
    SPR_setVisibility(paddle_sprite2, VISIBLE);
    SPR_setVisibility(ball_sm, VISIBLE);
}

void main(_Bool reset)
{
    VDP_init();
    SPR_init();
    SGP_init();

    PAL_setPalette(PAL0, palette, DMA);
    VDP_setTextPalette(PAL0);
    VDP_clearPlane(BG_A, TRUE);

    PAL_setPalette(PAL1, ball_8.palette->data, DMA);
    ball_sm = SPR_addSprite(&ball_8, ball.x, ball.y, TILE_ATTR(PAL1, FALSE, FALSE, FALSE));
    paddle_sprite = SPR_addSprite(&paddle, player1.x, player1.y, TILE_ATTR(PAL1, FALSE, FALSE, FALSE));
    paddle_sprite2 = SPR_addSprite(&paddle, player2.x, player2.y, TILE_ATTR(PAL1, FALSE, FALSE, FALSE));

    SPR_setVisibility(ball_sm, VISIBLE);

    initGame();

    while (1)
    {
        switch (gameState)
        {
        case START:
            SGP_PollInput();
            drawStartScreen();
            if (SGP_ButtonPressed(JOY_1, BUTTON_START))
            {
                animateDoorClosing();
                VDP_clearPlane(BG_A, TRUE);
                animateDoorOpening();
                gameState = GAME;
            }

            break;
        case GAME:
            updateInput();
            updateBall();

            drawBall();
            drawPaddle(&player1, paddle_sprite);
            drawPaddle(&player2, paddle_sprite2);
            drawScore();
            SPR_update();

            break;
        case RESTART:
            animateDoorClosing();
            animateDoorOpening();
            drawBorder();
            initGame();
            gameState = START;
            break;
        }

        SYS_doVBlankProcess();
    }
}
