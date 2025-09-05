# WebAssembly Build Script
CC = emcc
CFLAGS = -O3 -s WASM=1 -s EXPORTED_RUNTIME_METHODS='["ccall", "cwrap"]' \
         -s ALLOW_MEMORY_GROWTH=1 -s MODULARIZE=1 -s EXPORT_NAME='PongModule' \
         -s EXPORTED_FUNCTIONS='["_main", "_update_game_state", "_get_ball_x", "_get_ball_y", \
         "_get_player1_y", "_get_player2_y", "_get_score1", "_get_score2", "_set_ai_mode", \
         "_handle_key_down", "_handle_key_up", "_reset_game", "_update_nn_weights"]'

SRC = pong.c
OUT = ../assets/pong.js

all: $(OUT)

$(OUT): $(SRC)
	$(CC) $(CFLAGS) $(SRC) -o $(OUT)

clean:
	rm -f ../assets/pong.js ../assets/pong.wasm

.PHONY: all clean
