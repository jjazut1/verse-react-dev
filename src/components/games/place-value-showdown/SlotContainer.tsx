import React from 'react';
import { SlotContainerProps } from './types';
import { getPlaceValueLabel } from './utils';

/**
 * Container for individual number slots with optional place value labels and comma separators
 */
export const SlotContainer: React.FC<SlotContainerProps> = ({
  children,
  showPlaceValueLabels,
  slotIndex,
  totalSlots,
  hasComma,
  config
}) => (
  <>
    <div className="slot-container">
      {children}
      {showPlaceValueLabels && (
        <div className="place-value-label">
          {getPlaceValueLabel(slotIndex, totalSlots, config)}
        </div>
      )}
    </div>
    {hasComma && <div className="comma-separator">,</div>}
  </>
); 