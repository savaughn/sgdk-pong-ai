# This script replicates the exact forward pass in ai.c and pre-computes
# a LUT (ai_lut.bin) with the same indexing order as pong_ai_lookup().
# It writes a 2,542,080-byte file mapping (bx, by, vx, vy, ay) -> action (0,1,2).
import os
import struct
from random import randint

# ---- Constants: must match ai.c ----
LUT_BALL_X_STEPS = 40  # 320/8
LUT_BALL_Y_STEPS = 28  # 224/8
LUT_VEL_X_STEPS  = 9   # -4..4 -> 0..8
LUT_VEL_Y_STEPS  = 9   # -4..4 -> 0..8
LUT_AI_Y_STEPS   = 28  # 224/8

LUT_SIZE = (LUT_BALL_X_STEPS *
            LUT_BALL_Y_STEPS *
            LUT_VEL_X_STEPS *
            LUT_VEL_Y_STEPS *
            LUT_AI_Y_STEPS)

# Weights/biases copied from ai.c (the ones actually used by pong_ai_NN)
weights1 = [
    [ 260, -738,  244, -260, -712,   62,  160, -861],   # ball_x
    [1987,  -86, -392,  759, -230, -1882, -2603, -415], # ball_y
    [-773, 1266,  -76, -855, 1146,  -638,  -329, 1417], # ball_vx
    [ 645,  389, -425,  216,  356,  -231,  -282,  480], # ball_vy
    [-1599, 352, -564, -774,  496,  1606,  2691, 1009], # ai_y
]
bias1 = [-150, 1102, -8, 128, 1074, 303, 520, 1084]

weights2 = [
    [-2960, -3011, -2847],
    [ 1289,   509,  1139],
    [  384,  -485,  -264],
    [ 1332,  1446,  1235],
    [  509,  1524,   960],
    [ 2996,  2627,  3258],
    [-3906, -3781, -4017],
    [  978,   849,   777],
]
bias2 = [773, 790, 707]

# ---- Helper: exact integer math as in ai.c ----
def relu(x: int) -> int:
    return x if x > 0 else 0

def nn_forward(ball_x_px: int, ball_y_px: int, ball_vx: int, ball_vy: int, ai_y_px: int) -> int:
    # Replicate the same normalization in pong_ai_NN (integer math)
    tile_ball_x = ball_x_px >> 3
    tile_ball_y = ball_y_px >> 3
    tile_ai_y   = ai_y_px   >> 3

    norm_ball_x = (tile_ball_x * 1024) // 39
    norm_ball_y = (tile_ball_y * 1024) // 27
    norm_ball_vx = ((ball_vx + 4) * 1024) >> 3  # divide by 8
    norm_ball_vy = ((ball_vy + 4) * 1024) >> 3  # divide by 8
    norm_ai_y   = (tile_ai_y * 1024) // 27

    inputs = [norm_ball_x, norm_ball_y, norm_ball_vx, norm_ball_vy, norm_ai_y]

    # Hidden layer
    hidden = [0]*8
    for h in range(8):
        s = bias1[h]
        for i in range(5):
            s += (inputs[i] * weights1[i][h]) >> 10  # >>10 == divide by 1024
        hidden[h] = relu(s)

    # Output layer
    outputs = [0]*3
    for o in range(3):
        s = bias2[o]
        for h in range(8):
            s += (hidden[h] * weights2[h][o]) >> 10
        outputs[o] = s

    # Argmax -> action (0=stay,1=up,2=down)
    best_action = 0
    best_value = outputs[0]
    for o in range(1, 3):
        if outputs[o] > best_value:
            best_action = o
            best_value = outputs[o]
    return best_action

# ---- LUT generation ----
def generate_lut(path: str):
    buf = bytearray()
    extend = buf.extend

    # Loop order MUST match index mapping in C: bx -> by -> vx -> vy -> ay (ay fastest-changing)
    for bx in range(LUT_BALL_X_STEPS):
        bx_px = (bx << 3)  # representative raw pixel
        for by in range(LUT_BALL_Y_STEPS):
            by_px = (by << 3)
            for vx in range(LUT_VEL_X_STEPS):
                ball_vx = vx - 4
                for vy in range(LUT_VEL_Y_STEPS):
                    ball_vy = vy - 4
                    for ay in range(LUT_AI_Y_STEPS):
                        ay_px = (ay << 3)
                        action = nn_forward(bx_px, by_px, ball_vx, ball_vy, ay_px)
                        extend(struct.pack("B", action))

    with open(path, "wb") as f:
        f.write(buf)

    return len(buf)

# ---- Quick self-checks ----
def index_c_style(bx, by, vx, vy, ay):
    return ((((bx * LUT_BALL_Y_STEPS + by) * LUT_VEL_X_STEPS + vx) * LUT_VEL_Y_STEPS + vy) * LUT_AI_Y_STEPS + ay)

def spot_check(lut_bytes: bytes, trials: int = 10):
    # randomly validate that lut[index] == nn_forward for a few samples
    for _ in range(trials):
        bx = randint(0, LUT_BALL_X_STEPS-1)
        by = randint(0, LUT_BALL_Y_STEPS-1)
        vx = randint(0, LUT_VEL_X_STEPS-1)
        vy = randint(0, LUT_VEL_Y_STEPS-1)
        ay = randint(0, LUT_AI_Y_STEPS-1)

        idx = index_c_style(bx, by, vx, vy, ay)
        lut_action = lut_bytes[idx]
        got = nn_forward(bx<<3, by<<3, vx-4, vy-4, ay<<3)
        if lut_action != got:
            return False, (bx, by, vx, vy, ay, lut_action, got, idx)
    return True, None

# Run generation
out_path = "../pong/res/ai_lut.bin"
size = generate_lut(out_path)

# Verify file size
actual_size = os.path.getsize(out_path)
print("Wrote:", out_path, "size:", actual_size, "bytes")
print("Expected size:", LUT_SIZE, "bytes")

# Read back and spot check a handful of entries
with open(out_path, "rb") as f:
    data = f.read()
ok, info = spot_check(data, trials=25)
print("Spot-check OK?" , ok)
if not ok:
    print("Mismatch example (bx,by,vx,vy,ay,lut_action,nn_action,index):", info)

out_path
print("LUT generation complete.")