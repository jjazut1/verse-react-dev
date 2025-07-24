import React from 'react';
import { Box } from '@chakra-ui/react';
import { SpinnerWheelItem, ZoomTarget, ParsedTextNode } from './types';
import { parseHTML, getContrastingTextColor } from './utils';

interface WheelRendererProps {
  items: SpinnerWheelItem[];
  rotation: number;
  isZoomed: boolean;
  zoomTarget: ZoomTarget;
  spinning: boolean;
  wheelSize?: number; // Add optional wheelSize prop
}

export const WheelRenderer: React.FC<WheelRendererProps> = ({
  items,
  rotation,
  isZoomed,
  zoomTarget,
  spinning,
  wheelSize = 480 // Default to original size
}) => {
  // Calculate responsive dimensions based on wheelSize
  const scale = wheelSize / 480; // Scale factor relative to original 480px
  const radius = 220 * scale;
  const center = wheelSize / 2; // Center point should be half of total size
  const angle = 360 / items.length;
  
  // Scale other dimensions proportionally
  const centerCircleRadius = 20 * scale;
  const centerDotRadius = 12 * scale;
  const pointerOffset = 14 * scale; // How far pointer extends beyond wheel edge
  const fontSize = Math.max(12, 18 * scale); // Min font size of 12px, scaled from 18px

  const renderRichTextSVG = (htmlContent: string, x: number, y: number, transform: string, textColor: string, scaledFontSize: number = fontSize) => {
    const parsedNodes = parseHTML(htmlContent);
    
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={scaledFontSize}
        fontWeight="normal"
        fontFamily="'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fill={textColor}
        transform={transform}
      >
        {parsedNodes.map((segment, index) => {
          const style: any = {};
          let fontWeight = 'normal';
          let fontStyle = 'normal';
          let fontFamily = "'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
          
          if (segment.bold) fontWeight = 'bold';
          if (segment.italic) {
            fontStyle = 'italic';
            style.fontStyle = 'italic';
            fontFamily = "Arial, Helvetica, sans-serif";
          }
          if (segment.underline) style.textDecoration = 'underline';
          
          let segmentFontSize = scaledFontSize;
          let dy = 0;
          
          const prevSegment = index > 0 ? parsedNodes[index - 1] : null;
          const wasScript = prevSegment && (prevSegment.superscript || prevSegment.subscript);
          
          if (segment.superscript) {
            segmentFontSize = scaledFontSize * 0.75;
            dy = wasScript ? (-scaledFontSize * 0.3) - (scaledFontSize * 0.2) : -scaledFontSize * 0.3;
          } else if (segment.subscript) {
            segmentFontSize = scaledFontSize * 0.75;
            dy = wasScript ? (scaledFontSize * 0.2) + (scaledFontSize * 0.3) : scaledFontSize * 0.2;
          } else if (wasScript) {
            dy = prevSegment.superscript ? scaledFontSize * 0.3 : -scaledFontSize * 0.2;
          }
          
          return (
            <tspan
              key={index}
              fontSize={segmentFontSize}
              fontWeight={fontWeight}
              fontStyle={fontStyle}
              fontFamily={fontFamily}
              dy={dy}
              style={style}
            >
              {segment.text}
            </tspan>
          );
        })}
      </text>
    );
  };

  const renderWheel = () => {
    if (items.length === 0) return null;

    console.log('🎨 [WheelRenderer] Rendering items:', items);
    console.log('🎨 [WheelRenderer] Wheel size:', wheelSize, 'Scale:', scale);

    // Calculate zoom transform - center the graphic in viewport
    const zoomScale = isZoomed ? 2.4 : 1;
    
    // When zoomed, center the wheel in the viewport
    let zoomTranslateX = 0;
    let zoomTranslateY = 0;
    
    if (isZoomed) {
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Account for PWA header and control buttons space
      const headerHeight = 60;
      const controlButtonsHeight = 140; // Increased to account for more spacing between buttons
      const totalTopOffset = headerHeight + controlButtonsHeight;
      const availableHeight = viewportHeight - totalTopOffset;
      
      // Position graphic up and to the right as requested
      // Instead of centering, offset the position
      const horizontalOffset = viewportWidth * 0.12; // Move 12% to the right from center
      const verticalOffset = availableHeight * 0.3; // Increased from 0.15 to 0.3 - move up 30% from center
      
      const targetX = (viewportWidth / 2) + horizontalOffset; // Right of center
      const targetY = totalTopOffset + (availableHeight / 2) - verticalOffset; // Up from center
      
      // Account for zoom scale in translation
      zoomTranslateX = (targetX - center) / zoomScale;
      zoomTranslateY = (targetY - center) / zoomScale;
      
      console.log('🎯 [Zoom Position] Up and right positioning:', {
        viewportWidth,
        viewportHeight,
        headerHeight,
        controlButtonsHeight,
        totalTopOffset,
        availableHeight,
        horizontalOffset,
        verticalOffset,
        wheelCenter: center,
        targetX,
        targetY,
        zoomScale,
        translateX: zoomTranslateX.toFixed(2),
        translateY: zoomTranslateY.toFixed(2)
      });
    }

    return (
      <Box 
        position="relative" 
        width={`${wheelSize}px`}
        height={`${wheelSize}px`}
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        mx="auto"
        overflow="visible"
        style={{
          transform: `scale(${zoomScale}) translate(${zoomTranslateX}px, ${zoomTranslateY}px)`,
          transition: isZoomed ? 'transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'transform 0.6s ease-out'
        }}
      >
        <svg 
          width={wheelSize}
          height={wheelSize}
          style={{ 
            transition: spinning ? 'none' : 'transform 0.3s ease',
            transform: `rotate(${rotation}deg)`
          }}
        >
          <g>
            {items.map((item, i) => {
              const startAngle = angle * i;
              const endAngle = startAngle + angle;
              const largeArc = angle > 180 ? 1 : 0;
              
              const x1 = center + radius * Math.cos((Math.PI * startAngle) / 180);
              const y1 = center + radius * Math.sin((Math.PI * startAngle) / 180);
              const x2 = center + radius * Math.cos((Math.PI * endAngle) / 180);
              const y2 = center + radius * Math.sin((Math.PI * endAngle) / 180);
              
              const path = `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc} 1 ${x2},${y2} Z`;
              
              // Text position
              const textAngle = startAngle + angle / 2;
              const textRadius = radius * 0.7;
              const textX = center + textRadius * Math.cos((Math.PI * textAngle) / 180);
              const textY = center + textRadius * Math.sin((Math.PI * textAngle) / 180);
              
              // Text transform - readable at 9 o'clock position
              const transformText = `rotate(${textAngle + 180}, ${textX}, ${textY})`;
              
              // Check if this is the winning segment for special highlighting
              const isWinningSegment = isZoomed && i === zoomTarget.segmentIndex;
              
              // Calculate contrasting text color based on background color
              const textColor = getContrastingTextColor(item.color);
              
              // Adjust text length based on wheel size
              const maxTextLength = wheelSize < 320 ? 8 : wheelSize < 400 ? 10 : 12;
              
              return (
                <g key={item.id}>
                  <path
                    d={path}
                    fill={item.color}
                    stroke={isWinningSegment ? "#FFD700" : "#fff"}
                    strokeWidth={isWinningSegment ? Math.max(2, 4 * scale) : Math.max(1, 2 * scale)}
                    filter={isWinningSegment ? "drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))" : "none"}
                  />
                  {item.content ? (
                    renderRichTextSVG(item.content, textX, textY, transformText, textColor, fontSize)
                  ) : (
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={fontSize}
                      fontWeight="normal"
                      fontFamily="'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                      fill={textColor}
                      transform={transformText}
                    >
                      {item.text.length > maxTextLength ? item.text.substring(0, maxTextLength) + '...' : item.text}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
          
          {/* Center circle */}
          <circle cx={center} cy={center} r={centerCircleRadius} fill="#9CA3AF" />
          <circle cx={center} cy={center} r={centerDotRadius} fill="#fff" />
        </svg>
        
        {/* Responsive Pointer - scales with wheel size */}
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform={`translate(${-radius - pointerOffset}px, ${-20 * scale}px)`}
          zIndex={10}
        >
          <Box
            transformOrigin={`${12.5 * scale}px ${40 * scale}px`}
            sx={{
              animation: spinning ? 'pointerBounce 0.1s ease-in-out infinite alternate' : 'none',
              '@keyframes pointerBounce': {
                '0%': { transform: 'rotate(86deg)' },
                '100%': { transform: 'rotate(90deg)' }
              },
              transform: spinning ? undefined : 'rotate(90deg)'
            }}
          >
            <svg width={25 * scale} height={50 * scale} viewBox="0 0 25 50">
              {/* Main teardrop body */}
              <path 
                d="M12.5 45 C6 45, 2 37, 2 28 C2 18, 8 8, 12.5 8 C17 8, 23 18, 23 28 C23 37, 19 45, 12.5 45 Z" 
                fill="#E2E8F0"
                stroke="#2D3748"
                strokeWidth="1"
              />
              
              {/* Highlight for 3D effect */}
              <path 
                d="M12.5 10 C9 10, 5 18, 5 28 C5 35, 8 42, 12.5 42 C17 42, 20 35, 20 28 C20 18, 16 10, 12.5 10 Z" 
                fill="#F7FAFC"
              />
              
              {/* Center hole */}
              <circle cx="12.5" cy="40" r="3" fill="#2D3748" />
            </svg>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box 
      position="relative" 
      display="flex" 
      justifyContent="center" 
      alignItems="center"
      overflow="visible" // Always allow overflow for proper zoom display
      transition="all 0.3s ease"
      w="100%"
      maxW={isZoomed ? "none" : `${wheelSize}px`} // Remove width constraints when zoomed
      mx="auto"
      // Ensure proper z-index layering when zoomed
      zIndex={isZoomed ? 1000 : 1}
    >
      {renderWheel()}
    </Box>
  );
}; 