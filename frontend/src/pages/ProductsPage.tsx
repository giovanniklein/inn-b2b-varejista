import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Box,
  Flex,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@chakra-ui/icons';

import { api } from '../api/client';

interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  imagem_base64?: string | null;
}

interface ProdutoListResponse {
  items: Produto[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function ProductsPage() {
  const [data, setData] = useState<ProdutoListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const toast = useToast();
  const navigate = useNavigate();

  const fetchProdutos = async (pageToFetch: number, term: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.get<ProdutoListResponse>('/produtos', {
        params: {
          page: pageToFetch,
          page_size: 20,
          q: term.trim() ? term.trim() : undefined,
        },
      });

      setData(data);
      setPage(data.page);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ?? 'Nao foi possivel carregar a lista de produtos.';
      setError(message);
      toast({
        title: 'Erro ao carregar produtos',
        description: message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos(page, searchTerm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearchTerm(search);
  };

  const canGoPrev = useMemo(() => (data?.page ?? 1) > 1, [data]);
  const canGoNext = useMemo(
    () => (data?.page ?? 1) < (data?.total_pages ?? 1),
    [data],
  );

  return (
    <Box>
      <Stack spacing={4} mb={5}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Catalogo
          </Text>
          <Text color="gray.500" fontSize="sm">
            Toque na foto para abrir os detalhes e comprar.
          </Text>
        </Box>

        <Box as="form" onSubmit={handleSearchSubmit}>
          <InputGroup size="md">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Buscar por nome ou descricao do produto"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              bg="white"
            />
          </InputGroup>
        </Box>
      </Stack>

      {isLoading && (
        <Flex align="center" gap={2} mb={4}>
          <Spinner size="sm" />
          <Text>Carregando produtos...</Text>
        </Flex>
      )}

      {error && !isLoading && (
        <Text color="red.500" mb={4}>
          {error}
        </Text>
      )}

      {data && data.items.length === 0 && !isLoading && <Text>Nenhum produto encontrado.</Text>}

      {data && data.items.length > 0 && (
        <>
          <SimpleGrid columns={{ base: 2, sm: 2, md: 3, lg: 4 }} spacing={{ base: 3, md: 4 }}>
            {data.items.map((produto) => (
              <Box
                key={produto.id}
                role="button"
                borderRadius="lg"
                overflow="hidden"
                bg="white"
                borderWidth="1px"
                shadow="sm"
                onClick={() => navigate(`/produtos/${produto.id}`)}
                _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                transition="all 0.15s ease"
              >
                {produto.imagem_base64 ? (
                  <Image
                    src={`data:image/png;base64,${produto.imagem_base64}`}
                    alt={produto.descricao}
                    w="100%"
                    h={{ base: '150px', sm: '170px', md: '220px' }}
                    objectFit="contain"
                    bg="gray.50"
                  />
                ) : (
                  <Flex
                    w="100%"
                    h={{ base: '150px', sm: '170px', md: '220px' }}
                    align="center"
                    justify="center"
                    bg="gray.100"
                  >
                    <Text fontSize="xs" color="gray.500" textAlign="center" px={2}>
                      Sem imagem
                    </Text>
                  </Flex>
                )}
              </Box>
            ))}
          </SimpleGrid>

          {data.total_pages > 1 && (
            <Flex mt={6} justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                Pagina {data.page} de {data.total_pages}
              </Text>

              <Stack direction="row" spacing={2}>
                <IconButton
                  aria-label="Pagina anterior"
                  icon={<ChevronLeftIcon />}
                  size="sm"
                  onClick={() => canGoPrev && setPage((prev) => Math.max(prev - 1, 1))}
                  isDisabled={!canGoPrev || isLoading}
                />
                <IconButton
                  aria-label="Proxima pagina"
                  icon={<ChevronRightIcon />}
                  size="sm"
                  onClick={() => canGoNext && setPage((prev) => prev + 1)}
                  isDisabled={!canGoNext || isLoading}
                />
              </Stack>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
}

