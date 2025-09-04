import numpy as np
import tensorflow as tf
from tensorflow import keras
from keras import layers
import random
from collections import deque
from datetime import datetime
import os

# Simple Pong environment simulation for training
class PongEnv:
    def __init__(self):
        self.reset()

    def reset(self):
        self.ball_x = 160
        self.ball_y = 112
        self.ball_vx = random.choice([-2, 2])  # Random initial direction
        self.ball_vy = random.choice([-2, 2])
        self.paddle_y = 100
        self.ai_y = 100
        self.score = 0
        return self.get_state()

    def get_state(self):
        # Normalize state values to match ai.c exactly
        # ai.c normalizes: ball_x/160, ball_y/112, ball_vx*16, ball_vy*16, ai_y/112
        return np.array([
            (self.ball_x - 160) / 160.0,      # Ball X position normalized around center
            (self.ball_y - 112) / 112.0,      # Ball Y position normalized around center
            self.ball_vx / 5.0,               # Ball X velocity normalized  
            self.ball_vy / 5.0,               # Ball Y velocity normalized
            (self.ai_y - 88) / 88.0           # AI paddle Y position normalized (accounting for 48px paddle height)
        ])

    def step(self, action):
        # Action: 0 = up, 1 = stay, 2 = down
        if action == 0:
            self.ai_y -= 2
        elif action == 2:
            self.ai_y += 2
        self.ai_y = np.clip(self.ai_y, 0, 224-32)

        # Update ball
        self.ball_x += self.ball_vx
        self.ball_y += self.ball_vy
        
        # Ball collision with top/bottom walls
        if self.ball_y <= 0 or self.ball_y >= 224-8:
            self.ball_vy = -self.ball_vy

        # Simple player paddle (follows ball for training opponent)
        target_y = self.ball_y - 16  # Center paddle on ball
        if self.paddle_y < target_y:
            self.paddle_y = min(self.paddle_y + 3, target_y)
        elif self.paddle_y > target_y:
            self.paddle_y = max(self.paddle_y - 3, target_y)
        self.paddle_y = np.clip(self.paddle_y, 0, 224-32)

        # Collision with player paddle (left side)
        if (self.ball_vx < 0 and self.ball_x <= 30 and self.ball_x >= 22 and 
            self.ball_y + 8 >= self.paddle_y and self.ball_y <= self.paddle_y + 32):
            self.ball_vx = -self.ball_vx
            # Add some angle variation
            if self.ball_y < self.paddle_y + 10:
                self.ball_vy = -abs(self.ball_vy)
            elif self.ball_y > self.paddle_y + 22:
                self.ball_vy = abs(self.ball_vy)

        # Collision detection and enhanced reward system
        reward = 0
        done = False
        
        # AI paddle collision (right side) - Primary positive reward
        if (self.ball_vx > 0 and self.ball_x + 8 >= 290 and self.ball_x <= 298 and 
            self.ball_y + 8 >= self.ai_y and self.ball_y <= self.ai_y + 32):
            self.ball_vx = -self.ball_vx
            
            # Better rewards based on hit quality (center hits are better)
            paddle_center = self.ai_y + 16
            ball_center = self.ball_y + 4
            hit_distance = abs(ball_center - paddle_center)
            
            if hit_distance <= 8:  # Center hit
                reward = 15
            elif hit_distance <= 16:  # Good hit
                reward = 10
            else:  # Edge hit
                reward = 5
                
            self.score += 1
            
            # Add some angle variation based on hit position
            if self.ball_y < self.ai_y + 10:
                self.ball_vy = -abs(self.ball_vy)
            elif self.ball_y > self.ai_y + 22:
                self.ball_vy = abs(self.ball_vy)
                
        elif self.ball_x > 320:  # Ball went off right side (AI missed)
            reward = -25  # Strong negative reward for missing
            done = True
            
        elif self.ball_x < 0:   # Ball went off left side (player missed) 
            reward = 8  # Reward for making opponent miss
            done = True
            
        else:
            # Continuous reward shaping for better learning
            paddle_center = self.ai_y + 16
            ball_center = self.ball_y + 4
            distance_to_ball = abs(paddle_center - ball_center)
            
            # Small positive reward for being close to ball path
            if self.ball_vx > 0:  # Ball moving toward AI
                proximity_reward = max(0, 2.0 - distance_to_ball / 50.0)
                reward = proximity_reward - 0.05  # Small time penalty
            else:
                reward = -0.02  # Very small penalty when ball moving away
            
            # Bonus for staying in reasonable position (not at edges)
            if 50 < self.ai_y < 150:
                reward += 0.01

        return self.get_state(), reward, done

