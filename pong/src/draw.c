#include "draw.h"
#include "sgp/sgp.h"
#include "audio.h"

extern GameState gameState;
const u16 screenWidthTiles = 40;
const u16 screenHeightTiles = 28;

void drawPaddle(Paddle *paddle, Sprite *sprite)
{
    SPR_setPosition(sprite, paddle->x, paddle->y);
}

void drawBall(void)
{
    SPR_setPosition(ball_sprite, ball.x, ball.y);
}

void drawPauseMenu(void)
{
    // Clear the pause area and show menu immediately
    VDP_clearTileMapRect(BG_A, 10, 10, 22, 8);
    SPR_setVisibility(paddle_sprite, HIDDEN);
    SPR_setVisibility(paddle_sprite2, HIDDEN);
    SPR_setVisibility(ball_sprite, HIDDEN);

    VDP_drawText("PAUSED", 17, 10);

    VDP_drawText("press B to quit", 13, 14);

    // Now wait for a new START press to resume
    while (1)
    {
        SGP_PollInput();

        if (SGP_ButtonPressed(JOY_1, BUTTON_START))
        {
            // Clear the pause text when resuming
            VDP_clearTileMapRect(BG_A, 10, 10, 21, 8);
            SPR_setVisibility(paddle_sprite, VISIBLE);
            SPR_setVisibility(paddle_sprite2, VISIBLE);
            SPR_setVisibility(ball_sprite, VISIBLE);

            break;
        }
        if (SGP_ButtonPressed(JOY_1, BUTTON_B))
        {
            gameState = RESTART;
            break;
        }

        SPR_update();

        SYS_doVBlankProcess();
    }
}

void drawPlayBorder(void)
{
    u32 bottomBorderTile[8] = {
        0x11111111,
        0x00000000,
        0x00000000,
        0x00000000,
        0x00000000,
        0x00000000,
        0x00000000,
        0x00000000};
    
    u32 topBorderTile[8] = {
        0x00000000,
        0x00000000,
        0x00000000,
        0x00000000,
        0x00000000,
        0x00000000,
        0x00000000,
        0x11111111};

    // Load the border tiles
    VDP_loadTileData(topBorderTile, TILE_USER_INDEX + 2, 1, DMA);
    VDP_loadTileData(bottomBorderTile, TILE_USER_INDEX + 3, 1, DMA);

    // Draw top border (1px thick)
    for (u16 x = 0; x < screenWidthTiles; x++)
    {
        VDP_setTileMapXY(BG_A, TILE_ATTR_FULL(PAL0, TRUE, FALSE, FALSE, TILE_USER_INDEX + 2), x, 1);
    }

    // Draw bottom border (1px thick)
    for (u16 x = 0; x < screenWidthTiles; x++)
    {
        VDP_setTileMapXY(BG_A, TILE_ATTR_FULL(PAL0, TRUE, FALSE, FALSE, TILE_USER_INDEX + 3), x, screenHeightTiles - 2);
    }

}

void drawBorder(void)
{
    // Left border: left 1 pixel white, right 7 pixels transparent
    u32 rightBorderTile[8] = {
        0x10001000,
        0x10000000,
        0x10000000,
        0x10001000,
        0x10001000,
        0x10000000,
        0x10000000,
        0x10001000};
    // Right border: left 7 pixels transparent, right 1 pixel white
    u32 leftBorderTile[8] = {
        0x00010001,
        0x00000001,
        0x00000001,
        0x00010001,
        0x00010001,
        0x00000001,
        0x00000001,
        0x00010001};

    // Load the border tiles
    VDP_loadTileData(leftBorderTile, TILE_USER_INDEX, 1, DMA);
    VDP_loadTileData(rightBorderTile, TILE_USER_INDEX + 1, 1, DMA);

    // Draw left border (1px thick)
    for (u16 y = 0; y < screenHeightTiles; y++)
    {
        VDP_setTileMapXY(BG_A, TILE_ATTR_FULL(PAL0, FALSE, FALSE, FALSE, TILE_USER_INDEX), 0, y);
    }

    // Draw right border (1px thick)
    for (u16 y = 0; y < screenHeightTiles; y++)
    {
        VDP_setTileMapXY(BG_A, TILE_ATTR_FULL(PAL0, FALSE, FALSE, FALSE, TILE_USER_INDEX + 1), screenWidthTiles - 1, y);
    }
}

