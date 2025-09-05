#!/usr/bin/env node
/**
 * AI Lookup Table HTML Visualizer (No Dependencies)
 * Converts the binary AI lookup table to an HTML file with canvas visualization
 * 0 (up) = white, 1 (stay) = gray, 2 (down) = black
 */

const fs = require('fs');

// Configuration
const BINARY_FILE = '../pong/res/ai_lut.bin';
const OUTPUT_HTML = '../ai_lut_visualization.html';

// Lookup table dimensions (must match generate_ai_lut.py)
const LUT_BALL_X_STEPS = 40;
const LUT_BALL_Y_STEPS = 28;
const LUT_VEL_X_STEPS = 9;
const LUT_VEL_Y_STEPS = 9;
const LUT_AI_Y_STEPS = 28;

const TOTAL_ENTRIES = LUT_BALL_X_STEPS * LUT_BALL_Y_STEPS * LUT_VEL_X_STEPS * LUT_VEL_Y_STEPS * LUT_AI_Y_STEPS;

console.log('🧠 AI Lookup Table HTML Visualizer (No Dependencies)');
console.log('=' * 50);

// Check if binary file exists
if (!fs.existsSync(BINARY_FILE)) {
    console.error(`❌ Error: Binary file not found: ${BINARY_FILE}`);
    console.error('Please run generate_ai_lut.py first to create the binary file');
    process.exit(1);
}

// Read the binary file
console.log(`📁 Reading binary file: ${BINARY_FILE}`);
const binaryData = fs.readFileSync(BINARY_FILE);

if (binaryData.length !== TOTAL_ENTRIES) {
    console.error(`❌ Error: Binary file size mismatch`);
    console.error(`Expected: ${TOTAL_ENTRIES} bytes`);
    console.error(`Found: ${binaryData.length} bytes`);
    process.exit(1);
}

console.log(`✅ Loaded ${binaryData.length} AI decisions`);

// Calculate square image dimensions
const imageSize = Math.ceil(Math.sqrt(TOTAL_ENTRIES));
console.log(`📐 Creating ${imageSize}x${imageSize} visualization`);

// Statistics
const stats = { 0: 0, 1: 0, 2: 0 };

// Convert binary data to hex color array
const pixels = [];
for (let i = 0; i < TOTAL_ENTRIES; i++) {
    const value = binaryData[i];
    stats[value] = (stats[value] || 0) + 1;
    
    // Color mapping: 0=white, 1=gray, 2=black
    switch(value) {
        case 0: pixels.push('#FFFFFF'); break; // Up = White
        case 1: pixels.push('#808080'); break; // Stay = Gray
        case 2: pixels.push('#000000'); break; // Down = Black
        default: pixels.push('#FF00FF'); break; // Invalid = Magenta
    }
}

// Fill remaining pixels with background color
for (let i = TOTAL_ENTRIES; i < imageSize * imageSize; i++) {
    pixels.push('#404040'); // Dark gray background
}

