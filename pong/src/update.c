#include "update.h"
#include "ai.h"
#include "sgp/sgp.h"
#include "audio.h"

void updateBall()
{
    ball.oldX = ball.x;
    ball.oldY = ball.y;

    ball.x += ball.dx;
    ball.y += ball.dy;

    // Check collision with horizontal borders (positioned at y=1 and y=26 in tiles = y=8 and y=208 in pixels)
    if (ball.y <= 16 || ball.y >= SCREEN_HEIGHT - 24)
    {
        ball.dy = -ball.dy;
        AUDIO_play(WAV_BOUNCE);
    }

    // Check collision with paddles
    if (ball.x <= player1.x + PADDLE_WIDTH &&
        ball.x >= player1.x &&
        ball.y >= player1.y &&
        ball.y <= player1.y + PADDLE_HEIGHT)
    {
        ball.dx = -ball.dx;
        ball.x = player1.x + PADDLE_WIDTH;

        // Modify ball trajectory based on paddle velocity (like original Pong)
        // The faster the paddle moves, the more it affects the ball's vertical direction
        s16 velocityEffect = player1.velY / 2;  // Scale down the effect
        ball.dy += velocityEffect;
        
        // Clamp ball vertical velocity to reasonable limits
        if (ball.dy > 4) ball.dy = 4;
        if (ball.dy < -4) ball.dy = -4;

        // Speed up ball if A button is held during hit
        if (SGP_ButtonDown(JOY_1, BUTTON_A))
        {
            // Increase speed by 50% but cap at maximum
            s16 newSpeed = (ball.dx * 3) / 2;
            if (newSpeed > 4) newSpeed = 4;
            if (newSpeed < -4) newSpeed = -4;
            ball.dx = newSpeed;
            
            // Also slightly randomize Y velocity for more interesting gameplay
            s16 newSpeedY = (ball.dy * 3) / 2;
            if (newSpeedY > 4) newSpeedY = 4;
            if (newSpeedY < -4) newSpeedY = -4;
            ball.dy = newSpeedY;
        }

        AUDIO_play(WAV_HIT);
    }

    if (ball.x >= player2.x - BALL_SIZE &&
        ball.x <= player2.x &&
        ball.y >= player2.y &&
        ball.y <= player2.y + PADDLE_HEIGHT)
    {
        ball.dx = -ball.dx;
        ball.x = player2.x - BALL_SIZE;

        // Modify ball trajectory based on AI paddle velocity (like original Pong)
        s16 velocityEffect = player2.velY / 2;  // Scale down the effect
        ball.dy += velocityEffect;
        
        // Clamp ball vertical velocity to reasonable limits
        if (ball.dy > 4) ball.dy = 4;
        if (ball.dy < -4) ball.dy = -4;

        // AI has a 30% chance to speed up the ball for more dynamic gameplay
        if ((random() % 10) < 3)
        {
            // Increase speed by 50% but cap at maximum
            s16 newSpeed = (ball.dx * 3) / 2;
            if (newSpeed > 4) newSpeed = 4;
            if (newSpeed < -4) newSpeed = -4;
            ball.dx = newSpeed;
            
            // Also slightly randomize Y velocity
            s16 newSpeedY = (ball.dy * 3) / 2;
            if (newSpeedY > 4) newSpeedY = 4;
            if (newSpeedY < -4) newSpeedY = -4;
            ball.dy = newSpeedY;
        }

        AUDIO_play(WAV_HIT);
    }

    // Check for scoring
    if (ball.x < 0)
    {
        AUDIO_play(WAV_SCORE);

        score2++;
        ball.x = SCREEN_WIDTH / 2;
        ball.y = SCREEN_HEIGHT / 2;
        ball.dx = BALL_SPEED;
        ball.dy = BALL_SPEED; // Reset Y velocity to base speed
    }

    if (ball.x > SCREEN_WIDTH)
    {
        AUDIO_play(WAV_SCORE);

        score1++;
        ball.x = SCREEN_WIDTH / 2;
        ball.y = SCREEN_HEIGHT / 2;
        ball.dx = -BALL_SPEED;
        ball.dy = BALL_SPEED; // Reset Y velocity to base speed
    }
}