void animateDoorOpening(void)
{
    AUDIO_play(WAV_OPEN);

    u16 screenWidthTiles = 40;
    u16 screenHeightTiles = 28;
    u16 centerX = screenWidthTiles / 2;

    // Use the existing 1px border tiles (already loaded)
    u16 leftBorderTile = TILE_USER_INDEX + 1;  // Right 1px border tile (for left door)
    u16 rightBorderTile = TILE_USER_INDEX;     // Left 1px border tile (for right door)

    // Start with doors closed in the center, then open them to edges
    for (u16 pos = centerX - 1; pos < screenWidthTiles; pos++)
    {
        // Clear previous door positions (moving outward)
        if (pos > centerX - 1)
        {
            for (u16 y = 0; y < screenHeightTiles; y++)
            {
                VDP_setTileMapXY(BG_A, 0, pos - 1, y);                          // Clear left door
                VDP_setTileMapXY(BG_A, 0, screenWidthTiles - 1 - (pos - 1), y); // Clear right door (fixed calculation)
            }
        }

        // Draw doors at current position (moving outward)
        if (pos < screenWidthTiles - 1)
        {
            for (u16 y = 0; y < screenHeightTiles; y++)
            {
                VDP_setTileMapXY(BG_A, TILE_ATTR_FULL(PAL0, FALSE, FALSE, FALSE, leftBorderTile), pos, y);                         // Left door
                VDP_setTileMapXY(BG_A, TILE_ATTR_FULL(PAL0, FALSE, FALSE, FALSE, rightBorderTile), screenWidthTiles - 1 - pos, y); // Right door
            }
        }

        // Wait a few frames for smooth animation
        for (u16 i = 0; i < 3; i++)
        {
            SYS_doVBlankProcess();
        }

        // Stop when doors reach the edges
        if (pos >= screenWidthTiles - 2)
            break;
    }

    // Clear the final door positions (doors are now off-screen)
    for (u16 y = 0; y < screenHeightTiles; y++)
    {
        VDP_setTileMapXY(BG_A, 0, screenWidthTiles - 2, y); // Clear left door
        VDP_setTileMapXY(BG_A, 0, 1, y);                    // Clear right door
    }

    // Clear all border elements for clean game screen
    // Clear top and bottom borders
    for (u16 x = 0; x < screenWidthTiles; x++)
    {
        VDP_setTileMapXY(BG_A, 0, x, 0);                     // Clear top border
        VDP_setTileMapXY(BG_A, 0, x, screenHeightTiles - 1); // Clear bottom border
    }

    // Clear left and right borders (remaining pixels)
    for (u16 y = 0; y < screenHeightTiles; y++)
    {
        VDP_setTileMapXY(BG_A, 0, 0, y);                    // Clear left border
        VDP_setTileMapXY(BG_A, 0, screenWidthTiles - 1, y); // Clear right border
    }

    AUDIO_stop();
}

void animateDoorClosing(void)
{
    AUDIO_play(WAV_CLOSE);
    u16 screenWidthTiles = 40;
    u16 screenHeightTiles = 28;
    u16 centerX = screenWidthTiles / 2;

    // Use the existing 1px border tiles (already loaded)
    u16 leftBorderTile = TILE_USER_INDEX;      // Solid on right side (inside for closing left door)
    u16 rightBorderTile = TILE_USER_INDEX + 1; // Solid on left side (inside for closing right door)

    // Animate doors closing from edges to center
    for (u16 pos = 0; pos <= centerX; pos++)
    {
        // Clear previous door positions
        if (pos > 0)
        {
            for (u16 y = 0; y < screenHeightTiles; y++)
            {
                VDP_setTileMapXY(BG_A, 0, pos - 1, y);                // Clear left door
                VDP_setTileMapXY(BG_A, 0, screenWidthTiles - pos, y); // Clear right door
            }
        }

        // Draw doors at current position using 1px border tiles
        for (u16 y = 0; y < screenHeightTiles; y++)
        {
            VDP_setTileMapXY(BG_A, TILE_ATTR_FULL(PAL0, FALSE, FALSE, FALSE, leftBorderTile), pos, y);                         // Left door
            VDP_setTileMapXY(BG_A, TILE_ATTR_FULL(PAL0, FALSE, FALSE, FALSE, rightBorderTile), screenWidthTiles - 1 - pos, y); // Right door
        }

        // Wait a few frames for smooth animation
        for (u16 i = 0; i < 4; i++)
        {
            SYS_doVBlankProcess();
        }

        // Stop when doors meet in the middle
        if (pos >= centerX - 1)
            break;
    }

    // Hold the closed position for a moment
    for (u16 i = 0; i < 30; i++)
    {
        SYS_doVBlankProcess();
    }
    AUDIO_stop();
}

void drawStartScreen(void)
{
    static bool borderDrawn = false;

    if (!borderDrawn)
    {
        VDP_clearPlane(BG_A, TRUE);
        drawBorder();

        borderDrawn = true;
    }

    VDP_drawText("PONG with PongNet", 12, 5);
    VDP_drawText("press start", 14, 15);
    VDP_drawText("@github/savaughn", 20, 25);
    VDP_drawText("Made with SGDK & SGP", 18, 26);
}

void drawScore(void)
{
    if (score1 != oldScore1 || score2 != oldScore2)
    {
        VDP_clearTileMapRect(BG_A, 0, 0, 40, 1);

        char player1_score_text[5];
        intToStr(score1, player1_score_text, 1);
        VDP_drawText(player1_score_text, 5, 0);

        char player2_score_text[5];
        intToStr(score2, player2_score_text, 1);
        VDP_drawText(player2_score_text, 32, 0);

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
        else if (aiMode == AI_MODE_NLOOKUP)
        {
            VDP_drawText("C:NEURAL LUT 270k", 22, 27);
        }
        else
        {
            VDP_drawText("C:SIMPLE FOLLOW", 22, 27);
        }

        lastAiMode = aiMode;
    }
}
