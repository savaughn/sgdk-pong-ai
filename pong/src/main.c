#include <genesis.h>
#include "ai.h"
#include "sgp/sgp.h"
#include "resources.h"
#include "draw.h"
#include "update.h"
#include "audio.h"

SGP sgp;
Ball ball;
Paddle player1, player2;
u16 score1 = 0, score2 = 0;
u16 oldScore1 = 99, oldScore2 = 99;
u16 countdownTimer = 0;
AIMode aiMode = AI_MODE_NEURAL;
AIMode lastAiMode = AI_MODE_PREDICTIVE;

const u16 palette[16] = {
    0x0000, // Black background
    0x0EEE, // White
    0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000,
    0x0000, 0x0EEE // 15 = White for text
};

Sprite *ball_sprite, *ball_sprite_normal, *ball_sprite_special;
Sprite *paddle_sprite, *paddle_sprite2;

GameState gameState;

void initGame()
{
    gameState = START;

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
    player1.velY = 0;

    player2.x = SCREEN_WIDTH - 24;
    player2.y = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    player2.oldX = player2.x;
    player2.oldY = player2.y;
    player2.velY = 0;

    score1 = 0;
    score2 = 0;
    oldScore1 = 99;  // Force score redraw
    oldScore2 = 99;  // Force score redraw
    lastAiMode = AI_MODE_PREDICTIVE; // Force AI mode text redraw

    init_draw((u16)sizeof(ai_lut_bin));
    init_ai();
}

void main(_Bool reset)
{
    VDP_init();
    SPR_init();

    AUDIO_play(WAV_STARTUP);

    SGP_init();

    PAL_setPalette(PAL0, palette, DMA);
    VDP_setTextPalette(PAL0);
    VDP_clearPlane(BG_A, TRUE);

    PAL_setPalette(PAL1, ball_spl.palette->data, DMA);
    ball_sprite_normal = SPR_addSprite(&ball_norm, ball.x, ball.y, TILE_ATTR(PAL1, FALSE, FALSE, FALSE));
    ball_sprite_special = SPR_addSprite(&ball_spl, ball.x, ball.y, TILE_ATTR(PAL1, FALSE, FALSE, FALSE));
    paddle_sprite = SPR_addSprite(&paddle, player1.x, player1.y, TILE_ATTR(PAL1, FALSE, FALSE, FALSE));
    paddle_sprite2 = SPR_addSprite(&paddle, player2.x, player2.y, TILE_ATTR(PAL1, FALSE, FALSE, FALSE));

    ball_sprite = ball_sprite_normal;
    SPR_setVisibility(ball_sprite_normal, HIDDEN);
    SPR_setVisibility(ball_sprite_special, HIDDEN);
    SPR_setVisibility(paddle_sprite, HIDDEN);
    SPR_setVisibility(paddle_sprite2, HIDDEN);

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
                if (SGP_ButtonDown(JOY_1, BUTTON_A))
                {
                    AUDIO_play(WAV_SECRET);
                    ball_sprite = ball_sprite_special;
                } else {
                    ball_sprite = ball_sprite_normal;
                }
                SPR_setVisibility(ball_sprite, HIDDEN);
                VDP_clearPlane(BG_A, TRUE);
                animateDoorOpening();
                countdownTimer = 60; // 1 second at 60 FPS
                gameState = COUNTDOWN;
            }

            break;
        case COUNTDOWN:
            // Display countdown and wait
            drawBall();
            drawPaddle(&player1, paddle_sprite);
            drawPaddle(&player2, paddle_sprite2);
            drawScore();
            drawPlayBorder();
            
            // Show countdown number in center of screen
            if (countdownTimer == 45) {
                SPR_setVisibility(paddle_sprite, VISIBLE);
                SPR_setVisibility(paddle_sprite2, VISIBLE);
            } else if (countdownTimer == 15) {
                SPR_setVisibility(ball_sprite, VISIBLE);
            }
            
            SPR_update();
            
            countdownTimer--;
            if (countdownTimer == 0) {
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
