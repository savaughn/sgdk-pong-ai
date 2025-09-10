# This script generates a LUT for AI
import struct

# 1 is jittery but works, 7 last known good (smooth)
LUT_BALL_X_STEPS = 7  # (296 - 288) / 8 = 1
LUT_BALL_Y_STEPS = 18  # y > 16 and y < 200 inclusive
LUT_VEL_Y_STEPS  = 9   # -4..4
LUT_AI_Y_STEPS   = 24  # (208 - 8) / 8

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
    [ 978,   849,   777],
]
bias2 = [773, 790, 707]

def relu(x: int) -> int:
    return x if x > 0 else 0

def nn_forward(ball_x_px: int, ball_y_px: int, ball_vx: int, ball_vy: int, ai_y_px: int) -> int:
    tile_ball_x = ball_x_px >> 3
    tile_ball_y = ball_y_px >> 3
    tile_ai_y   = ai_y_px   >> 3

    norm_ball_x = (tile_ball_x * 1024) // LUT_BALL_X_STEPS
    norm_ball_y = (tile_ball_y * 1024) // LUT_BALL_Y_STEPS
    norm_ball_vx = ((ball_vx + 4) * 1024) >> 3
    norm_ball_vy = ((ball_vy + 4) * 1024) >> 3
    norm_ai_y   = (tile_ai_y * 1024) // LUT_AI_Y_STEPS

    inputs = [norm_ball_x, norm_ball_y, norm_ball_vx, norm_ball_vy, norm_ai_y]

    hidden = [0]*8
    for h in range(8):
        s = bias1[h]
        for i in range(5):
            s += (inputs[i] * weights1[i][h]) >> 10
        hidden[h] = relu(s)

    outputs = [0]*3
    for o in range(3):
        s = bias2[o]
        for h in range(8):
            s += (hidden[h] * weights2[h][o]) >> 10
        outputs[o] = s

    best_action = 0
    best_value = outputs[0]
    for o in range(1, 3):
        if outputs[o] > best_value:
            best_action = o
            best_value = outputs[o]
    return best_action

# Generate compressed LUT

lut = bytearray()
actions = []
for bx in range(LUT_BALL_X_STEPS):
    bx_px = (bx << 3)
    for by in range(LUT_BALL_Y_STEPS):
        by_px = (by << 3)
        # Vx -4 to 4, skip 0
        for vx in range(5, 9):
            ball_vx = vx - 4
            for vy in range(LUT_VEL_Y_STEPS):
                ball_vy = vy - 4
                for ay in range(LUT_AI_Y_STEPS):
                    ay_px = (ay << 3)
                    action = nn_forward(bx_px, by_px, ball_vx, ball_vy, ay_px)
                    actions.append(action & 0xF)

# Pack two actions per byte

# Pack four actions per byte (2 bits per action)
for i in range(0, len(actions), 4):
    a0 = actions[i] & 0x3
    a1 = actions[i+1] & 0x3 if i+1 < len(actions) else 0
    a2 = actions[i+2] & 0x3 if i+2 < len(actions) else 0
    a3 = actions[i+3] & 0x3 if i+3 < len(actions) else 0
    packed = (a0 << 6) | (a1 << 4) | (a2 << 2) | a3
    lut.append(packed)

with open("../pong/res/ai_lut.bin", "wb") as f:
    f.write(lut)

print(f"LUT generated: {len(lut)} bytes")