# DQN Agent for learning
class DQNAgent:
    def __init__(self, state_size=5, action_size=3):
        self.state_size = state_size
        self.action_size = action_size
        self.memory = deque(maxlen=10000)  # Larger memory for better training
        self.epsilon = 1.0  # Exploration rate
        self.epsilon_min = 0.05  # Higher minimum for continued exploration
        self.epsilon_decay = 0.9995  # Slower decay for better exploration
        self.learning_rate = 0.0005  # Lower learning rate for more stable training
        self.gamma = 0.95  # Discount factor
        self.model = self._build_model()
        self.target_model = self._build_model()  # Target network for stable training
        self.update_target_freq = 100  # Update target network every 100 steps
        self.step_count = 0
        self.rng = np.random.default_rng(42)  # Fixed seed for reproducibility

    def _build_model(self):
        # EXACT architecture match with ai.c: 5 inputs -> 8 hidden (ReLU) -> 3 outputs
        model = keras.Sequential([
            layers.Input(shape=(self.state_size,)),
            layers.Dense(8, activation='relu', 
                        kernel_initializer='he_normal',  # Better initialization for ReLU
                        name='hidden_layer'),
            layers.Dense(self.action_size, activation='linear',
                        kernel_initializer='he_normal',
                        name='output_layer')
        ])
        model.compile(optimizer=keras.optimizers.Adam(learning_rate=self.learning_rate),
                     loss='mse',
                     metrics=['mae'])
        return model

    def update_target_model(self):
        """Copy weights from main model to target model for stable training"""
        self.target_model.set_weights(self.model.get_weights())

    def remember(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def act(self, state):
        self.step_count += 1
        
        # Update target model periodically
        if self.step_count % self.update_target_freq == 0:
            self.update_target_model()
            
        if self.rng.random() <= self.epsilon:
            return self.rng.integers(0, self.action_size)
        q_values = self.model.predict(state.reshape(1, -1), verbose=0)
        return np.argmax(q_values[0])

    def replay(self, batch_size=64):  # Larger batch size for better training
        if len(self.memory) < batch_size:
            return
        
        batch = random.sample(self.memory, batch_size)
        states = np.array([transition[0] for transition in batch])
        actions = np.array([transition[1] for transition in batch])
        rewards = np.array([transition[2] for transition in batch])
        next_states = np.array([transition[3] for transition in batch])
        dones = np.array([transition[4] for transition in batch])

        # Use target network for more stable training
        current_q_values = self.model.predict(states, verbose=0)
        next_q_values = self.target_model.predict(next_states, verbose=0)

        for i in range(batch_size):
            target = rewards[i]
            if not dones[i]:
                target += self.gamma * np.max(next_q_values[i])
            current_q_values[i][actions[i]] = target

        # Train with multiple epochs for better learning
        self.model.fit(states, current_q_values, epochs=1, verbose=0, batch_size=batch_size)
        
        # Decay epsilon more gradually
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

# Training
print("Starting DQN training...")
print("Architecture: 5 inputs → 8 hidden (ReLU) → 3 outputs (matches ai.c exactly)")
print("This will train for 1000 episodes with improved learning parameters.")
print("Progress will be reported every 50 episodes.")
print("Training will take 5-10 minutes for much better AI quality.")
print("-" * 70)

env = PongEnv()
agent = DQNAgent()

episodes = 1000  # More episodes for better training
scores = []
best_score = -float('inf')
episode_lengths = []

print("Beginning training loop...")

for episode in range(episodes):
    if episode == 0:
        print("Episode 0 starting...")
        agent.update_target_model()  # Initialize target model
    
    state = env.reset()
    total_reward = 0
    done = False
    steps = 0
    max_steps = 500  # Longer episodes for better learning
    
    while not done and steps < max_steps:
        action = agent.act(state)
        next_state, reward, done = env.step(action)
        agent.remember(state, action, reward, next_state, done)
        state = next_state
        total_reward += reward
        steps += 1
        
        # Train more frequently with larger batches for better learning
        if len(agent.memory) > 128 and steps % 4 == 0:
            agent.replay(64)
    
    scores.append(total_reward)
    episode_lengths.append(steps)
    
    print(f"Episode {episode} completed - Score: {total_reward:.2f}, Steps: {steps}, Epsilon: {agent.epsilon:.3f}")
    
    # Progress reporting every 50 episodes
    if episode % 50 == 0 and episode > 0:
        avg_score = np.mean(scores[-50:])
        avg_length = np.mean(episode_lengths[-50:])
        progress = (episode / episodes) * 100
        print(f"Progress: {progress:5.1f}% | Episode {episode:4d} | Avg Score: {avg_score:7.2f} | Avg Length: {avg_length:5.1f} | Epsilon: {agent.epsilon:.3f}")
        
        if avg_score > best_score:
            best_score = avg_score
            print(f"           >>> NEW BEST AVERAGE SCORE: {best_score:.2f} <<<")
    
    # Progress dots for visual feedback (every 10 episodes)
    elif episode % 10 == 0 and episode > 0:
        print(".", end="", flush=True)

print("\n" + "=" * 70)
print("🎉 TRAINING COMPLETED! 🎉")
print(f"Best average score achieved: {best_score:.2f}")
print(f"Final epsilon (exploration rate): {agent.epsilon:.3f}")
print(f"Total training steps: {agent.step_count}")
print(f"Memory buffer size: {len(agent.memory)}")
print("=" * 70)

# Use the trained model
model = agent.model

# Save model
print("\nSaving trained model...")

# Ensure models directory exists
models_dir = '../models'
os.makedirs(models_dir, exist_ok=True)

# Create versioned filename with timestamp
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
versioned_filename = f'../models/pong_ai_model_v{timestamp}.h5'
model.save(versioned_filename)
print(f"✓ Keras model saved as '{versioned_filename}'")

# Also save as the standard filename for compatibility with get_weights.py
standard_filename = '../models/pong_ai_model.h5'
model.save(standard_filename)
print(f"✓ Keras model also saved as '{standard_filename}' (for get_weights.py compatibility)")

print("\n" + "=" * 60)
print("Your AI has been trained and the model has been saved.")
print("Next steps:")
print("1. Run 'python get_weights.py' to extract C arrays from the model")
print("2. Copy the generated weights into pong/src/ai.c")
print("3. Set USE_DEBUG_WEIGHTS to 0 in ai.c to use the real trained weights")
print("=" * 60)
