import React from 'react';
import { Box } from '@chakra-ui/react';
import { SpinnerWheelItem, ZoomTarget, ParsedTextNode } from './types';
import { parseHTML } from './utils';

interface WheelRendererProps {
  items: SpinnerWheelItem[];
  rotation: number;
  isZoomed: boolean;
  zoomTarget: ZoomTarget;
  spinning: boolean;
}

export const WheelRenderer: React.FC<WheelRendererProps> = ({
  items,
  rotation,
  isZoomed,
  zoomTarget,
  spinning
}) => {
  const radius = 220; // Match original
  const center = 240; // Match original
  const angle = 360 / items.length;

  const renderRichTextSVG = (htmlContent: string, x: number, y: number, transform: string, fontSize: number = 18) => {
    const parsedNodes = parseHTML(htmlContent);
    
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={fontSize}
        fontWeight="normal"
        fontFamily="'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fill="#333"
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
          
          let segmentFontSize = fontSize;
          let dy = 0;
          
          const prevSegment = index > 0 ? parsedNodes[index - 1] : null;
          const wasScript = prevSegment && (prevSegment.superscript || prevSegment.subscript);
          
          if (segment.superscript) {
            segmentFontSize = fontSize * 0.75;
            dy = wasScript ? (-fontSize * 0.3) - (fontSize * 0.2) : -fontSize * 0.3;
          } else if (segment.subscript) {
            segmentFontSize = fontSize * 0.75;
            dy = wasScript ? (fontSize * 0.2) + (fontSize * 0.3) : fontSize * 0.2;
          } else if (wasScript) {
            dy = prevSegment.superscript ? fontSize * 0.3 : -fontSize * 0.2;
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

    // Calculate zoom transform - match original scaling
    const zoomScale = isZoomed ? 2.4 : 1;
    const zoomTranslateX = isZoomed ? (240 - zoomTarget.x) : 0;
    const zoomTranslateY = isZoomed ? (240 - zoomTarget.y) : 0;

    return (
      <Box 
        position="relative" 
        width="480px" 
        height="480px"
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
          width={480}
          height={480}
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
              
              return (
                <g key={item.id}>
                  <path
                    d={path}
                    fill={item.color}
                    stroke={isWinningSegment ? "#FFD700" : "#fff"}
                    strokeWidth={isWinningSegment ? "4" : "2"}
                    filter={isWinningSegment ? "drop-shadow(0 0 10px rgba(255, 215, 0, 0.8))" : "none"}
                  />
                  {item.content ? (
                    renderRichTextSVG(item.content, textX, textY, transformText, 18)
                  ) : (
                    <text
                      x={textX}
                      y={textY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="18"
                      fontWeight="normal"
                      fontFamily="'Comic Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
                      fill="#333"
                      transform={transformText}
                    >
                      {item.text.length > 10 ? item.text.substring(0, 10) + '...' : item.text}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
          
          {/* Center circle */}
          <circle cx={center} cy={center} r={20} fill="#9CA3AF" />
          <circle cx={center} cy={center} r={12} fill="#fff" />
        </svg>
        
        {/* Pointer - realistic teardrop pin that just touches the wheel edge */}
        <Box
          position="absolute"
          top="50%"
          left="50%"
          transform="translate(-254px, -40px)"
          zIndex={10}
        >
          <Box
            transformOrigin="12.5px 40px"
            sx={{
              animation: spinning ? 'pointerBounce 0.1s ease-in-out infinite alternate' : 'none',
              '@keyframes pointerBounce': {
                '0%': { transform: 'rotate(86deg)' },
                '100%': { transform: 'rotate(90deg)' }
              },
              transform: spinning ? undefined : 'rotate(90deg)'
            }}
          >
            <svg width="25" height="50" viewBox="0 0 25 50">
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
      overflow={isZoomed ? "hidden" : "visible"}
      transition="all 0.3s ease"
    >
      {renderWheel()}
    </Box>
  );
}; 