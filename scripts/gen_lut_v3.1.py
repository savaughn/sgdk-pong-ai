# This script generates a LUT for AI
import struct

LUT_BALL_X_STEPS = 34  # (296 - 24) / 8
LUT_BALL_Y_STEPS = 25  # (208 - 8) / 8
LUT_VEL_X_STEPS  = 8   # -4..-1, 1..4 (skip 0)
LUT_VEL_Y_STEPS  = 9   # -4..4
LUT_AI_Y_STEPS   = 25  # (208 - 8) / 8

BALL_X_MIN = 24
BALL_X_MAX = 296
BALL_Y_MIN = 8
BALL_Y_MAX = 208
AI_Y_MIN = 8
AI_Y_MAX = 208

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

    norm_ball_x = (tile_ball_x * 1024) // 39
    norm_ball_y = (tile_ball_y * 1024) // 27
    norm_ball_vx = ((ball_vx + 4) * 1024) >> 3
    norm_ball_vy = ((ball_vy + 4) * 1024) >> 3
    norm_ai_y   = (tile_ai_y * 1024) // 27

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
for bx in range(LUT_BALL_X_STEPS):
    bx_px = BALL_X_MIN + (bx << 3)
    for by in range(LUT_BALL_Y_STEPS):
        by_px = BALL_Y_MIN + (by << 3)
        for vx in list(range(0, 4)) + list(range(5, 9)):
            ball_vx = vx - 4
            for vy in range(LUT_VEL_Y_STEPS):
                ball_vy = vy - 4
                for ay in range(LUT_AI_Y_STEPS):
                    ay_px = AI_Y_MIN + (ay << 3)
                    action = nn_forward(bx_px, by_px, ball_vx, ball_vy, ay_px)
                    lut.extend(struct.pack("B", action))

with open("../pong/res/ai_lut.bin", "wb") as f:
    f.write(lut)

print(f"LUT generated: {len(lut)} bytes")
