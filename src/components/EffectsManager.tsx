import { useState, useCallback } from 'react';
import { Vector3 } from 'three';
import { EatingBurst } from './effects/EatingBurst';

interface BurstEffect {
    id: string;
    position: Vector3;
}

// Singleton-style event system for triggering effects from systems
type EffectListener = (position: Vector3) => void;
const listeners: Set<EffectListener> = new Set();

export const triggerEatingBurst = (position: Vector3) => {
    listeners.forEach(listener => listener(position.clone()));
};

export const EffectsManager = () => {
    const [bursts, setBursts] = useState<BurstEffect[]>([]);

    const handleBurst = useCallback((position: Vector3) => {
        const id = `burst-${Date.now()}-${Math.random()}`;
        setBursts(prev => [...prev, { id, position }]);
    }, []);

    const removeBurst = useCallback((id: string) => {
        setBursts(prev => prev.filter(b => b.id !== id));
    }, []);

    // Register listener on mount
    useState(() => {
        listeners.add(handleBurst);
        return () => {
            listeners.delete(handleBurst);
        };
    });

    return (
        <>
            {bursts.map(burst => (
                <EatingBurst
                    key={burst.id}
                    position={burst.position}
                    onComplete={() => removeBurst(burst.id)}
                />
            ))}
        </>
    );
};
