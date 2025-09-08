#!/usr/bin/env python3
"""
Export trained model for web pong game
Converts the trained Keras model to TensorFlow.js format and provides weight extraction
"""

import os
import sys
import tensorflow as tf
import tensorflowjs as tfjs
import numpy as np

def export_model_for_web():
    """Export the trained model for web use"""
    
    # Find the model
    model_path = '../models/pong_ai_model.h5'
    if not os.path.exists(model_path):
        model_path = '../pong_ai_model.h5'
        if not os.path.exists(model_path):
            print("❌ Error: Could not find pong_ai_model.h5")
            print("   Make sure you've trained a model first using pong_ai_train.py")
            return False
    
    print(f"📁 Loading model from: {model_path}")
    
    try:
        # Load the model
        model = tf.keras.models.load_model(model_path, compile=False)
        print("✅ Model loaded successfully!")
        
        # Create web export directory
        web_export_dir = '../pong-ai-web/public/models'
        os.makedirs(web_export_dir, exist_ok=True)
        
        # Export to TensorFlow.js format
        tfjs_path = os.path.join(web_export_dir, 'pong_ai_model')
        tfjs.converters.save_keras_model(model, tfjs_path)
        print(f"✅ Model exported to: {tfjs_path}")
        
        # Also export just the weights as JSON for easier integration
        weights = model.get_weights()
        layer1_weights = weights[0].tolist()  # 5x8
        layer1_bias = weights[1].tolist()     # 8
        layer2_weights = weights[2].tolist()  # 8x3  
        layer2_bias = weights[3].tolist()     # 3
        
        # Create weights object
        weights_data = {
            'architecture': {
                'input_size': 5,
                'hidden_size': 8,
                'output_size': 3
            },
            'weights': {
                'layer1_weights': layer1_weights,
                'layer1_bias': layer1_bias,
                'layer2_weights': layer2_weights,
                'layer2_bias': layer2_bias
            },
            'metadata': {
                'scale_factor': 1024,
                'activation': 'relu',
                'export_timestamp': tf.timestamp().numpy().item()
            }
        }
        
        # Save weights as JSON
        import json
        weights_path = os.path.join(web_export_dir, 'weights.json')
        with open(weights_path, 'w') as f:
            json.dump(weights_data, f, indent=2)
        
        print(f"✅ Weights exported to: {weights_path}")
        
        # Print summary
        print("\n" + "="*50)
        print("🎯 EXPORT COMPLETE!")
        print("="*50)
        print(f"Model architecture: {model.count_params()} parameters")
        print(f"Input shape: {model.input_shape}")
        print(f"Output shape: {model.output_shape}")
        print("\nFiles created:")
        print(f"  📁 {tfjs_path}/model.json")
        print(f"  📁 {tfjs_path}/model_weights.bin")
        print(f"  📁 {weights_path}")
        print("\n🌐 Your model is now ready for the web pong game!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = export_model_for_web()
    if not success:
        sys.exit(1)
