import os
import sys
import time
import signal
import subprocess
import json
import socketio

# --- Move environment configuration BEFORE importing TensorFlow/Python libs that use BLAS/OMP ---
# Set logging and vendor optimizations early
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'          # suppress TF info/warning logs
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '1'         # oneDNN optimizations
os.environ['TF_XLA_FLAGS'] = '--tf_xla_enable_xla_devices'  # XLA devices
# macOS Accelerate / BLAS / OpenMP thread control
cpu_count = str(os.cpu_count() or 1)
os.environ['OMP_NUM_THREADS'] = cpu_count
os.environ['MKL_NUM_THREADS'] = cpu_count
os.environ['VECLIB_MAXIMUM_THREADS'] = cpu_count    # Accelerate/Apple BLAS
# Optional TF thread envs (some TF builds honor these too)
os.environ['TF_NUM_INTEROP_THREADS'] = cpu_count
os.environ['TF_NUM_INTRAOP_THREADS'] = cpu_count
# --- End env setup ---

import numpy as np
import tensorflow as tf
tf.config.run_functions_eagerly(True)
from tensorflow import keras
from keras import layers
import random
from collections import deque
from datetime import datetime

# --- GPU/Metal detection and setup ---
gpus = tf.config.list_physical_devices('GPU')
if gpus:
    try:
        tf.config.experimental.set_memory_growth(gpus[0], True)
        print(f"✅ GPU detected: {gpus[0].name} (Metal acceleration enabled)", flush=True)
    except Exception as e:
        print(f"⚠️ Could not set GPU memory growth: {e}", flush=True)
else:
    print("⚠️ No GPU detected. Training will use CPU.", flush=True)

# Use explicit thread counts (do this after TF import)
tf.config.threading.set_inter_op_parallelism_threads(int(os.environ['TF_NUM_INTEROP_THREADS']))
tf.config.threading.set_intra_op_parallelism_threads(int(os.environ['TF_NUM_INTRAOP_THREADS']))
# Disable XLA JIT if using Metal GPU (macOS)
if gpus:
    tf.config.optimizer.set_jit(False)
else:
    tf.config.optimizer.set_jit(True)

print("🚀 M1 Pro Optimizations Enabled:")
print(f"   - CPU cores available: {os.cpu_count()}")
print(f"   - TensorFlow inter-op threads: {tf.config.threading.get_inter_op_parallelism_threads()}")
print(f"   - TensorFlow intra-op threads: {tf.config.threading.get_intra_op_parallelism_threads()}")
print("   - XLA JIT compilation: Enabled")
print("")

# Updated training script to match actual Pong game implementation:
# - Uses exact same input normalization as ai.c for consistency
# - Network architecture: 5 inputs -> 8 hidden -> 3 outputs (matches ai.c)
# - Scale factor: 1024 for easy bit shifting on Genesis (>>10 instead of /1000)
# - Game boundaries match real implementation with horizontal borders
# - Paddle positions and collision detection match actual game coordinates

