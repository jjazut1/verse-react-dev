import React from 'react';
import { Box, Container, Flex, HStack, Image, Link, Text } from '@chakra-ui/react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Box as="footer" bg="gray.50" borderTop="1px solid" borderColor="gray.200" mt={8} py={3} width="100%">
      <Container maxW="6xl">
        <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
          <Text fontSize="sm" color="gray.600">© {currentYear} Lumino Learning</Text>

          <HStack spacing={3} align="center">
            <Text fontSize="sm" color="gray.600">Resources:</Text>
            <Link href="https://www.rlanddc.com/" isExternal display="inline-flex" alignItems="center">
              <HStack spacing={2}>
                <Image src="https://www.rlanddc.com/favicon.ico" alt="Reading Lab and Dyslexia Center" boxSize="16px" />
                <Text fontSize="sm" color="blue.600" fontWeight="medium">Reading Lab and Dyslexia Center</Text>
              </HStack>
            </Link>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
};

export default Footer;



