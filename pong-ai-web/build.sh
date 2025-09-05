#!/bin/bash

# SGDK Pong AI Web - Build Script
# Builds the WebAssembly module and starts the development server

set -e

echo "🎮 SGDK Pong AI Web - Build Script"
echo "=================================="

# Check if emcc is available
if ! command -v emcc &> /dev/null; then
    echo "❌ Emscripten not found. Please install Emscripten SDK:"
    echo "   brew install emscripten"
    echo "   or visit: https://emscripten.org/docs/getting_started/downloads.html"
    exit 1
fi

echo "✅ Emscripten found: $(emcc --version | head -n1)"

# Build WebAssembly module
echo ""
echo "🔧 Building WebAssembly module..."
cd src/wasm

if make clean && make; then
    echo "✅ WebAssembly build successful!"
else
    echo "❌ WebAssembly build failed!"
    exit 1
fi

cd ../..

# Check if node modules are installed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm install
fi

echo ""
echo "🚀 Starting development server..."
echo "   Open your browser to: http://localhost:5173"
echo ""

# Start dev server (this will also copy WASM files to public for dev)
npm run dev
