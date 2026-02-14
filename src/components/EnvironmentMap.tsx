import { useLoader } from '@react-three/fiber';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { Environment } from '@react-three/drei';
import { EquirectangularReflectionMapping } from 'three';
import { useEffect } from 'react';

export const EnvironmentMap = () => {
    // studio_small_03_1k.hdr is the asset for 'studio' preset
    // Using direct URL with RGBELoader to avoid deprecated preset loaders in drei
    const texture = useLoader(
        RGBELoader,
        'https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/studio_small_03_1k.hdr'
    );

    useEffect(() => {
        texture.mapping = EquirectangularReflectionMapping;
    }, [texture]);

    return <Environment map={texture} background={true} />;
};