# Simple Pong environment simulation for training
class PongEnv:
    def __init__(self):
        self.last_ai_y = 88  # Track previous position to detect camping
        self.stationary_steps = 0  # Count steps without movement
        self.reset()

    def reset(self):
        # Randomize ball starting position and direction to prevent camping
        import random
        self.ball_x = 160  # Always start at center X
        self.ball_y = random.randint(50, 170)  # Random Y position
        
        # Random direction: 50% chance left, 50% chance right
        direction = random.choice([-1, 1])
        self.ball_vx = 2 * direction
        
        # Random Y velocity to add variety
        self.ball_vy = random.choice([-2, -1, 1, 2])
        
        # CRITICAL: Randomize starting positions to prevent positional bias
        self.player_y = random.randint(20, 150)  # Random player start
        self.ai_y = random.randint(20, 150)      # Random AI start
        self.last_ai_y = self.ai_y
        self.stationary_steps = 0
        self.player_score = 0
        self.ai_score = 0
        self.steps = 0
        return self.get_state()

    def get_state(self):
        # Normalize all inputs using tile coordinates, matching ai.c and pong_ai_train.py
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
        ])

    def step(self, action):
        self.steps += 1
        
        # Track AI movement to discourage camping
        prev_ai_y = self.ai_y
        
        # AI action (0=stay, 1=up, 2=down) - using real game PADDLE_SPEED=3
        if action == 1 and self.ai_y > 8:
            self.ai_y -= 3  # PADDLE_SPEED from real game
        elif action == 2 and self.ai_y < 160:  # 26 tiles of 8 pixels = 208; 208 - 48 (PADDLE_HEIGHT) = 160
            self.ai_y += 3  # PADDLE_SPEED from real game

        # Track stationary behavior for anti-camping
        if abs(self.ai_y - self.last_ai_y) < 1:  # Essentially not moving
            self.stationary_steps += 1
        else:
            self.stationary_steps = 0
        self.last_ai_y = self.ai_y

        # Simple player AI (follows ball) - using real game PADDLE_SPEED=3
        # IMPROVEMENT: Make player AI less skilled so AI can score more often
        import random
        player_target = self.ball_y
        
        # Make player AI balanced - 15% chance of positioning errors (reduced from 40%)
        if random.random() < 0.15:
            player_target += random.randint(-20, 20)  # Smaller positioning errors
        
        # Add slight reaction delay - player sometimes doesn't move at all
        if random.random() < 0.1:  # 10% chance player doesn't react this frame (reduced from 20%)
            pass  # Skip movement entirely
        else:
            # Normal movement speed for player (3, same as AI)
            move_speed = 3  # Restored to 3 to match AI speed
            
            if player_target < self.player_y + 24:  # Half of PADDLE_HEIGHT (48/2 = 24)
                self.player_y = max(8, self.player_y - move_speed)
            elif player_target > self.player_y + 24:  # Half of PADDLE_HEIGHT (48/2 = 24)
                self.player_y = min(160, self.player_y + move_speed)  # 208 - 48 = 160

        # Ball movement - using real game BALL_SPEED=2
        self.ball_x += self.ball_vx
        self.ball_y += self.ball_vy

        # Ball collision with top/bottom walls (match real game with horizontal borders at y=16 and y=208)
        if self.ball_y <= 16 or self.ball_y >= 208:
            self.ball_vy = -self.ball_vy
            # Add slight randomness to bounces to prevent predictable patterns
            if random.random() < 0.1:  # 10% chance
                self.ball_vy += random.choice([-1, 1])  # Slight velocity change
                self.ball_vy = max(-4, min(4, self.ball_vy))  # Keep within bounds

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
            reward = 1.0  # Reduced reward for hitting the ball (was 2.0)

        # Scoring
        if self.ball_x <= 0:
            self.ai_score += 1
            reward = 1.0  # Reduced reward for scoring (was 2.0)
            done = True
        elif self.ball_x >= 320:
            self.player_score += 1
            reward = -1.0  # Reduced penalty for getting scored on (was -2.0)
            done = True

        # Additional reward shaping for better AI behavior (additive, not overwriting hit/score rewards)
        if not done:
            # small per-step time penalty to discourage camping
            timestep_penalty = -0.001  # Reduced penalty for stability

            # Calculate distance from AI paddle to ball (using real paddle center)
            paddle_center = self.ai_y + 24  # Half of real PADDLE_HEIGHT (48/2 = 24)
            ball_distance = abs(paddle_center - self.ball_y)

            shaping_reward = 0.0
            if self.ball_vx > 0:  # Ball moving toward AI
                # Closer -> larger bonus (scaled to ~0..0.5)
                proximity_reward = max(0.0, (50.0 - ball_distance) / 50.0) * 0.5
                shaping_reward += proximity_reward
            else:
                # small negative when ball moving away to encourage tracking when relevant
                shaping_reward += -0.02

            # Bonus for staying in reasonable position (not at edges)
            if 50 < self.ai_y < 150:
                shaping_reward += 0.01

            # Strong anti-camping penalty - discourage staying in same spot
            if self.stationary_steps > 5:  # Been stationary for more than 5 steps
                camping_penalty = -0.2 * (self.stationary_steps - 5)  # Harsh penalty
                shaping_reward += camping_penalty

            # CRITICAL: Add movement reward to encourage any action
            if action != 0:  # Any movement (up or down)
                movement_reward = 0.05  # Small but consistent movement reward
                shaping_reward += movement_reward

            # Apply timestep penalty + shaping to the base reward
            reward += timestep_penalty + shaping_reward

        return self.get_state(), reward, done

