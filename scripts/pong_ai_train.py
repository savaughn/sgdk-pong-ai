import numpy as np
import tensorflow as tf
from tensorflow import keras
from keras import layers
import random
from collections import deque
from datetime import datetime
import os
import time
import sys

# Updated training script to match actual Pong game implementation:
# - Uses exact same input normalization as ai.c for consistency
# - Network architecture: 5 inputs -> 8 hidden -> 3 outputs (matches ai.c)
# - Scale factor: 1024 for easy bit shifting on Genesis (>>10 instead of /1000)
# - Game boundaries match real implementation with horizontal borders
# - Paddle positions and collision detection match actual game coordinates

# Simple Pong environment simulation for training
class PongEnv:
    def __init__(self):
        self.reset()

    def reset(self):
        self.ball_x = 160
        self.ball_y = 100
        self.ball_vx = 2
        self.ball_vy = 2
        self.player_y = 88
        self.ai_y = 88
        self.player_score = 0
        self.ai_score = 0
        self.steps = 0
        return self.get_state()

    def get_state(self):
        # Use the EXACT same input normalization as in ai.c
        # This ensures training matches the actual game implementation
        
        # ai.c uses: inputs[0] = (bx << 1) * 13 >> 6;
        bx_input = (self.ball_x << 1) * 13 >> 6
        
        # ai.c uses: inputs[1] = by * 37 >> 6;
        by_input = self.ball_y * 37 >> 6
        
        # ai.c uses: inputs[2] = F32_toInt(ball_vx) << 4;
        vx_input = self.ball_vx << 4
        
        # ai.c uses: inputs[3] = F32_toInt(ball_vy) << 4;
        vy_input = self.ball_vy << 4
        
        # ai.c uses: inputs[4] = ay * 37 >> 6;
        ay_input = self.ai_y * 37 >> 6
        
        # Normalize to reasonable training range (divide by 1024 to match scale factor)
        return np.array([
            bx_input / 1024.0,
            by_input / 1024.0, 
            vx_input / 1024.0,
            vy_input / 1024.0,
            ay_input / 1024.0
        ])

    def step(self, action):
        self.steps += 1
        
        # AI action (0=stay, 1=up, 2=down) - using real game PADDLE_SPEED=3
        if action == 1 and self.ai_y > 0:
            self.ai_y -= 3  # PADDLE_SPEED from real game
        elif action == 2 and self.ai_y < 174:  # 222 - 48 = 174 (screenHeightTiles-2)*8 - PADDLE_HEIGHT
            self.ai_y += 3  # PADDLE_SPEED from real game

        # Simple player AI (follows ball) - using real game PADDLE_SPEED=3
        if self.ball_y < self.player_y + 24:  # Half of PADDLE_HEIGHT (48/2 = 24)
            self.player_y = max(0, self.player_y - 3)
        elif self.ball_y > self.player_y + 24:  # Half of PADDLE_HEIGHT (48/2 = 24)
            self.player_y = min(174, self.player_y + 3)  # 222 - 48 = 174

        # Ball movement - using real game BALL_SPEED=2
        self.ball_x += self.ball_vx
        self.ball_y += self.ball_vy

        # Ball collision with top/bottom walls (match real game with horizontal borders at y=16 and y=208)
        if self.ball_y <= 16 or self.ball_y >= 208:
            self.ball_vy = -self.ball_vy

        # Ball collision with paddles (using real PADDLE_HEIGHT=48)
        done = False
        reward = 0

        # Player paddle collision (left side, match real game coordinates)
        if (self.ball_x <= 24 and self.ball_vx < 0 and 
            self.player_y <= self.ball_y <= self.player_y + 48):  # Real PADDLE_HEIGHT
            self.ball_vx = -self.ball_vx
            self.ball_x = 24

        # AI paddle collision (right side, match real game coordinates)
        elif (self.ball_x >= 296 and self.ball_vx > 0 and 
              self.ai_y <= self.ball_y <= self.ai_y + 48):  # Real PADDLE_HEIGHT
            self.ball_vx = -self.ball_vx
            self.ball_x = 296
            reward = 1.0  # Reward for hitting the ball

        # Scoring
        elif self.ball_x <= 0:
            self.ai_score += 1
            reward = 2.0  # Big reward for scoring
            done = True
        elif self.ball_x >= 320:
            self.player_score += 1
            reward = -2.0  # Big penalty for getting scored on
            done = True

        # Additional reward shaping for better AI behavior
        if not done:
            # Calculate distance from AI paddle to ball (using real paddle center)
            paddle_center = self.ai_y + 24  # Half of real PADDLE_HEIGHT (48/2 = 24)
            ball_distance = abs(paddle_center - self.ball_y)
            
            if self.ball_vx > 0:  # Ball moving toward AI
                proximity_reward = max(0, 2.0 - ball_distance / 50.0)
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
        self.memory = deque(maxlen=50000)  # Larger memory for better learning
        self.epsilon = 1.0  # Exploration rate
        self.epsilon_min = 0.05  # Minimum exploration
        self.epsilon_decay = 0.9995  # Slower decay for more exploration
        self.learning_rate = 0.001
        self.step_count = 0
        self.update_target_freq = 1000  # Update target model every 1000 steps
        self.rng = np.random.default_rng(42)  # Reproducible random seed
        
        # Build neural network models
        self.model = self._build_model()
        self.target_model = self._build_model()
        self.update_target_model()

    def _build_model(self):
        # Match the exact architecture used in ai.c: 5 inputs -> 8 hidden -> 3 outputs
        model = keras.Sequential([
            layers.Dense(8, input_dim=self.state_size, activation='relu'),  # 8 hidden neurons to match ai.c
            layers.Dense(self.action_size, activation='linear')              # 3 output actions (up, stay, down)
        ])
        model.compile(loss='mse', optimizer=keras.optimizers.Adam(learning_rate=self.learning_rate))
        return model

    def update_target_model(self):
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
        states = np.array([e[0] for e in batch])
        actions = np.array([e[1] for e in batch])
        rewards = np.array([e[2] for e in batch])
        next_states = np.array([e[3] for e in batch])
        dones = np.array([e[4] for e in batch])

        # Double DQN: Use main model to select action, target model to evaluate
        current_q_values = self.model.predict(states, verbose=0)
        next_q_values_main = self.model.predict(next_states, verbose=0)
        next_q_values_target = self.target_model.predict(next_states, verbose=0)

        target_q_values = current_q_values.copy()
        
        for i in range(batch_size):
            if dones[i]:
                target_q_values[i][actions[i]] = rewards[i]
            else:
                # Double DQN update
                best_action = np.argmax(next_q_values_main[i])
                target_q_values[i][actions[i]] = rewards[i] + 0.95 * next_q_values_target[i][best_action]

        self.model.fit(states, target_q_values, epochs=1, verbose=0)
        
        # Decay epsilon
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def update_model(self):
        # Final update of target model
        self.update_target_model()

