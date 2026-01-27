import { useLoader } from '@react-three/fiber';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader';
import { Environment } from '@react-three/drei';

export const EnvironmentMap = () => {
    // studio_small_03_1k.hdr is the asset for 'studio' preset
    // Using direct URL to pass to HDRLoader, avoiding deprecated RGBELoader in drei
    const texture = useLoader(HDRLoader, 'https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/studio_small_03_1k.hdr');

    return <Environment map={texture} background={true} />;
};
