import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '@chakra-ui/icons';

import { api } from '../api/client';

type UnidadeTipo = string;

interface ProdutoPreco {
  unidade: UnidadeTipo;
  preco: number;
}

interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  imagem_base64?: string | null;
  estoque: number;
  precos?: ProdutoPreco[] | null;
  atacadista_id: string;
  atacadista_nome?: string | null;
}

interface ProdutoListResponse {
  items: Produto[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

const unidadeLabel: Record<string, string> = {
  unidade: 'Unidade',
  caixa: 'Caixa',
  palete: 'Palete',
};

const formatUnidade = (value: string) => unidadeLabel[value] ?? value;

const formatCurrency = (value: number | null | undefined) => {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    safeValue,
  );
};

export function ProductsPage() {
  const [data, setData] = useState<ProdutoListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCartShortcut, setShowCartShortcut] = useState(false);

  const [selectedUnitById, setSelectedUnitById] = useState<Record<string, UnidadeTipo>>(
    {},
  );
  const [selectedQtyById, setSelectedQtyById] = useState<Record<string, number>>({});

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
          page_size: 12,
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

  useEffect(() => {
    if (!data?.items) return;

    setSelectedUnitById((prev) => {
      const next = { ...prev };
      for (const produto of data.items) {
        const precos = Array.isArray(produto.precos) ? produto.precos : [];
        if (!next[produto.id] && precos.length > 0) {
          next[produto.id] = precos[0].unidade;
        }
      }
      return next;
    });

    setSelectedQtyById((prev) => {
      const next = { ...prev };
      for (const produto of data.items) {
        if (!next[produto.id]) {
          next[produto.id] = 1;
        }
      }
      return next;
    });
  }, [data?.items]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearchTerm(search);
  };

  const handleClearSearch = () => {
    setSearch('');
    setSearchTerm('');
    setPage(1);
  };

  const canGoPrev = useMemo(() => (data?.page ?? 1) > 1, [data]);
  const canGoNext = useMemo(
    () => (data?.page ?? 1) < (data?.total_pages ?? 1),
    [data],
  );

