import React from 'react';

interface AutoRecordingSettingsProps {
  minDistance: number;
  minTime: number;
  onSettingsChange: (settings: { minDistance: number; minTime: number }) => void;
  disabled: boolean;
}

export const AutoRecordingSettings: React.FC<AutoRecordingSettingsProps> = ({
  minDistance,
  minTime,
  onSettingsChange,
  disabled
}) => {
  return (
    <div className="auto-settings">
      <label>
        Min Distance (m):
        <input
          type="number"
          value={minDistance}
          onChange={(e) => onSettingsChange({ 
            minDistance: Number(e.target.value), 
            minTime 
          })}
          min="1"
          disabled={disabled}
        />
      </label>
      <label>
        Min Time (s):
        <input
          type="number"
          value={minTime}
          onChange={(e) => onSettingsChange({ 
            minDistance, 
            minTime: Number(e.target.value) 
          })}
          min="1"
          disabled={disabled}
        />
      </label>
    </div>
  );
};