# Training setup
print("=" * 70)
print("🎮 OPTIMIZED PONG AI TRAINING - GENESIS-COMPATIBLE 🎮")
print("=" * 70)
print("This training is optimized for Sega Genesis implementation!")
print("Features:")
print("• Input normalization matches ai.c implementation exactly")
print("• Network architecture: 5 inputs -> 8 hidden -> 3 outputs")
print("• Scale factor: 1024 for efficient bit shifting (>>10)")
print("• Game boundaries match real implementation with borders")
print("• Double DQN with target network for stable learning")
print("• Large experience replay buffer (50,000 memories)")
print("")
print("Training will take 30-60 minutes for ELITE AI quality.")
print("-" * 70)

env = PongEnv()
agent = DQNAgent()

# Check for existing model to continue training from
continue_training = False
model_path = None

if len(sys.argv) > 1 and sys.argv[1] == "--continue":
    # Look for existing models
    if os.path.exists('../models/pong_ai_model.h5'):
        model_path = '../models/pong_ai_model.h5'
        continue_training = True
    elif os.path.exists('../pong_ai_model.h5'):
        model_path = '../pong_ai_model.h5'
        continue_training = True
else:
    # Interactive prompt for continuing training
    if os.path.exists('../models/pong_ai_model.h5'):
        response = input(f"\n🤖 Found existing model: ../models/pong_ai_model.h5\n   Continue training from this model? (y/n): ").lower().strip()
        if response in ['y', 'yes']:
            model_path = '../models/pong_ai_model.h5'
            continue_training = True
    elif os.path.exists('../pong_ai_model.h5'):
        response = input(f"\n🤖 Found existing model: ../pong_ai_model.h5\n   Continue training from this model? (y/n): ").lower().strip()
        if response in ['y', 'yes']:
            model_path = '../pong_ai_model.h5'
            continue_training = True