// Generate HTML content
const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Lookup Table Visualization</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            margin: 20px;
            background: #f0f0f0;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
        }
        #canvas {
            border: 2px solid #333;
            display: block;
            margin: 20px auto;
            cursor: crosshair;
        }
        .stats {
            display: flex;
            justify-content: space-around;
            margin: 20px 0;
            font-weight: bold;
        }
        .stat-item {
            text-align: center;
            padding: 10px;
            border-radius: 5px;
            min-width: 120px;
        }
        .up { background: #ffffff; border: 2px solid #ccc; }
        .stay { background: #808080; color: white; }
        .down { background: #000000; color: white; }
        .info {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .controls {
            text-align: center;
            margin: 20px 0;
        }
        button {
            padding: 10px 20px;
            margin: 0 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
        }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        #mouseInfo {
            text-align: center;
            margin: 10px 0;
            font-family: monospace;
            background: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧠 AI Lookup Table Visualization</h1>
        <div class="subtitle">
            SGDK Pong Neural Network Decision Map<br>
            ${imageSize}×${imageSize} pixels (${TOTAL_ENTRIES.toLocaleString()} AI decisions)
        </div>

        <canvas id="canvas" width="${imageSize}" height="${imageSize}"></canvas>

        <div id="mouseInfo">
            Hover over the image to see coordinates and AI decision
        </div>

        <div class="controls">
            <button class="btn-primary" onclick="zoomIn()">🔍 Zoom In</button>
            <button class="btn-primary" onclick="zoomOut()">🔍 Zoom Out</button>
            <button class="btn-secondary" onclick="resetZoom()">↻ Reset</button>
            <button class="btn-secondary" onclick="saveImage()">💾 Save PNG</button>
        </div>

        <div class="stats">
            <div class="stat-item up">
                <div>UP</div>
                <div>${stats[0].toLocaleString()}</div>
                <div>${(stats[0] / TOTAL_ENTRIES * 100).toFixed(1)}%</div>
            </div>
            <div class="stat-item stay">
                <div>STAY</div>
                <div>${stats[1].toLocaleString()}</div>
                <div>${(stats[1] / TOTAL_ENTRIES * 100).toFixed(1)}%</div>
            </div>
            <div class="stat-item down">
                <div>DOWN</div>
                <div>${stats[2].toLocaleString()}</div>
                <div>${(stats[2] / TOTAL_ENTRIES * 100).toFixed(1)}%</div>
            </div>
        </div>

        <div class="info">
            <strong>🔍 How to read this visualization:</strong><br>
            • <strong>White pixels</strong> = AI wants to move paddle UP<br>
            • <strong>Gray pixels</strong> = AI wants to STAY in place<br>
            • <strong>Black pixels</strong> = AI wants to move paddle DOWN<br>
            • <strong>Dark gray</strong> = Unused space (padding)<br><br>
            Each pixel represents one combination of: ball position (x,y), ball velocity (vx,vy), and AI paddle position.
        </div>

        ${stats[1] === TOTAL_ENTRIES ? `
        <div class="warning">
            <strong>⚠️ WARNING:</strong> All decisions are "Stay" (gray)!<br>
            This suggests the neural network input normalization doesn't match the training data.
            Consider retraining the model with the updated training script.
        </div>
        ` : ''}

    </div>

    <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const mouseInfo = document.getElementById('mouseInfo');
        
        const imageSize = ${imageSize};
        const pixels = ${JSON.stringify(pixels)};
        
        let scale = Math.min(800 / imageSize, 600 / imageSize);
        let offsetX = 0, offsetY = 0;
        
        function drawImage() {
            canvas.width = imageSize * scale;
            canvas.height = imageSize * scale;
            
            ctx.imageSmoothingEnabled = false; // Pixel-perfect scaling
            
            for (let y = 0; y < imageSize; y++) {
                for (let x = 0; x < imageSize; x++) {
                    const index = y * imageSize + x;
                    ctx.fillStyle = pixels[index];
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }
        
        function zoomIn() {
            scale *= 1.5;
            drawImage();
        }
        
        function zoomOut() {
            scale /= 1.5;
            if (scale < 1) scale = 1;
            drawImage();
        }
        
        function resetZoom() {
            scale = Math.min(800 / imageSize, 600 / imageSize);
            drawImage();
        }
        
        function saveImage() {
            const link = document.createElement('a');
            link.download = 'ai_lut_visualization.png';
            link.href = canvas.toDataURL();
            link.click();
        }
        
        // Mouse hover to show coordinates
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / scale);
            const y = Math.floor((e.clientY - rect.top) / scale);
            
            if (x >= 0 && x < imageSize && y >= 0 && y < imageSize) {
                const index = y * imageSize + x;
                const value = ${JSON.stringify(Array.from(binaryData))}[index];
                const action = ['UP', 'STAY', 'DOWN'][value] || 'INVALID';
                const color = pixels[index];
                
                mouseInfo.innerHTML = \`Pixel (\${x}, \${y}) = \${action} (\${value}) - Color: \${color}\`;
            }
        });
        
        // Initial draw
        drawImage();
    </script>
</body>
</html>`;

// Write HTML file
console.log('🎨 Generating HTML visualization...');
fs.writeFileSync(OUTPUT_HTML, htmlContent);

console.log(`✅ HTML visualization saved: ${OUTPUT_HTML}`);

// Print statistics
console.log('\n📊 AI Decision Statistics:');
console.log(`   Up (white):   ${stats[0]} (${(stats[0] / TOTAL_ENTRIES * 100).toFixed(1)}%)`);
console.log(`   Stay (gray):  ${stats[1]} (${(stats[1] / TOTAL_ENTRIES * 100).toFixed(1)}%)`);
console.log(`   Down (black): ${stats[2]} (${(stats[2] / TOTAL_ENTRIES * 100).toFixed(1)}%)`);

console.log('\n🌐 Open the HTML file in your browser to view the interactive visualization!');
console.log(`   file://${require('path').resolve(OUTPUT_HTML)}`);
