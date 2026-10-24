import { useMemo } from 'react';
import { ALGAE_VISIBLE, algaeLevel, fishNames } from '../sim/care';
import { SPECIES } from '../sim/species';
import { useAquarium } from '../state/store';

/** Species label for each school index; species are contiguous in the school. */
const SPECIES_OF = SPECIES.flatMap((s) => Array.from({ length: s.count }, () => s.label));

/**
 * The tank's small care actions: tap the glass, and wipe it once algae shows. They sit above the
 * control bar so the phone bar keeps its two rows.
 */
export const CareActions = () => {
  const dirty = useAquarium((s) => algaeLevel(s.care, s.careNow) >= ALGAE_VISIBLE);
  const requestTap = useAquarium((s) => s.requestTap);
  const wipeGlass = useAquarium((s) => s.wipeGlass);
  return (
    <div className="hud__care" role="group" aria-label="Tank care">
      <button className="button hud__chip" onClick={requestTap} title="Tap the glass (T)">
        Tap the glass
      </button>
      {dirty && (
        <button className="button hud__chip" onClick={wipeGlass} title="Wipe the glass (W)">
          Wipe the glass
        </button>
      )}
    </div>
  );
};

/** In Follow mode: who the camera is on, or the fish under the pointer. */
export const FishName = () => {
  const followed = useAquarium((s) => (s.viewpoint === 'follow' ? s.followedFish : null));
  const hovered = useAquarium((s) => (s.viewpoint === 'follow' ? s.hoveredFish : null));
  const nameSeed = useAquarium((s) => s.care.nameSeed);
  const names = useMemo(
    () => fishNames({ version: 1, since: 0, wipedAt: 0, nameSeed }, SPECIES_OF.length),
    [nameSeed]
  );
  const index = hovered ?? followed;
  if (index === null) return null;
  const text = `${names[index]} the ${SPECIES_OF[index]!.toLowerCase()}`;
  return (
    <p className="hud__fish-name" role="status">
      {hovered !== null && hovered !== followed ? text : `Following ${text}`}
    </p>
  );
};
