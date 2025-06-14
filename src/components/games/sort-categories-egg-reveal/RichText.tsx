import React from 'react';
import { Text } from '@chakra-ui/react';
import { RichTextProps } from './types';

const RichText: React.FC<RichTextProps> = ({ content, fontSize, noPadding = false }) => {
  // Check if this is rich text (contains HTML tags)
  const isRichText = typeof content === 'string' && content.includes('<');
  
  if (!isRichText) {
    // Plain text
    return (
      <Text
        fontSize={fontSize}
        color="gray.700"
        letterSpacing="0.5px"
        fontWeight="medium"
        px={noPadding ? 0 : 2}
        py={noPadding ? 0 : 1}
        borderRadius="md"
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
          color="gray.700"
          letterSpacing="0.5px"
          fontWeight={textStyles.bold ? "bold" : "medium"}
          fontStyle={textStyles.italic ? "italic" : "normal"}
          textDecoration={textStyles.underline ? "underline" : "none"}
          px={noPadding ? 0 : 2}
          py={noPadding ? 0 : 1}
          borderRadius="md"
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
        color="gray.700"
        letterSpacing="0.5px"
        fontWeight={textStyles.bold ? "bold" : "medium"}
        fontStyle={textStyles.italic ? "italic" : "normal"}
        textDecoration={textStyles.underline ? "underline" : "none"}
        px={noPadding ? 0 : 2}
        py={noPadding ? 0 : 1}
        borderRadius="md"
        fontFamily="'Comic Neue', sans-serif"
      >
        {displayText}
      </Text>
    );
  };
  
  return parseRichText(content);
};

export default RichText; 