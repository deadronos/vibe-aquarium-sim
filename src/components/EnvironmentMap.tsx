import { Environment } from '@react-three/drei';
import { ART_DIRECTION_LIGHTING } from '../config/artDirection';

export const EnvironmentMap = () => {
  return (
    <Environment
      preset="apartment"
      background={false}
      environmentIntensity={ART_DIRECTION_LIGHTING.environmentIntensity}
    />
  );
};