# DQN Agent for learning
class DQNAgent:
    def __init__(self, state_size=5, action_size=3):
        self.state_size = state_size
        self.action_size = action_size
        self.memory = deque(maxlen=10000)  # Optimized for M1 Pro 16GB - good balance of memory and diversity
        
        # Improved epsilon scheduling (linear decay like reference implementation)
        self.epsilon = 1.0  # Start with full exploration
        self.epsilon_min = 0.01  # Lower minimum for better final performance
        self.epsilon_decay_steps = 3000  # Linear decay over first 3000 episodes
        self.learning_rate = 1e-4  # Lower, more stable learning rate
        self.initial_learning_rate = 1e-4
        
        # Training schedule parameters (modern practices with Adam)
        self.learning_starts = 1000  # Wait longer before training starts
        self.learning_freq = 4  # Train every 4 steps for stability
        self.target_update_freq = 2000  # Update target model every 2000 steps
        self.batch_size = 64  # Larger batch for more stable gradients
        
        self.step_count = 0
        self.episode_count = 0
        self.rng = np.random.default_rng(42)  # Reproducible random seed
        self.first_replay_done = False  # Track first replay completion
        
        # Build neural network models
        self.model = self._build_model()
        self.target_model = self._build_model()
        self.update_target_model()

    def _build_model(self):
        # Match the exact architecture used in ai.c: 5 inputs -> 8 hidden -> 3 outputs
        # Optimized for M1 Pro with explicit dtype and modern Keras syntax
        model = keras.Sequential([
            layers.Input(shape=(self.state_size,)),  # Modern Keras input layer
            layers.Dense(8, activation='relu', dtype='float32'),  # 8 hidden neurons to match ai.c
            layers.Dense(self.action_size, activation='linear', dtype='float32')              # 3 output actions (up, stay, down)
        ])
        # Use Adam optimizer (modern best practice - better than RMSprop with experience replay)
        # Google Brain showed Adam significantly improves DQN performance
        optimizer = keras.optimizers.Adam(learning_rate=self.learning_rate, epsilon=1e-4, clipnorm=1.0)
        # Use Huber loss (Smooth L1) which is more stable for Q-learning
        model.compile(loss='huber', optimizer=optimizer, jit_compile=False)
        return model

    def update_target_model(self):
        self.target_model.set_weights(self.model.get_weights())

    def remember(self, state, action, reward, next_state, done):
        self.memory.append((state, action, reward, next_state, done))

    def act(self, state):
        self.step_count += 1
        
        # Update target model periodically
        if self.step_count % self.target_update_freq == 0:
            self.update_target_model()
        
        # Linear epsilon decay (like reference implementation)
        if self.episode_count < self.epsilon_decay_steps:
            self.epsilon = 1.0 - (self.episode_count / self.epsilon_decay_steps) * (1.0 - self.epsilon_min)
        else:
            self.epsilon = self.epsilon_min
            
        if self.rng.random() <= self.epsilon:
            return self.rng.integers(0, self.action_size)
        q_values = self.model.predict(state.reshape(1, -1), verbose=0)
        return np.argmax(q_values[0])

    def replay(self, batch_size=None):  # Use agent's batch_size if not specified
        if batch_size is None:
            batch_size = self.batch_size
        if len(self.memory) < batch_size:
            return
        
        replay_start = time.time()  # Track replay timing for first run
        
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

        history = self.model.fit(states, target_q_values, epochs=1, verbose=0)
        # Save last loss for stats
        self.last_loss = history.history['loss'][0] if 'loss' in history.history else 0.0

        if not self.first_replay_done:
            replay_time = time.time() - replay_start
            print(f"[INFO] First replay completed in {replay_time:.2f}s", flush=True)
            self.first_replay_done = True
    
    def update_model(self):
        # Final update of target model
        self.update_target_model()

# Training setup
print("=" * 70)
print("This training uses modern DQN best practices for M1 Pro with Metal GPU!")
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

episodes = 5
scores = []
best_score = -float('inf')
peak_reward = -float('inf')
peak_reward_episode = -1
episode_lengths = []

