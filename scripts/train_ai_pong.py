import os
import sys
import time
import numpy as np
import tensorflow as tf
from tensorflow import keras
from keras import layers
import random
from collections import deque
from datetime import datetime

# --- TRAINING SECTION ---
class PongEnv:
    def __init__(self):
        self.last_ai_y = 88
        self.stationary_steps = 0
        self.reset()

    def reset(self):
        self.ball_x = 160
        self.ball_y = random.randint(50, 170)
        direction = random.choice([-1, 1])
        self.ball_vx = 2 * direction
        self.ball_vy = random.choice([-2, -1, 1, 2])
        self.player_y = random.randint(20, 150)
        self.ai_y = random.randint(20, 150)
        self.last_ai_y = self.ai_y
        self.stationary_steps = 0
        self.player_score = 0
        self.ai_score = 0
        self.steps = 0
        return self.get_state()

    def get_state(self):
        tile_ball_x = self.ball_x // 8
        tile_ball_y = self.ball_y // 8
        tile_ai_y   = self.ai_y // 8
        norm_ball_x = tile_ball_x / 39.0
        norm_ball_y = tile_ball_y / 27.0
        norm_ball_vx = (self.ball_vx + 4) / 8.0
        norm_ball_vy = (self.ball_vy + 4) / 8.0
        norm_ai_y   = tile_ai_y / 27.0
        return np.array([
            norm_ball_x,
            norm_ball_y,
            norm_ball_vx,
            norm_ball_vy,
            norm_ai_y
        ], dtype=np.float32)

    def step(self, action):
        self.steps += 1
        prev_ai_y = self.ai_y
        # AI action (0=stay, 1=up, 2=down)
        if action == 1 and self.ai_y > 8:
            self.ai_y -= 3
        elif action == 2 and self.ai_y < 160:
            self.ai_y += 3
        # Track stationary behavior for anti-camping
        if abs(self.ai_y - self.last_ai_y) < 1:
            self.stationary_steps += 1
        else:
            self.stationary_steps = 0
        self.last_ai_y = self.ai_y
        # Simple player AI (follows ball)
        player_target = self.ball_y
        if random.random() < 0.15:
            player_target += random.randint(-12, 12)
        if random.random() < 0.1:
            pass
        else:
            if self.player_y + 24 < player_target:
                self.player_y += 3
            elif self.player_y + 24 > player_target:
                self.player_y -= 3
        self.ball_x += self.ball_vx
        self.ball_y += self.ball_vy
        # Ball collision with top/bottom walls
        if self.ball_y <= 16 or self.ball_y >= 208:
            self.ball_vy = -self.ball_vy
        # Ball collision with paddles
        done = False
        reward = 0
        if (self.ball_x <= 24 and self.ball_vx < 0 and self.player_y <= self.ball_y <= self.player_y + 48):
            self.ball_vx = -self.ball_vx
            reward = -1
        elif (self.ball_x >= 296 and self.ball_vx > 0 and self.ai_y <= self.ball_y <= self.ai_y + 48):
            self.ball_vx = -self.ball_vx
            reward = 1
        if self.ball_x <= 0:
            done = True
            reward = -10
        elif self.ball_x >= 320:
            done = True
            reward = 10
        return self.get_state(), reward, done

