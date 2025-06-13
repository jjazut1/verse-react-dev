import { ColorTheme, SpinnerWheelItem, ParsedTextNode } from './types';

// Color themes for the spinner wheel
export const colorThemes: ColorTheme = {
  primaryColors: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
  pastel: ['#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF', '#E1BAFF', '#FFBADB', '#C9BAFF'],
  bright: ['#FF0000', '#FF8800', '#FFFF00', '#88FF00', '#00FF00', '#00FF88', '#00FFFF', '#0088FF'],
  patriotic: ['#DC143C', '#FFFFFF', '#000080', '#FF0000', '#87CEEB', '#4169E1', '#C0C0C0', '#191970'],
  greenShades: ['#90EE90', '#32CD32', '#228B22', '#006400', '#2E8B57', '#6B8E23', '#00FF7F', '#ADFF2F'],
  desert: ['#F4A460', '#D2B48C', '#F5F5DC', '#A0522D', '#B7410E', '#FF8C00', '#E2725B', '#C3B091'],
  ocean: ['#ADD8E6', '#87CEEB', '#00BFFF', '#40E0D0', '#008080', '#00FFFF', '#4682B4'],
  sunset: ['#FFC0CB', '#FF7F50', '#FFA500', '#FFD700', '#FFFF00', '#FF6347', '#DDA0DD', '#E6E6FA'],
  custom: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
};

// Helper function to calculate segment center angle - ensures consistency
export const getSegmentCenterAngle = (segmentIndex: number, totalSegments: number): number => {
  const degreesPerSlice = 360 / totalSegments;
  return segmentIndex * degreesPerSlice + degreesPerSlice / 2;
};

// Helper function to determine which segment is at the pointer position
export const getSegmentAtPointer = (currentRotation: number, currentItems: SpinnerWheelItem[]): number => {
  console.log('=== POINTER DETECTION ===');
  console.log(`Current rotation: ${currentRotation.toFixed(1)}°`);
  console.log(`Looking for segment closest to 180° (9 o'clock pointer)`);
  console.log(`Using ${currentItems.length} segments for detection`);
  
  // Find the segment whose center is closest to the pointer
  let closestIndex = 0;
  let minDistance = 360;
  
  for (let i = 0; i < currentItems.length; i++) {
    // Use the same calculation as the alignment calculation
    const segmentCenter = getSegmentCenterAngle(i, currentItems.length);
    const segmentCenterAfterRotation = (segmentCenter + currentRotation) % 360;
    
    // Calculate distance to pointer (handling wrap-around)
    const distance = Math.min(
      Math.abs(segmentCenterAfterRotation - 180),
      360 - Math.abs(segmentCenterAfterRotation - 180)
    );
    
    console.log(`${i}: "${currentItems[i]?.text}" - base center: ${segmentCenter.toFixed(1)}°, after rotation: ${segmentCenterAfterRotation.toFixed(1)}°, distance to 180°: ${distance.toFixed(1)}°`);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestIndex = i;
    }
  }
  
  console.log(`Closest segment: "${currentItems[closestIndex]?.text}" (index ${closestIndex}) with distance ${minDistance.toFixed(1)}°`);
  console.log('========================');
  
  return closestIndex;
};

// Get item colors based on theme
export const getItemColors = (items: SpinnerWheelItem[], theme: string = 'primaryColors', customColors?: string[]): SpinnerWheelItem[] => {
  const themeColors = theme === 'custom' && customColors ? customColors : colorThemes[theme as keyof ColorTheme];
  return items.map((item, index) => ({
    ...item,
    color: themeColors[index % themeColors.length]
  }));
};

// Calculate zoom target for winner segment - always focus on 9 o'clock position
export const calculateZoomTarget = (segmentIndex: number): { x: number; y: number; segmentIndex: number } => {
  const radius = 220;
  const center = 240;
  
  // Always focus on 9 o'clock position (180 degrees) where the winning segment lands
  // This is where our pointer is positioned and where the winning segment stops
  const targetX = center - (radius * 0.5); // 9 o'clock position (left side)
  const targetY = center; // Center vertically
  
  return { x: targetX, y: targetY, segmentIndex };
};

// Parse HTML content for rich text rendering
export const parseHTML = (html: string): ParsedTextNode[] => {
  const result: ParsedTextNode[] = [];
  
  const processNode = (node: Node, formatting: any = {}) => {
    if (node.nodeType === 3) { // Text node
      const text = node.textContent || '';
      if (text.trim()) {
        result.push({ text, ...formatting });
      }
    } else if (node.nodeType === 1) { // Element node
      const element = node as Element;
      const newFormatting = { ...formatting };
      
      switch (element.tagName?.toLowerCase()) {
        case 'b':
        case 'strong':
          newFormatting.bold = true;
          break;
        case 'i':
        case 'em':
          newFormatting.italic = true;
          break;
        case 'u':
          newFormatting.underline = true;
          break;
        case 'sup':
          newFormatting.superscript = true;
          break;
        case 'sub':
          newFormatting.subscript = true;
          break;
      }
      
      for (const child of Array.from(element.childNodes)) {
        processNode(child, newFormatting);
      }
    }
  };
  
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    for (const child of Array.from(doc.body.childNodes)) {
      processNode(child);
    }
  } catch (error) {
    console.error('Error parsing HTML:', error);
    result.push({ text: html });
  }
  
  return result;
}; 