if continue_training:
    print("Beginning CONTINUED training loop...")
    print(f"🚀 Resuming from existing model with {episodes} additional episodes")
else:
    print("Beginning training loop...")
    print(f"🚀 Starting fresh training with {episodes} episodes")

# Start timing the training
training_start_time = time.time()
global_start_time = training_start_time

# Global variables for signal handling
agent_ref = None
scores_ref = None
episode_lengths_ref = None

def save_model_and_exit(signum, frame):
    """Signal handler to save model before exit"""
    print(f"\n\n🛑 INTERRUPTED! Saving model before exit...")
    if agent_ref is not None:
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            interrupted_path = f'../models/pong_ai_model_interrupted_{timestamp}.h5'
            agent_ref.model.save(interrupted_path)
            print(f"✅ Model saved to: {interrupted_path}")
            
            # Also save as main model
            agent_ref.model.save('../models/pong_ai_model.h5')
            print("✅ Model also saved as: ../models/pong_ai_model.h5")
            
            if scores_ref and len(scores_ref) > 0:
                avg_score = np.mean(scores_ref[-100:]) if len(scores_ref) >= 100 else np.mean(scores_ref)
                print(f"📊 Final performance: {avg_score:.2f} average score")
        except Exception as e:
            print(f"❌ Error saving model: {e}")
    
    print("👋 Exiting...")
    sys.exit(0)

# Set up signal handlers for graceful interruption
signal.signal(signal.SIGINT, save_model_and_exit)  # Ctrl+C
signal.signal(signal.SIGTERM, save_model_and_exit)  # Termination

# Set up global references for signal handler
agent_ref = agent
scores_ref = scores
episode_lengths_ref = episode_lengths

# SocketIO client setup
sio = socketio.Client()
try:
    sio.connect('http://localhost:5000')
except Exception as e:
    print(f"[Monitor] Could not connect to training monitor server: {e}")