class DQNAgent:
    def __init__(self, state_size=5, action_size=3):
        self.state_size = state_size
        self.action_size = action_size
        self.memory = deque(maxlen=10000)
        self.epsilon = 1.0
        self.epsilon_min = 0.01
        self.epsilon_decay_steps = 3000
        self.learning_rate = 1e-4
        self.learning_starts = 1000
        self.learning_freq = 4
        self.target_update_freq = 2000
        self.batch_size = 64
        self.step_count = 0
        self.episode_count = 0
        self.model = self._build_model()
        self.target_model = self._build_model()
        self.update_target_model()

    def _build_model(self):
        model = keras.Sequential([
            layers.Input(shape=(self.state_size,)),
            layers.Dense(8, activation='relu', dtype='float32'),
            layers.Dense(self.action_size, activation='linear', dtype='float32')
        ])
        optimizer = keras.optimizers.Adam(learning_rate=self.learning_rate, epsilon=1e-4, clipnorm=1.0)
        model.compile(loss='huber', optimizer=optimizer, jit_compile=False)
        return model

    def update_target_model(self):
        self.target_model.set_weights(self.model.get_weights())

    def remember(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def act(self, state):
        self.step_count += 1
        if self.episode_count < self.epsilon_decay_steps:
            self.epsilon -= (1.0 - self.epsilon_min) / self.epsilon_decay_steps
            self.epsilon = max(self.epsilon, self.epsilon_min)
        if np.random.rand() <= self.epsilon:
            return np.random.randint(self.action_size)
        q_values = self.model.predict(state.reshape(1, -1), verbose=0)
        return np.argmax(q_values[0])

    def replay(self, batch_size=None):
        if batch_size is None:
            batch_size = self.batch_size
        if len(self.memory) < batch_size:
            return
        batch = random.sample(self.memory, batch_size)
        states = np.array([e[0] for e in batch])
        actions = np.array([e[1] for e in batch])
        rewards = np.array([e[2] for e in batch])
        next_states = np.array([e[3] for e in batch])
        dones = np.array([e[4] for e in batch])
        current_q_values = self.model.predict(states, verbose=0)
        next_q_values_main = self.model.predict(next_states, verbose=0)
        next_q_values_target = self.target_model.predict(next_states, verbose=0)
        target_q_values = current_q_values.copy()
        for i in range(batch_size):
            if dones[i]:
                target_q_values[i, actions[i]] = rewards[i]
            else:
                target = rewards[i] + 0.99 * next_q_values_target[i, np.argmax(next_q_values_main[i])]
                target_q_values[i, actions[i]] = target
        self.model.fit(states, target_q_values, epochs=1, verbose=0)

# --- TRAINING LOOP ---
env = PongEnv()
agent = DQNAgent()
episodes = 5
for episode in range(episodes):
    state = env.reset()
    total_reward = 0
    while True:
        action = agent.act(state)
        next_state, reward, done = env.step(action)
        agent.remember(state, action, reward, next_state, done)
        state = next_state
        total_reward += reward
        if done:
            break
        if len(agent.memory) >= agent.learning_starts and agent.step_count % agent.learning_freq == 0:
            agent.replay(agent.batch_size)
    agent.episode_count += 1
    if episode % 10 == 0:
        print(f"Episode {episode}: Total Reward = {total_reward}")

# Save trained model
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
model_path = f'../models/pong_ai_model_v{timestamp}.h5'
agent.model.save(model_path)
print(f"✓ Keras model saved as '{model_path}'")

# --- WEIGHT EXTRACTION ---
model = tf.keras.models.load_model(model_path, compile=False)
layer1_weights = model.layers[0].get_weights()[0]  # (5,8)
layer1_bias = model.layers[0].get_weights()[1]     # (8,)
layer2_weights = model.layers[1].get_weights()[0]  # (8,3)
layer2_bias = model.layers[1].get_weights()[1]     # (3,)
scale_factor = 1024
weights1 = [[int(w * scale_factor) for w in row] for row in layer1_weights]
bias1 = [int(b * scale_factor) for b in layer1_bias]
weights2 = [[int(w * scale_factor) for w in row] for row in layer2_weights]
bias2 = [int(b * scale_factor) for b in layer2_bias]

# --- LUT GENERATION ---
LUT_BALL_X_STEPS = 40
LUT_BALL_Y_STEPS = 28
LUT_VEL_X_STEPS  = 9
LUT_VEL_Y_STEPS  = 9
LUT_AI_Y_STEPS   = 28
LUT_SIZE = (LUT_BALL_X_STEPS * LUT_BALL_Y_STEPS * LUT_VEL_X_STEPS * LUT_VEL_Y_STEPS * LUT_AI_Y_STEPS)

def relu(x): return x if x > 0 else 0

def nn_forward(ball_x_px, ball_y_px, ball_vx, ball_vy, ai_y_px):
    tile_ball_x = ball_x_px >> 3
    tile_ball_y = ball_y_px >> 3
    tile_ai_y   = ai_y_px   >> 3
    norm_ball_x = (tile_ball_x * 1024) // 39
    norm_ball_y = (tile_ball_y * 1024) // 27
    norm_ball_vx = ((ball_vx + 4) * 1024) >> 3
    norm_ball_vy = ((ball_vy + 4) * 1024) >> 3
    norm_ai_y   = (tile_ai_y * 1024) // 27
    inputs = [norm_ball_x, norm_ball_y, norm_ball_vx, norm_ball_vy, norm_ai_y]
    hidden = []
    for h in range(8):
        s = bias1[h]
        for i in range(5):
            s += (inputs[i] * weights1[i][h]) >> 10
        hidden.append(relu(s))
    outputs = []
    for o in range(3):
        s = bias2[o]
        for h in range(8):
            s += (hidden[h] * weights2[h][o]) >> 10
        outputs.append(s)
    best_action = np.argmax(outputs)
    return best_action

lut_path = "../pong/res/ai_lut.bin"
buf = bytearray()
for bx in range(LUT_BALL_X_STEPS):
    bx_px = (bx << 3)
    for by in range(LUT_BALL_Y_STEPS):
        by_px = (by << 3)
        for vx in range(LUT_VEL_X_STEPS):
            ball_vx = vx - 4
            for vy in range(LUT_VEL_Y_STEPS):
                ball_vy = vy - 4
                for ay in range(LUT_AI_Y_STEPS):
                    ay_px = (ay << 3)
                    action = nn_forward(bx_px, by_px, ball_vx, ball_vy, ay_px)
                    buf.append(action)
with open(lut_path, "wb") as f:
    f.write(buf)
print(f"LUT generated and saved to {lut_path} ({len(buf)} bytes)")
import os
import numpy as np
import tensorflow as tf
from keras import layers
from datetime import datetime

# --- TRAINING SECTION (from pong_ai_train.py) ---
# ... (insert your PongEnv and DQNAgent classes here) ...

env = PongEnv()
agent = DQNAgent()

# Train the model
episodes = 500
for episode in range(episodes):
    state = env.reset()
    while True:
        action = agent.act(state)
        next_state, reward, done = env.step(action)
        agent.remember(state, action, reward, next_state, done)
        state = next_state
        if done:
            break
        if len(agent.memory) >= agent.learning_starts and agent.step_count % agent.learning_freq == 0:
            agent.replay(agent.batch_size)
    agent.episode_count += 1

# Save trained model
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
model_path = f'../models/pong_ai_model_v{timestamp}.h5'
agent.model.save(model_path)
print(f"✓ Keras model saved as '{model_path}'")

# --- WEIGHT EXTRACTION SECTION (from get_weights.py) ---
model = tf.keras.models.load_model(model_path, compile=False)
layer1_weights = model.layers[0].get_weights()[0]  # (5,8)
layer1_bias = model.layers[0].get_weights()[1]     # (8,)
layer2_weights = model.layers[1].get_weights()[0]  # (8,3)
layer2_bias = model.layers[1].get_weights()[1]     # (3,)

scale_factor = 1024
weights1 = [[int(w * scale_factor) for w in row] for row in layer1_weights]
bias1 = [int(b * scale_factor) for b in layer1_bias]
weights2 = [[int(w * scale_factor) for w in row] for row in layer2_weights]
bias2 = [int(b * scale_factor) for b in layer2_bias]

# --- LUT GENERATION SECTION (from gen_lut_v3.py) ---
LUT_BALL_X_STEPS = 40
LUT_BALL_Y_STEPS = 28
LUT_VEL_X_STEPS  = 9
LUT_VEL_Y_STEPS  = 9
LUT_AI_Y_STEPS   = 28
LUT_SIZE = (LUT_BALL_X_STEPS * LUT_BALL_Y_STEPS * LUT_VEL_X_STEPS * LUT_VEL_Y_STEPS * LUT_AI_Y_STEPS)

def relu(x): return x if x > 0 else 0

def nn_forward(ball_x_px, ball_y_px, ball_vx, ball_vy, ai_y_px):
    tile_ball_x = ball_x_px >> 3
    tile_ball_y = ball_y_px >> 3
    tile_ai_y   = ai_y_px   >> 3
    norm_ball_x = (tile_ball_x * 1024) // 39
    norm_ball_y = (tile_ball_y * 1024) // 27
    norm_ball_vx = ((ball_vx + 4) * 1024) >> 3
    norm_ball_vy = ((ball_vy + 4) * 1024) >> 3
    norm_ai_y   = (tile_ai_y * 1024) // 27
    inputs = [norm_ball_x, norm_ball_y, norm_ball_vx, norm_ball_vy, norm_ai_y]
    hidden = [relu(sum(bias1[h] + sum((inputs[i] * weights1[i][h]) >> 10 for i in range(5)) for h in range(8)))]
    outputs = [bias2[o] + sum((hidden[h] * weights2[h][o]) >> 10 for h in range(8)) for o in range(3)]
    best_action = np.argmax(outputs)
    return best_action

lut_path = "../pong/res/ai_lut.bin"
buf = bytearray()
for bx in range(LUT_BALL_X_STEPS):
    bx_px = (bx << 3)
    for by in range(LUT_BALL_Y_STEPS):
        by_px = (by << 3)
        for vx in range(LUT_VEL_X_STEPS):
            ball_vx = vx - 4
            for vy in range(LUT_VEL_Y_STEPS):
                ball_vy = vy - 4
                for ay in range(LUT_AI_Y_STEPS):
                    ay_px = (ay << 3)
                    action = nn_forward(bx_px, by_px, ball_vx, ball_vy, ay_px)
                    buf.append(action)
with open(lut_path, "wb") as f:
    f.write(buf)
print(f"LUT generated and saved to {lut_path} ({len(buf)} bytes)")

# Done!