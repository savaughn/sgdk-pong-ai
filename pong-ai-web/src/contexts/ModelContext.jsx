import React, { createContext, useContext, useState, useCallback } from 'react';

const ModelContext = createContext();

export const useModel = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModel must be used within a ModelProvider');
  }
  return context;
};

export const ModelProvider = ({ children }) => {
  const [trainedModel, setTrainedModel] = useState(null);
  const [modelWeights, setModelWeights] = useState(null);
  const [modelMetadata, setModelMetadata] = useState(null);

  // Save a trained TensorFlow.js model
  const saveTrainedModel = useCallback((model, metadata = {}) => {
    setTrainedModel(model);
    setModelMetadata({
      ...metadata,
      timestamp: new Date().toISOString(),
      architecture: {
        inputShape: model.layers[0].inputShape,
        layers: model.layers.map(layer => ({
          name: layer.name,
          units: layer.units,
          activation: layer.activation?.name
        }))
      }
    });
    
    console.log('Model saved to context:', metadata);
  }, []);

  // Extract weights from the saved model
  const extractModelWeights = useCallback(() => {
    if (!trainedModel) {
      console.warn('No trained model available');
      return null;
    }

    const weights = trainedModel.getWeights();
    const layer1Weights = weights[0].arraySync();
    const layer1Bias = weights[1].arraySync();
    const layer2Weights = weights[2].arraySync();
    const layer2Bias = weights[3].arraySync();

    // Scale weights by 1024 for integer math in C
    const scaledWeights = {
      layer1_weights: layer1Weights.map(row => row.map(w => Math.round(w * 1024))),
      layer1_bias: layer1Bias.map(b => Math.round(b * 1024)),
      layer2_weights: layer2Weights.map(row => row.map(w => Math.round(w * 1024))),
      layer2_bias: layer2Bias.map(b => Math.round(b * 1024))
    };

    setModelWeights(scaledWeights);
    return scaledWeights;
  }, [trainedModel]);

  // Check if a model is available for gameplay
  const hasTrainedModel = () => {
    return trainedModel !== null;
  };

  // Clear the saved model
  const clearModel = useCallback(() => {
    if (trainedModel) {
      trainedModel.dispose();
    }
    setTrainedModel(null);
    setModelWeights(null);
    setModelMetadata(null);
  }, [trainedModel]);

  const value = {
    trainedModel,
    modelWeights,
    modelMetadata,
    saveTrainedModel,
    extractModelWeights,
    hasTrainedModel,
    clearModel
  };

  return (
    <ModelContext.Provider value={value}>
      {children}
    </ModelContext.Provider>
  );
};
