import { Box, Text, VStack, useBreakpointValue } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import React from 'react';

// Rich text rendering component (same as in other components)
const RichText: React.FC<{ content: string; fontSize: any }> = ({ content, fontSize }) => {
  // Check if this is rich text (contains HTML tags)
  const isRichText = typeof content === 'string' && content.includes('<');
  
  if (!isRichText) {
    // Plain text
    return (
      <Text
        fontSize={fontSize}
        color="gray.800"
        fontWeight="medium"
        textAlign="center"
        px={2}
        py={0.5}
        bg="rgba(255,255,255,0.9)"
        borderRadius="md"
        maxW="100%"
        whiteSpace="normal"
        wordBreak="break-word"
        boxShadow="sm"
        fontFamily="'Comic Neue', sans-serif"
      >
        {content}
      </Text>
    );
  }
  
  // Rich text - parse HTML and render with styling
  const parseRichText = (htmlContent: string) => {
    // Detect formatting styles
    const textStyles = {
      bold: htmlContent.includes('<strong>') || htmlContent.includes('<b>'),
      italic: htmlContent.includes('<em>') || htmlContent.includes('<i>'),
      underline: htmlContent.includes('<u>') && htmlContent.includes('</u>'),
      superscript: htmlContent.includes('<sup>') && htmlContent.includes('</sup>'),
      subscript: htmlContent.includes('<sub>') && htmlContent.includes('</sub>')
    };
    
    // Extract plain text for simple formatting
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    let displayText = tempDiv.textContent || tempDiv.innerText || htmlContent;
    
    // For super/subscript, we need special handling
    if (textStyles.superscript || textStyles.subscript) {
      // Parse super/subscript text
      let beforeScript = '';
      let scriptText = '';
      let afterScript = '';
      
      if (textStyles.superscript) {
        const supMatch = htmlContent.match(/^(.*?)<sup>(.*?)<\/sup>(.*)$/);
        if (supMatch) {
          beforeScript = supMatch[1].replace(/<[^>]*>/g, '');
          scriptText = supMatch[2];
          afterScript = supMatch[3].replace(/<[^>]*>/g, '');
        }
      } else if (textStyles.subscript) {
        const subMatch = htmlContent.match(/^(.*?)<sub>(.*?)<\/sub>(.*)$/);
        if (subMatch) {
          beforeScript = subMatch[1].replace(/<[^>]*>/g, '');
          scriptText = subMatch[2];
          afterScript = subMatch[3].replace(/<[^>]*>/g, '');
        }
      }
      
      // Render with scripts
      return (
        <Text
          fontSize={fontSize}
          color="gray.800"
          fontWeight={textStyles.bold ? "bold" : "medium"}
          fontStyle={textStyles.italic ? "italic" : "normal"}
          textDecoration={textStyles.underline ? "underline" : "none"}
          textAlign="center"
          px={2}
          py={0.5}
          bg="rgba(255,255,255,0.9)"
          borderRadius="md"
          maxW="100%"
          whiteSpace="normal"
          wordBreak="break-word"
          boxShadow="sm"
          fontFamily="'Comic Neue', sans-serif"
          display="inline-flex"
          alignItems="baseline"
        >
          {beforeScript}
          <Text
            as="span"
            fontSize="0.7em"
            verticalAlign={textStyles.superscript ? "super" : "sub"}
            lineHeight="1"
          >
            {scriptText}
          </Text>
          {afterScript}
        </Text>
      );
    }
    
    // Regular formatting (bold, italic, underline)
    return (
      <Text
        fontSize={fontSize}
        color="gray.800"
        fontWeight={textStyles.bold ? "bold" : "medium"}
        fontStyle={textStyles.italic ? "italic" : "normal"}
        textDecoration={textStyles.underline ? "underline" : "none"}
        textAlign="center"
        px={2}
        py={0.5}
        bg="rgba(255,255,255,0.9)"
        borderRadius="md"
        maxW="100%"
        whiteSpace="normal"
        wordBreak="break-word"
        boxShadow="sm"
        fontFamily="'Comic Neue', sans-serif"
      >
        {displayText}
      </Text>
    );
  };
  
  return parseRichText(content);
};

interface BasketProps {
  category: {
    name: string;
  };
  items: string[];
  onClick: () => void;
}

const Basket: React.FC<BasketProps> = ({ category, items, onClick }) => {
  // Enhanced responsive values for landscape support while maintaining drag/drop functionality
  const titleSize = useBreakpointValue({ base: "xs", md: "sm", lg: "md" });
  const itemSize = useBreakpointValue({ base: "2xs", md: "xs", lg: "sm" });
  const basketHeight = useBreakpointValue({ 
    base: "60px", 
    md: "70px", 
    lg: "80px",
    xl: "90px"
  });
  
  return (
    <VStack 
      spacing={1} // Moderate spacing for functionality
      align="center" 
      className="basket" 
      data-basket-id={category.name}
      position="relative"
    >
      <Text 
        fontSize={titleSize}
        fontWeight="bold"
        color="gray.700"
        textAlign="center"
        mb={1}
        position="absolute"
        top="-22px" // Positioned above basket for space efficiency
        left="50%"
        transform="translateX(-50%)"
        whiteSpace="nowrap"
        fontFamily="'Comic Neue', sans-serif"
        maxWidth="140px" // Limit text width
        overflow="hidden"
        textOverflow="ellipsis"
      >
        {category.name}
      </Text>
      
      <Box
        as={motion.div}
        whileHover={{ scale: 1.02 }}
        position="relative"
        width="100%"
        height={basketHeight}
        cursor="pointer"
        onClick={onClick}
        sx={{
          position: 'relative',
          borderRadius: '35% 35% 40% 40% / 30% 30% 70% 70%',
          background: 'linear-gradient(180deg, #E3B778 0%, #D4A76A 100%)',
          overflow: 'visible',
          transform: 'perspective(1000px) rotateX(15deg)',
          transformOrigin: 'bottom',
          boxShadow: `
            inset 0 5px 10px rgba(255,255,255,0.3),
            inset 0 -10px 20px rgba(139, 69, 19, 0.3),
            0 5px 15px rgba(0,0,0,0.1)
          `,
          transition: 'all 0.3s ease',
          
          // Weave pattern
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 5px,
                rgba(139, 69, 19, 0.1) 5px,
                rgba(139, 69, 19, 0.1) 10px
              )
            `,
            borderRadius: 'inherit',
            opacity: 0.5,
          }
        }}
      >
        {/* Items in basket - wrap horizontally so all items are visible */}
        <Box
          display="flex"
          flexWrap="wrap"
          alignContent="flex-start"
          justifyContent="center"
          gap={1}
          height="100%"
          pt={1.5}
          pb={0.5}
          px={1.5}
          overflow="hidden"
        >
          {items.map((item, index) => (
            <Box key={index} mr={1} mb={1}>
              <RichText content={item} fontSize={itemSize} />
            </Box>
          ))}
        </Box>
      </Box>
    </VStack>
  );
};

export default Basket; 