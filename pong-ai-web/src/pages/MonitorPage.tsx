import React from 'react';
import TrainingMonitor from '../components/TrainingMonitor';

const MonitorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold text-white mb-8">Live Training Monitor</h1>
      <TrainingMonitor />
    </div>
  );
};

export default MonitorPage;