for episode in range(episodes):
    episode_start_time = time.time()
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

        # Train according to modern schedule (every few steps with Adam)
        if (len(agent.memory) >= agent.learning_starts and 
            agent.step_count % agent.learning_freq == 0):
            agent.replay()  # Use agent's default batch size

        if done or steps_in_episode > 1000:  # Prevent infinite games
            break
    
    scores.append(total_reward)
    episode_lengths.append(steps_in_episode)
    agent.episode_count += 1  # Track episodes for epsilon decay

    # Track peak single-episode reward and save model if new peak
    if total_reward > peak_reward:
        peak_reward = total_reward
        peak_reward_episode = episode
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            peak_filename = f'../models/pong_ai_model_peak_{peak_reward:.2f}_ep{episode}_{timestamp}.h5'
            agent.model.save(peak_filename)
            print(f"           >>> PEAK REWARD MODEL SAVED: {peak_filename} <<<")
        except Exception as e:
            print(f"           >>> Error saving peak reward model: {e}")
    
    # Calculate timing
    episode_time = time.time() - episode_start_time
    total_elapsed = time.time() - global_start_time

    # Emit episode stats to server
    if sio.connected:
        avg_reward = np.mean(scores[-100:]) if len(scores) >= 100 else np.mean(scores) if scores else 0.0
        avg_length = np.mean(episode_lengths[-100:]) if len(episode_lengths) >= 100 else np.mean(episode_lengths) if episode_lengths else 0.0
        last_loss = getattr(agent, 'last_loss', 0.0)
        stats_payload = {
            'episode': agent.episode_count,
            'reward': total_reward,
            'loss': round(last_loss, 6),
            'epsilon': agent.epsilon,
            'steps': steps_in_episode,
            'avg_reward': avg_reward,
            'avg_length': avg_length,
            'memory': len(agent.memory),
            'best_score': best_score,
            'elapsed_time': total_elapsed
        }
        print(f"[SocketIO Emit] {stats_payload}")
        sio.emit('stats', stats_payload)

    if episode % 10 == 0:
        hours = int(total_elapsed // 3600)
        minutes = int((total_elapsed % 3600) // 60)
        time_str = f"{hours:02d}:{minutes:02d}" if hours > 0 else f"{minutes:02d}m"
        print(f"Episode {episode:4d} | Reward: {total_reward:6.2f} | Steps: {steps_in_episode:4d} | Time: {episode_time:4.1f}s | Total: {time_str} | Memory: {len(agent.memory)} | Epsilon: {agent.epsilon:.3f}", flush=True)
    
    # Additional end-of-episode training for better convergence
    if len(agent.memory) >= 64:
        agent.replay(64)  # Extra training at episode end
    
    # Print progress every 5 episodes
    if episode % 5 == 0 and episode > 0:
        avg_score = np.mean(scores[-100:])
        avg_length = np.mean(episode_lengths[-100:])
        hours = int(total_elapsed // 3600)
        minutes = int((total_elapsed % 3600) // 60)
        time_str = f"{hours:02d}:{minutes:02d}" if hours > 0 else f"{minutes:02d}m"
        print(f"Episode {episode:4d} | Avg Score: {avg_score:6.2f} | Avg Length: {avg_length:4.0f} | Time: {time_str} | Epsilon: {agent.epsilon:.3f}")
        
        # Track best performance
        if avg_score > best_score:
            best_score = avg_score
            print(f"           >>> NEW BEST AVERAGE SCORE: {best_score:.2f} <<<")
            # Auto-save on improvement
            try:
                agent.model.save('../models/pong_ai_model_best.h5')
                print("           >>> BEST MODEL SAVED <<<")
            except Exception as e:
                print(f"           >>> Error saving best model: {e}")

    if episode % 1 == 0 and episode > 0:
        print(".", end="", flush=True)

print("\n" + "=" * 70)
print("🏆 TRAINING COMPLETED! 🏆")

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
print(f"Peak single-episode reward: {peak_reward:.2f} (Episode {peak_reward_episode})")
print(f"Final epsilon (exploration rate): {agent.epsilon:.3f}")
print(f"Total training steps: {agent.step_count}")
print(f"Memory buffer size: {len(agent.memory)}")

print("=" * 70)

models_dir = '../models'
os.makedirs(models_dir, exist_ok=True)
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

# Use the trained model
model = agent.model

# Save model
print("\nSaving trained model...")
versioned_filename = f'{models_dir}/pong_ai_model_v{timestamp}.h5'
model.save(versioned_filename)
print(f"✓ Keras model saved as '{versioned_filename}'")
standard_filename = f'{models_dir}/pong_ai_model.h5'
model.save(standard_filename)
print(f"✓ Keras model also saved as '{standard_filename}' (for get_weights.py compatibility)")

# === Extract weights for Genesis (get_weights.py logic) ===
print("\nExtracting weights...")
import tensorflow as tf
model = tf.keras.models.load_model(standard_filename, compile=False)
layer1_weights = model.layers[0].get_weights()[0]  # (5,8)
layer1_bias = model.layers[0].get_weights()[1]     # (8,)
layer2_weights = model.layers[1].get_weights()[0]  # (8,3)
layer2_bias = model.layers[1].get_weights()[1]     # (3,)
scale_factor = 1024
weights1 = [[int(w * scale_factor) for w in row] for row in layer1_weights]
bias1 = [int(b * scale_factor) for b in layer1_bias]
weights2 = [[int(w * scale_factor) for w in row] for row in layer2_weights]
bias2 = [int(b * scale_factor) for b in layer2_bias]

# === Generate LUT (gen_lut_v3.py logic) ===
print("\nGenerating LUT...")
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

# Print weights and biases in C array format for ai.c
def print_c_array(name, arr):
    print(f"\n{name} = {{")
    if isinstance(arr[0], list):
        for row in arr:
            print("    {" + ", ".join(str(x) for x in row) + "},")
    else:
        print("    " + ", ".join(str(x) for x in arr))
    print("};")

print("\nCopy these arrays into ai.c:\n")
print_c_array("const s32 weights1[INPUT_SIZE][HIDDEN_SIZE]", weights1)
print_c_array("const s32 bias1[HIDDEN_SIZE]", bias1)
print_c_array("const s32 weights2[HIDDEN_SIZE][OUTPUT_SIZE]", weights2)
print_c_array("const s32 bias2[OUTPUT_SIZE]", bias2)