if continue_training:
    print(f"\n🔄 Loading existing model from: {model_path}")
    try:
        # Try loading with custom objects to handle version compatibility
        agent.model = tf.keras.models.load_model(model_path, compile=False)
        
        # Recompile the model with current Keras version settings
        agent.model.compile(loss='mse', optimizer=keras.optimizers.Adam(learning_rate=agent.learning_rate))
        
        # Clone and set up target model
        agent.target_model = tf.keras.models.clone_model(agent.model)
        agent.target_model.compile(loss='mse', optimizer=keras.optimizers.Adam(learning_rate=agent.learning_rate))
        agent.target_model.set_weights(agent.model.get_weights())
        
        print("✅ Successfully loaded existing model weights!")
        print("   Training will continue from the existing knowledge base.")
        # Reduce epsilon since we're continuing training
        agent.epsilon = max(0.1, agent.epsilon * 0.5)  # Start with less exploration
        print(f"   Starting epsilon (exploration): {agent.epsilon:.3f}")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        print("   Starting fresh training instead...")
        continue_training = False
else:
    print("\n🆕 Starting fresh training from scratch...")

episodes = 10000  # Elite training - 10x more episodes!
scores = []
best_score = -float('inf')
episode_lengths = []

if continue_training:
    print("Beginning CONTINUED elite training loop...")
    print(f"🚀 Resuming from existing model with {episodes} additional episodes")
else:
    print("Beginning elite training loop...")
    print(f"🚀 Starting fresh training with {episodes} episodes")

# Start timing the training
training_start_time = time.time()

for episode in range(episodes):
    state = env.reset()
    total_reward = 0
    steps_in_episode = 0
    
    while True:
        action = agent.act(state)
        next_state, reward, done = env.step(action)
        agent.remember(state, action, reward, next_state, done)
        state = next_state
        total_reward += reward
        steps_in_episode += 1
        
        if done or steps_in_episode > 1000:  # Prevent infinite games
            break
    
    scores.append(total_reward)
    episode_lengths.append(steps_in_episode)
    
    # Train the agent
    if len(agent.memory) > 1000:
        agent.replay(64)
    
    # Print progress every 100 episodes
    if episode % 100 == 0 and episode > 0:
        avg_score = np.mean(scores[-100:])
        avg_length = np.mean(episode_lengths[-100:])
        print(f"Episode {episode:4d} | Avg Score: {avg_score:6.2f} | Avg Length: {avg_length:4.0f} | Epsilon: {agent.epsilon:.3f}")
        
        # Track best performance
        if avg_score > best_score:
            best_score = avg_score
            print(f"           >>> NEW BEST AVERAGE SCORE: {best_score:.2f} <<<")
    
    # Progress dots for visual feedback (every 25 episodes)
    elif episode % 25 == 0 and episode > 0:
        print(".", end="", flush=True)

print("\n" + "=" * 70)
print("🏆 ELITE TRAINING COMPLETED! 🏆")

# Calculate and display training time
training_end_time = time.time()
total_training_time = training_end_time - training_start_time
hours = int(total_training_time // 3600)
minutes = int((total_training_time % 3600) // 60)
seconds = total_training_time % 60

if hours > 0:
    time_str = f"{hours}h {minutes}m {seconds:.1f}s"
elif minutes > 0:
    time_str = f"{minutes}m {seconds:.1f}s"
else:
    time_str = f"{seconds:.1f}s"

print(f"⏱️  Total training time: {time_str}")
print(f"Best average score achieved: {best_score:.2f}")
print(f"Final epsilon (exploration rate): {agent.epsilon:.3f}")
print(f"Total training steps: {agent.step_count}")
print(f"Memory buffer size: {len(agent.memory)}")
print("This AI should be SIGNIFICANTLY better than the 1K version!")
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
