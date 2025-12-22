import { ReactNode } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Link as ChakraLink,
  Spacer,
  Text,
  useColorMode,
  useColorModeValue,
  Wrap,
  WrapItem,
} from '@chakra-ui/react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';

import { useAuthStore } from '../store/authStore';

interface NavLinkProps {
  to: string;
  children: ReactNode;
}

function NavLink({ to, children }: NavLinkProps) {
  const location = useLocation();
  const isActive = location.pathname === to;
  const color = useColorModeValue('teal.600', 'teal.200');

  return (
    <ChakraLink
      as={Link}
      to={to}
      px={{ base: 2, md: 3 }}
      py={{ base: 1, md: 2 }}
      rounded="md"
      fontWeight={isActive ? 'bold' : 'medium'}
      color={isActive ? color : undefined}
      fontSize={{ base: 'sm', md: 'md' }}
      whiteSpace="nowrap"
      _hover={{ textDecoration: 'none', bg: useColorModeValue('gray.100', 'gray.700') }}
    >
      {children}
    </ChakraLink>
  );
}

export function MainLayout() {
  const { colorMode, toggleColorMode } = useColorMode();
  const bg = useColorModeValue('gray.50', 'gray.900');
  const headerBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const navigate = useNavigate();
  const { clearSession, user, varejistaNomeFantasia } = useAuthStore();

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  return (
    <Flex direction="column" minH="100vh" bg={bg}>
      <Box
        as="header"
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={headerBg}
        px={{ base: 4, md: 6 }}
        py={{ base: 3, md: 3 }}
      >
        <Flex
          align={{ base: 'flex-start', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          gap={{ base: 3, md: 0 }}
        >
          <Box>
            <Heading size={{ base: 'sm', md: 'md' }}>PINN B2B - Varejista</Heading>
            <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.500">
              {varejistaNomeFantasia ?? 'Portal do varejista'}
            </Text>
          </Box>

          <Wrap
            spacing={{ base: 1, md: 3 }}
            ml={{ base: 0, md: 10 }}
            as="nav"
            w={{ base: 'full', md: 'auto' }}
            shouldWrapChildren
            py={{ base: 1, md: 0 }}
          >
            <WrapItem>
              <NavLink to="/dashboard">Dashboard</NavLink>
            </WrapItem>
            <WrapItem>
              <NavLink to="/produtos">Produtos</NavLink>
            </WrapItem>
            <WrapItem>
              <NavLink to="/enderecos">Enderecos</NavLink>
            </WrapItem>
            <WrapItem>
              <NavLink to="/carrinho">Carrinho</NavLink>
            </WrapItem>
            <WrapItem>
              <NavLink to="/pedidos">Pedidos</NavLink>
            </WrapItem>
          </Wrap>

          <Spacer display={{ base: 'none', md: 'block' }} />

          <Flex
            w={{ base: 'full', md: 'auto' }}
            justify={{ base: 'space-between', md: 'flex-end' }}
            align="center"
            gap={{ base: 2, md: 3 }}
            mt={{ base: 1, md: 0 }}
          >
            {user && (
              <Box textAlign="left">
                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                  {user.nome}
                </Text>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  noOfLines={1}
                  display={{ base: 'none', md: 'block' }}
                >
                  {user.email}
                </Text>
              </Box>
            )}

            <HStack spacing={2}>
              <IconButton
                aria-label="Alternar tema"
                icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
                onClick={toggleColorMode}
                variant="ghost"
                size="sm"
              />
              <Button onClick={handleLogout} variant="outline" size="sm">
                Sair
              </Button>
            </HStack>
          </Flex>
        </Flex>
      </Box>

      <Box as="main" flex="1" px={{ base: 4, md: 6 }} py={{ base: 4, md: 6 }}>
        <Outlet />
      </Box>
    </Flex>
  );
}