void updateAI(Paddle *paddle)
{
    if (aiMode == AI_MODE_NLOOKUP)
    {
        u16 ai_action = pong_ai_lookup(
            ball.x,
            ball.y,
            ball.dx,
            ball.dy,
            paddle->y
        );

        // Execute AI action: 0=up, 1=stay, 2=down
        if (ai_action == AI_ACTION_MOVE_UP && paddle->y > 16)
        {
            paddle->y -= PADDLE_SPEED;
        }
        else if (ai_action == AI_ACTION_MOVE_DOWN && paddle->y < SCREEN_HEIGHT - PADDLE_HEIGHT - 16)
        {
            paddle->y += PADDLE_SPEED;
        }
    }
    else if (aiMode == AI_MODE_NEURAL)
    {
        u16 ai_action = pong_ai_NN(
            ball.x,
            ball.y,
            ball.dx,
            ball.dy,
            player2.y
        );

        // Execute AI action: 0=up, 1=stay, 2=down
        if (ai_action == AI_ACTION_MOVE_UP && player2.y > 16)
        {
            player2.y -= PADDLE_SPEED;
        }
        else if (ai_action == AI_ACTION_MOVE_DOWN && player2.y < SCREEN_HEIGHT - PADDLE_HEIGHT - 16)
        {
            player2.y += PADDLE_SPEED;
        }
    }
    else if (aiMode == AI_MODE_PREDICTIVE)
    {
        u16 ai_action = pong_ai_predict(
            ball.x,
            ball.y,
            ball.dx,
            ball.dy,
            player2.y
        );

        if (ai_action == AI_ACTION_MOVE_UP && player2.y > 16)
        {
            player2.y -= PADDLE_SPEED;
        }
        else if (ai_action == AI_ACTION_MOVE_DOWN && player2.y < SCREEN_HEIGHT - PADDLE_HEIGHT - 16)
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
        else if (diff > DEAD_ZONE && player2.y < SCREEN_HEIGHT - PADDLE_HEIGHT - 16)
        {
            player2.y += PADDLE_SPEED;
        }
    }
}

void updateInput()
{
    SGP_PollInput();
    if (SGP_ButtonPressed(JOY_1, BUTTON_START))
    {
        AUDIO_play(WAV_PAUSE);
        drawPauseMenu();
    }

    if (SGP_ButtonPressed(JOY_1, BUTTON_C))
    {
        switch (aiMode)
        {
        case AI_MODE_NEURAL:
            aiMode = AI_MODE_NLOOKUP;
            AUDIO_play(WAV_SELECT);
            break;
        case AI_MODE_NLOOKUP:
            aiMode = AI_MODE_SIMPLE;
            AUDIO_play(WAV_SELECT);
            break;
        case AI_MODE_SIMPLE:
            aiMode = AI_MODE_PREDICTIVE;
            AUDIO_play(WAV_SELECT);
            break;
        case AI_MODE_PREDICTIVE:
            aiMode = AI_MODE_NEURAL;
            AUDIO_play(WAV_SELECT);
            AUDIO_play(WAV_ROBOT);
            break;
        }
    }

    player1.oldX = player1.x;
    player1.oldY = player1.y;
    player2.oldX = player2.x;
    player2.oldY = player2.y;

    // Store previous position to calculate velocity
    s16 player1PrevY = player1.y;
    s16 player2PrevY = player2.y;

    if (SGP_ButtonDown(JOY_1, BUTTON_UP) && player1.y > 16)
    {
        player1.y -= PADDLE_SPEED;
    }
    if (SGP_ButtonDown(JOY_1, BUTTON_DOWN) && player1.y < SCREEN_HEIGHT - PADDLE_HEIGHT - 16)
    {
        player1.y += PADDLE_SPEED;
    }

    // Calculate paddle velocities for ball trajectory modification
    player1.velY = player1.y - player1PrevY;

    // AI vs AI mode
    // updateAI(&player1);
    updateAI(&player2);

    // Calculate AI paddle velocity after AI movement
    player2.velY = player2.y - player2PrevY;
}
