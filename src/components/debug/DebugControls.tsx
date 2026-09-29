import { useQualityStore } from '../../performance/qualityStore';

type DebugControlsProps = {
  onAddFish: (n: number) => void;
  onDownloadTrace: () => void;
};

export const DebugControls = ({ onAddFish, onDownloadTrace }: DebugControlsProps) => (
  <>
    <div className="controls">
      <button onClick={() => onAddFish(100)}>+100 fish</button>
      <button onClick={() => onAddFish(300)}>+300 fish</button>
      <button onClick={onDownloadTrace}>Download trace</button>
    </div>

    <div className="toggles">
      <label>
        <input
          type="checkbox"
          checked={!!useQualityStore.getState().settings.adaptiveInstanceUpdatesEnabled}
          onChange={() => {
            const cur = useQualityStore.getState();
            useQualityStore.setState({
              settings: {
                ...cur.settings,
                adaptiveInstanceUpdatesEnabled: !cur.settings.adaptiveInstanceUpdatesEnabled,
              },
            });
          }}
        />
        Adaptive Instance Updates
      </label>

      <label className="right">
        <input
          type="checkbox"
          checked={!!useQualityStore.getState().settings.adaptiveSchedulerEnabled}
          onChange={() => {
            const cur = useQualityStore.getState();
            useQualityStore.setState({
              settings: {
                ...cur.settings,
                adaptiveSchedulerEnabled: !cur.settings.adaptiveSchedulerEnabled,
              },
            });
          }}
        />
        Adaptive Scheduler
      </label>

      <div className="budget">
        <label>
          Instance budget:
          <input
            type="number"
            defaultValue={useQualityStore.getState().instanceUpdateBudget}
            min={8}
            max={4096}
            step={8}
            onBlur={(e) => {
              const v = Number(e.currentTarget.value) || 128;
              useQualityStore.getState().setInstanceUpdateBudget(v);
            }}
          />
        </label>
      </div>
    </div>
  </>
);
