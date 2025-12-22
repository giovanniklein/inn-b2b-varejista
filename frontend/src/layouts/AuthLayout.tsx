import { Box, Container, Flex, Heading, Text, useColorModeValue } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  const bg = useColorModeValue('gray.50', 'gray.900');

  return (
    <Flex minH="100vh" bg={bg} align="center" justify="center" px={4}>
      <Container maxW="lg">
        <Box textAlign="center" mb={8}>
          <Heading size="lg" mb={2}>
            PINN B2B - Varejista
          </Heading>
          <Text color="gray.500">Portal do varejista para compras em múltiplos atacadistas.</Text>
        </Box>
        <Outlet />
      </Container>
    </Flex>
  );
}
