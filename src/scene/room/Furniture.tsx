import { Bookshelf } from './furniture/Bookshelf';
import { Cabinet } from './furniture/Cabinet';
import { CoffeeTable } from './furniture/CoffeeTable';
import { FloorLamp } from './furniture/FloorLamp';
import { useMaterials } from './furniture/materials';
import { PottedPlant } from './furniture/PottedPlant';
import { Rug } from './furniture/Rug';
import { Sofa } from './furniture/Sofa';
import { WallArt } from './furniture/WallArt';

export const Furniture = () => {
  const m = useMaterials();
  return (
    <>
      <Cabinet m={m} />
      <Sofa m={m} />
      <CoffeeTable m={m} />
      <Rug />
      <FloorLamp m={m} />
      <PottedPlant m={m} />
      <Bookshelf m={m} />
      <WallArt />
    </>
  );
};
