/*
 * Browser-compatible Pong Game Engine (WebAssembly)
 * Based on the SGDK Pong implementation but adapted for web
 */

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <emscripten.h>

// Game constants
#define SCREEN_WIDTH 320
#define SCREEN_HEIGHT 224
#define PADDLE_WIDTH 8
#define PADDLE_HEIGHT 48
#define BALL_SIZE 8
#define PADDLE_SPEED 3
#define BALL_SPEED 2

// Game state
typedef struct {
    float x, y;
    float dx, dy;
} Ball;

typedef struct {
    float x, y;
    float velY;
} Paddle;

typedef enum {
    AI_MODE_NEURAL = 0,
    AI_MODE_LOOKUP = 1,
    AI_MODE_PREDICTIVE = 2,
    AI_MODE_SIMPLE = 3
} AIMode;

// Global game state
Ball ball;
Paddle player1, player2;
int score1 = 0, score2 = 0;
AIMode aiMode = AI_MODE_PREDICTIVE;
int gameRunning = 1;
int keys[256] = {0}; // Key states

// AI neural network weights (simplified for demo)
float nn_weights1[5][8] = {
    {-0.5, 0.3, 0.7, -0.2, 0.4, 0.6, -0.3, 0.8},
    {0.2, -0.6, 0.4, 0.9, -0.1, 0.5, 0.7, -0.4},
    {0.8, 0.1, -0.5, 0.3, 0.6, -0.2, 0.4, 0.9},
    {-0.3, 0.7, 0.2, -0.8, 0.5, 0.1, -0.6, 0.4},
    {0.6, -0.4, 0.8, 0.2, -0.7, 0.3, 0.5, -0.1}
};

float nn_bias1[8] = {0.1, -0.2, 0.3, 0.4, -0.1, 0.2, -0.3, 0.1};

float nn_weights2[8][3] = {
    {0.5, -0.3, 0.8},
    {-0.2, 0.6, 0.1},
    {0.7, 0.4, -0.5},
    {0.3, -0.8, 0.2},
    {-0.6, 0.1, 0.9},
    {0.4, 0.5, -0.3},
    {0.8, -0.2, 0.6},
    {-0.1, 0.7, 0.4}
};

float nn_bias2[3] = {0.1, -0.2, 0.1};

// Utility functions
float relu(float x) {
    return x > 0 ? x : 0;
}

float clamp(float value, float min, float max) {
    return value < min ? min : (value > max ? max : value);
}

// AI functions
int ai_neural_network(float ball_x, float ball_y, float ball_vx, float ball_vy, float ai_y) {
    // Normalize inputs
    float inputs[5] = {
        ball_x / SCREEN_WIDTH,
        ball_y / SCREEN_HEIGHT,
        ball_vx / 10.0f,
        ball_vy / 10.0f,
        ai_y / SCREEN_HEIGHT
    };
    
    // First layer
    float hidden[8];
    for (int h = 0; h < 8; h++) {
        float sum = nn_bias1[h];
        for (int i = 0; i < 5; i++) {
            sum += inputs[i] * nn_weights1[i][h];
        }
        hidden[h] = relu(sum);
    }
    
    // Second layer
    float outputs[3];
    for (int o = 0; o < 3; o++) {
        float sum = nn_bias2[o];
        for (int h = 0; h < 8; h++) {
            sum += hidden[h] * nn_weights2[h][o];
        }
        outputs[o] = sum;
    }
    
    // Find best action
    int best_action = 0;
    for (int i = 1; i < 3; i++) {
        if (outputs[i] > outputs[best_action]) {
            best_action = i;
        }
    }
    
    return best_action; // 0=up, 1=stay, 2=down
}

int ai_predictive(float ball_x, float ball_y, float ball_vx, float ball_vy, float ai_y) {
    if (ball_vx <= 0) return 1; // Ball moving away, stay
    
    // Predict ball position when it reaches paddle
    float time_to_paddle = (player2.x - ball_x) / ball_vx;
    float predicted_y = ball_y + (ball_vy * time_to_paddle);
    
    // Handle wall bounces
    while (predicted_y < 0 || predicted_y > SCREEN_HEIGHT) {
        if (predicted_y < 0) predicted_y = -predicted_y;
        if (predicted_y > SCREEN_HEIGHT) predicted_y = SCREEN_HEIGHT - (predicted_y - SCREEN_HEIGHT);
    }
    
    float paddle_center = ai_y + PADDLE_HEIGHT / 2;
    float diff = predicted_y - paddle_center;
    
    if (diff < -8) return 0; // Move up
    if (diff > 8) return 2;  // Move down
    return 1; // Stay
}

int ai_simple(float ball_x, float ball_y, float ball_vx, float ball_vy, float ai_y) {
    (void)ball_x; (void)ball_vx; (void)ball_vy; // Unused parameters
    
    float paddle_center = ai_y + PADDLE_HEIGHT / 2;
    float diff = ball_y - paddle_center;
    
    if (diff < -5) return 0; // Move up
    if (diff > 5) return 2;  // Move down
    return 1; // Stay
}

// Game logic
void reset_ball() {
    ball.x = SCREEN_WIDTH / 2;
    ball.y = SCREEN_HEIGHT / 2;
    ball.dx = (rand() % 2 == 0) ? BALL_SPEED : -BALL_SPEED;
    ball.dy = (rand() % 2 == 0) ? BALL_SPEED : -BALL_SPEED;
}

