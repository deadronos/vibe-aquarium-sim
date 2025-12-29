import { simulateStep, type SimulationInput } from './simulationWorker';

self.onmessage = (event: MessageEvent<SimulationInput>) => {
  try {
    const result = simulateStep(event.data);
    self.postMessage({ type: 'success', result });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};
