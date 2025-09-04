#include "update.h"
#include "ai.h"
#include "sgp/sgp.h"

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

void updatePaddle(Paddle *paddle)
{
    // Boundary checks
    if (paddle->y < 8) paddle->y = 8;
    if (paddle->y > 224 - PADDLE_HEIGHT) paddle->y = 224 - PADDLE_HEIGHT;
}

void updateAI()
{
    if (aiMode == AI_MODE_NLOOKUP)
    {
        // s16 ai_action = pong_ai_NN(
        s16 ai_action = pong_ai_lookup(
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
    else if (aiMode == AI_MODE_NEURAL)
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
    
    updatePaddle(&player2);
}

void updateInput()
{
    SGP_PollInput();
    if (SGP_ButtonPressed(JOY_1, BUTTON_START))
    {
        drawPauseMenu();
    }

    if (SGP_ButtonPressed(JOY_1, BUTTON_C))
    {
        switch (aiMode)
        {
        case AI_MODE_NEURAL:
            aiMode = AI_MODE_NLOOKUP;
            break;
        case AI_MODE_NLOOKUP:
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

    updatePaddle(&player1);
    updateAI();
}