  const handleAdicionarAoCarrinho = async (produto: Produto) => {
    const precos = Array.isArray(produto.precos) ? produto.precos : [];
    const unidade = selectedUnitById[produto.id] ?? precos[0]?.unidade ?? null;
    const quantidade = selectedQtyById[produto.id] ?? 1;

    if (!unidade) {
      toast({
        title: 'Produto sem precos',
        description: 'Nao ha precos cadastrados para este produto.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const payload = {
        produto_id: produto.id,
        atacadista_id: produto.atacadista_id,
        quantidade,
        unidade_medida: unidade,
      };

      await api.post('/carrinho/itens', payload);

      toast({
        title: 'Produto adicionado ao carrinho',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
      setShowCartShortcut(true);
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? 'Nao foi possivel adicionar ao carrinho.';
      toast({
        title: 'Erro ao adicionar ao carrinho',
        description: message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  return (
    <Box>
      <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} mb={6} gap={4}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Catalogo de produtos
          </Text>
          <Text color="gray.500" fontSize="sm">
            Visualize produtos de todos os atacadistas e monte seu carrinho unificado.
          </Text>
        </Box>

        <Box as="form" onSubmit={handleSearchSubmit} maxW={{ base: '100%', md: '360px' }}>
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
      </Flex>

      {showCartShortcut && (
        <Flex
          align={{ base: 'stretch', md: 'center' }}
          direction={{ base: 'column', md: 'row' }}
          justify="space-between"
          gap={3}
          mb={6}
          bg="white"
          borderWidth="1px"
          borderRadius="lg"
          p={3}
        >
          <Text fontSize="sm" color="gray.600">
            Item adicionado. Quer revisar o carrinho?
          </Text>
          <HStack spacing={2}>
            <Button size="sm" variant="outline" onClick={() => setShowCartShortcut(false)}>
              Continuar comprando
            </Button>
            <Button size="sm" colorScheme="brand" onClick={() => navigate('/carrinho')}>
              Ir para carrinho
            </Button>
          </HStack>
        </Flex>
      )}

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
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={6}>
            {data.items.map((produto) => (
              <Box
                key={produto.id}
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
                bg="white"
                shadow="sm"
              >
                {produto.imagem_base64 && (
                  <Image
                    src={`data:image/png;base64,${produto.imagem_base64}`}
                    alt={produto.descricao}
                    objectFit="contain"
                    w="100%"
                    h="200px"
                    bg="gray.50"
                    borderBottomWidth="1px"
                  />
                )}

                <Box p={4}>
                  <Stack spacing={2}>
                    <HStack justify="space-between" align="flex-start">
                      <Text fontWeight="semibold" noOfLines={2}>
                        {produto.descricao}
                      </Text>
                      <Badge colorScheme="purple" fontSize="0.7rem">
                        {produto.codigo}
                      </Badge>
                    </HStack>

                    <Text fontSize="xs" color="gray.500">
                      Atacadista: {produto.atacadista_nome ?? produto.atacadista_id}
                    </Text>

                    <Stack spacing={1} fontSize="sm">
                      {Array.isArray(produto.precos) && produto.precos.length > 0 ? (
                        produto.precos.map((preco) => (
                          <Text key={preco.unidade}>
                            <strong>{formatUnidade(preco.unidade)}:</strong>{' '}
                            {formatCurrency(preco.preco)}
                          </Text>
                        ))
                      ) : (
                        <Text fontSize="sm" color="gray.500">
                          Sem precos cadastrados.
                        </Text>
                      )}
                      <Text fontSize="xs" color="gray.500">
                        Estoque disponivel: {produto.estoque ?? 0}
                      </Text>
                    </Stack>

                    <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} mt={1}>
                      <Box>
                        <Text fontSize="xs" color="gray.500" mb={1}>
                          Unidade de medida
                        </Text>
                        <Select
                          size="sm"
                          value={
                            selectedUnitById[produto.id] ??
                            (Array.isArray(produto.precos) ? produto.precos[0]?.unidade : '') ??
                            ''
                          }
                          onChange={(e) =>
                            setSelectedUnitById((prev) => ({
                              ...prev,
                              [produto.id]: e.target.value as UnidadeTipo,
                            }))
                          }
                          isDisabled={!Array.isArray(produto.precos) || produto.precos.length === 0}
                        >
                          {(Array.isArray(produto.precos) ? produto.precos : []).map((preco) => (
                            <option key={preco.unidade} value={preco.unidade}>
                              {formatUnidade(preco.unidade)}
                            </option>
                          ))}
                        </Select>
                      </Box>
                      <Box>
                        <Text fontSize="xs" color="gray.500" mb={1}>
                          Quantidade
                        </Text>
                        <NumberInput
                          size="sm"
                          min={1}
                          max={100}
                          value={selectedQtyById[produto.id] ?? 1}
                          onChange={(_, valueAsNumber) =>
                            setSelectedQtyById((prev) => ({
                              ...prev,
                              [produto.id]: Number.isFinite(valueAsNumber)
                                ? valueAsNumber
                                : 1,
                            }))
                          }
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </Box>
                    </SimpleGrid>

                    <Box
                      mt={2}
                      bg="gray.50"
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="gray.100"
                      p={2}
                    >
                      <Text fontSize="xs" color="gray.500">
                        Total estimado
                      </Text>
                      <Text fontSize="sm" fontWeight="semibold">
                        {(() => {
                          const unidade =
                            selectedUnitById[produto.id] ??
                            (Array.isArray(produto.precos)
                              ? produto.precos[0]?.unidade
                              : '') ??
                            '';
                          const quantidade = selectedQtyById[produto.id] ?? 1;
                          const precos = Array.isArray(produto.precos) ? produto.precos : [];
                          const precoSelecionado = precos.find(
                            (preco) => preco.unidade === unidade,
                          );
                          const total = (precoSelecionado?.preco ?? 0) * quantidade;
                          return formatCurrency(total);
                        })()}
                      </Text>
                    </Box>

                    <Button
                      mt={2}
                      colorScheme="brand"
                      size="sm"
                      onClick={() => handleAdicionarAoCarrinho(produto)}
                      isDisabled={!Array.isArray(produto.precos) || produto.precos.length === 0}
                    >
                      Adicionar ao carrinho
                    </Button>
                  </Stack>
                </Box>
              </Box>
            ))}
          </SimpleGrid>

          {data.total_pages > 1 && (
            <Flex mt={8} justify="space-between" align="center">
              <Text fontSize="sm" color="gray.600">
                Pagina {data.page} de {data.total_pages} - {data.total} produtos encontrados
                {searchTerm && (
                  <> para "{searchTerm}"</>
                )}
              </Text>

              <HStack spacing={2}>
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
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSearch}
                    isDisabled={isLoading}
                  >
                    Limpar filtro
                  </Button>
                )}
              </HStack>
            </Flex>
          )}
        </>
      )}
    </Box>
  );
}