void init_game() {
    // Initialize ball
    reset_ball();
    
    // Initialize paddles
    player1.x = 16;
    player1.y = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    player1.velY = 0;
    
    player2.x = SCREEN_WIDTH - 24;
    player2.y = SCREEN_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    player2.velY = 0;
    
    score1 = score2 = 0;
}

void update_game() {
    if (!gameRunning) return;
    
    // Update player 1 (human)
    if (keys[87] && player1.y > 0) { // W key
        player1.y -= PADDLE_SPEED;
        player1.velY = -PADDLE_SPEED;
    } else if (keys[83] && player1.y < SCREEN_HEIGHT - PADDLE_HEIGHT) { // S key
        player1.y += PADDLE_SPEED;
        player1.velY = PADDLE_SPEED;
    } else {
        player1.velY = 0;
    }
    
    // Update AI player
    int ai_action;
    switch (aiMode) {
        case AI_MODE_NEURAL:
            ai_action = ai_neural_network(ball.x, ball.y, ball.dx, ball.dy, player2.y);
            break;
        case AI_MODE_PREDICTIVE:
            ai_action = ai_predictive(ball.x, ball.y, ball.dx, ball.dy, player2.y);
            break;
        case AI_MODE_SIMPLE:
        default:
            ai_action = ai_simple(ball.x, ball.y, ball.dx, ball.dy, player2.y);
            break;
    }
    
    if (ai_action == 0 && player2.y > 0) {
        player2.y -= PADDLE_SPEED;
        player2.velY = -PADDLE_SPEED;
    } else if (ai_action == 2 && player2.y < SCREEN_HEIGHT - PADDLE_HEIGHT) {
        player2.y += PADDLE_SPEED;
        player2.velY = PADDLE_SPEED;
    } else {
        player2.velY = 0;
    }
    
    // Update ball
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    // Ball collision with top/bottom walls
    if (ball.y <= 8 || ball.y >= SCREEN_HEIGHT - 16) {
        ball.dy = -ball.dy;
    }
    
    // Ball collision with paddles
    if (ball.x <= player1.x + PADDLE_WIDTH && ball.x >= player1.x &&
        ball.y >= player1.y && ball.y <= player1.y + PADDLE_HEIGHT) {
        ball.dx = -ball.dx;
        ball.x = player1.x + PADDLE_WIDTH;
        ball.dy += player1.velY * 0.5f; // Add paddle velocity effect
        ball.dy = clamp(ball.dy, -6, 6);
    }
    
    if (ball.x >= player2.x - BALL_SIZE && ball.x <= player2.x &&
        ball.y >= player2.y && ball.y <= player2.y + PADDLE_HEIGHT) {
        ball.dx = -ball.dx;
        ball.x = player2.x - BALL_SIZE;
        ball.dy += player2.velY * 0.5f; // Add paddle velocity effect
        ball.dy = clamp(ball.dy, -6, 6);
    }
    
    // Scoring
    if (ball.x < 0) {
        score2++;
        reset_ball();
    } else if (ball.x > SCREEN_WIDTH) {
        score1++;
        reset_ball();
    }
}

// Exported functions for JavaScript
EMSCRIPTEN_KEEPALIVE
int main() {
    init_game();
    return 0;
}

EMSCRIPTEN_KEEPALIVE
void update_game_state() {
    update_game();
}

EMSCRIPTEN_KEEPALIVE
float get_ball_x() { return ball.x; }

EMSCRIPTEN_KEEPALIVE
float get_ball_y() { return ball.y; }

EMSCRIPTEN_KEEPALIVE
float get_player1_y() { return player1.y; }

EMSCRIPTEN_KEEPALIVE
float get_player2_y() { return player2.y; }

EMSCRIPTEN_KEEPALIVE
int get_score1() { return score1; }

EMSCRIPTEN_KEEPALIVE
int get_score2() { return score2; }

EMSCRIPTEN_KEEPALIVE
void set_ai_mode(int mode) {
    aiMode = (AIMode)mode;
}

EMSCRIPTEN_KEEPALIVE
void handle_key_down(int keyCode) {
    if (keyCode >= 0 && keyCode < 256) {
        keys[keyCode] = 1;
    }
}

EMSCRIPTEN_KEEPALIVE
void handle_key_up(int keyCode) {
    if (keyCode >= 0 && keyCode < 256) {
        keys[keyCode] = 0;
    }
}

EMSCRIPTEN_KEEPALIVE
void reset_game() {
    init_game();
}

EMSCRIPTEN_KEEPALIVE
void update_nn_weights(float* weights1_data, float* bias1_data, float* weights2_data, float* bias2_data) {
    // Update neural network weights from trained model
    for (int i = 0; i < 5; i++) {
        for (int j = 0; j < 8; j++) {
            nn_weights1[i][j] = weights1_data[i * 8 + j];
        }
    }
    
    for (int i = 0; i < 8; i++) {
        nn_bias1[i] = bias1_data[i];
    }
    
    for (int i = 0; i < 8; i++) {
        for (int j = 0; j < 3; j++) {
            nn_weights2[i][j] = weights2_data[i * 3 + j];
        }
    }
    
    for (int i = 0; i < 3; i++) {
        nn_bias2[i] = bias2_data[i];
    }
}
