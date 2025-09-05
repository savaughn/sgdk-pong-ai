#!/usr/bin/env node
/**
 * AI Lookup Table Visualizer
 * Converts the binary AI lookup table to a square image
 * 0 (up) = white, 1 (stay) = gray, 2 (down) = black
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available for image generation
let sharp;
try {
    sharp = require('sharp');
} catch (e) {
    console.error('❌ Error: sharp package not found');
    console.error('Please install it with: npm install sharp');
    process.exit(1);
}

// Configuration
const BINARY_FILE = '../pong/res/ai_lut.bin';
const OUTPUT_IMAGE = '../ai_lut_visualization.png';

// Lookup table dimensions (must match generate_ai_lut.py)
const LUT_BALL_X_STEPS = 40;    // 320/8 = 40 steps (8px resolution)
const LUT_BALL_Y_STEPS = 28;    // 224/8 = 28 steps (8px resolution)  
const LUT_VEL_X_STEPS = 9;      // -4, -3, -2, -1, 0, 1, 2, 3, 4
const LUT_VEL_Y_STEPS = 9;      // -4, -3, -2, -1, 0, 1, 2, 3, 4
const LUT_AI_Y_STEPS = 28;      // 224/8 = 28 steps (8px resolution)

const TOTAL_ENTRIES = LUT_BALL_X_STEPS * LUT_BALL_Y_STEPS * LUT_VEL_X_STEPS * LUT_VEL_Y_STEPS * LUT_AI_Y_STEPS;

console.log('🧠 AI Lookup Table Visualizer');
console.log('=' * 40);

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
console.log(`📐 Creating ${imageSize}x${imageSize} image (${imageSize * imageSize} pixels)`);

// Create RGB buffer for the image
const rgbBuffer = Buffer.alloc(imageSize * imageSize * 3); // 3 bytes per pixel (RGB)

// Color mapping: 0=white (255,255,255), 1=gray (128,128,128), 2=black (0,0,0)
const colors = {
    0: [255, 255, 255], // Up = White
    1: [128, 128, 128], // Stay = Gray  
    2: [0, 0, 0]        // Down = Black
};

// Statistics
const stats = { 0: 0, 1: 0, 2: 0 };

// Convert binary data to RGB pixels
for (let i = 0; i < TOTAL_ENTRIES; i++) {
    const value = binaryData[i];
    const color = colors[value] || [255, 0, 255]; // Magenta for invalid values
    
    stats[value] = (stats[value] || 0) + 1;
    
    const pixelIndex = i * 3;
    rgbBuffer[pixelIndex] = color[0];     // R
    rgbBuffer[pixelIndex + 1] = color[1]; // G
    rgbBuffer[pixelIndex + 2] = color[2]; // B
}

// Fill remaining pixels with transparent/background color if image is larger than data
for (let i = TOTAL_ENTRIES; i < imageSize * imageSize; i++) {
    const pixelIndex = i * 3;
    rgbBuffer[pixelIndex] = 64;     // Dark gray background
    rgbBuffer[pixelIndex + 1] = 64;
    rgbBuffer[pixelIndex + 2] = 64;
}

// Create and save the image
console.log('🎨 Generating image...');

sharp(rgbBuffer, {
    raw: {
        width: imageSize,
        height: imageSize,
        channels: 3
    }
})
.png()
.toFile(OUTPUT_IMAGE)
.then(() => {
    console.log(`✅ Image saved: ${OUTPUT_IMAGE}`);
    
    // Print statistics
    console.log('\n📊 AI Decision Statistics:');
    console.log(`   Up (white):   ${stats[0]} (${(stats[0] / TOTAL_ENTRIES * 100).toFixed(1)}%)`);
    console.log(`   Stay (gray):  ${stats[1]} (${(stats[1] / TOTAL_ENTRIES * 100).toFixed(1)}%)`);
    console.log(`   Down (black): ${stats[2]} (${(stats[2] / TOTAL_ENTRIES * 100).toFixed(1)}%)`);
    
    // Interpretation
    console.log('\n🔍 Interpretation:');
    console.log('   • White pixels = AI wants to move paddle UP');
    console.log('   • Gray pixels  = AI wants to STAY in place');  
    console.log('   • Black pixels = AI wants to move paddle DOWN');
    console.log('   • Dark gray    = Unused space (padding)');
    
    if (stats[1] === TOTAL_ENTRIES) {
        console.log('\n⚠️  WARNING: All decisions are "Stay" - this suggests:');
        console.log('   1. Neural network input normalization mismatch');
        console.log('   2. Model was trained with different input format');
        console.log('   3. Model needs retraining with updated training script');
    }
    
    console.log(`\n📏 Image dimensions: ${imageSize}x${imageSize} pixels`);
    console.log(`📦 Data coverage: ${TOTAL_ENTRIES}/${imageSize * imageSize} pixels (${(TOTAL_ENTRIES / (imageSize * imageSize) * 100).toFixed(1)}%)`);
})
.catch(err => {
    console.error('❌ Error generating image:', err.message);
    process.exit(1);
});
