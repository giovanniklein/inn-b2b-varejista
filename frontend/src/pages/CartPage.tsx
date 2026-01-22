import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';

import { api } from '../api/client';

interface CarrinhoItem {
  produto_id: string;
  descricao_produto?: string | null;
  atacadista_id: string;
  atacadista_nome?: string | null;
  quantidade: number;
  unidade_medida: string;
  preco_unitario: number;
  subtotal: number;
  precos: { unidade: string; preco: number }[];
}

interface CarrinhoResponse {
  itens: CarrinhoItem[];
  valor_total: number;
  atualizado_em: string | null;
}

interface Endereco {
  id: string;
  descricao: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  complemento?: string | null;
  eh_principal: boolean;
}

interface EnderecoListResponse {
  items: Endereco[];
}

interface FinalizarCarrinhoResponse {
  pedidos_gerados: {
    pedido_id: string;
    atacadista_id: string;
    valor_total: number;
  }[];
}

const formatCurrency = (value: number | null | undefined) => {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    safeValue,
  );
};

const formatUnidade = (value: string) => {
  if (!value) return value;
  if (value.length <= 3) return value.toUpperCase();
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export function CartPage() {
  const [carrinho, setCarrinho] = useState<CarrinhoResponse | null>(null);
  const [enderecos, setEnderecos] = useState<Endereco[]>([]);
  const [enderecosSelecionados, setEnderecosSelecionados] = useState<
    Record<string, string>
  >({});
  const [isFinalizando, setIsFinalizando] = useState(false);

  const toast = useToast();

  const loadCarrinho = async () => {
    try {
      const { data } = await api.get<CarrinhoResponse>('/carrinho/');
      setCarrinho(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ?? 'Nao foi possivel carregar o carrinho.';
      toast({
        title: 'Erro ao carregar carrinho',
        description: message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const loadEnderecos = async () => {
    try {
      const { data } = await api.get<EnderecoListResponse>('/enderecos/');
      setEnderecos(data.items);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ?? 'Nao foi possivel carregar os enderecos.';
      toast({
        title: 'Erro ao carregar enderecos',
        description: message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  useEffect(() => {
    loadCarrinho();
    loadEnderecos();
  }, []);

  const itensAgrupadosPorAtacadista = useMemo(() => {
    const grupos: Record<string, CarrinhoItem[]> = {};
    if (!carrinho?.itens) return grupos;

    for (const item of carrinho.itens) {
      if (!grupos[item.atacadista_id]) {
        grupos[item.atacadista_id] = [];
      }
      grupos[item.atacadista_id].push(item);
    }
    return grupos;
  }, [carrinho]);

  const subtotalPorAtacadista = useMemo(() => {
    const mapa: Record<string, number> = {};
    Object.entries(itensAgrupadosPorAtacadista).forEach(([atacadistaId, itens]) => {
      mapa[atacadistaId] = itens.reduce((acc, item) => acc + item.subtotal, 0);
    });
    return mapa;
  }, [itensAgrupadosPorAtacadista]);

  const handleAlterarItem = async (
    produtoId: string,
    quantidade: number,
    unidade_medida: CarrinhoItem['unidade_medida'],
  ) => {
    try {
      const { data } = await api.put<CarrinhoResponse>(
        `/carrinho/itens/${produtoId}`,
        {
          quantidade,
          unidade_medida,
        },
      );
      setCarrinho(data);
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ?? 'Nao foi possivel atualizar o item do carrinho.';
      toast({
        title: 'Erro ao atualizar item',
        description: message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleRemoverItem = async (produtoId: string) => {
    try {
      const { data } = await api.delete<CarrinhoResponse>(`/carrinho/itens/${produtoId}`);
      setCarrinho(data);
      toast({
        title: 'Item removido do carrinho',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ?? 'Nao foi possivel remover o item do carrinho.';
      toast({
        title: 'Erro ao remover item',
        description: message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    }
  };

  const handleSelecionarEndereco = (atacadistaId: string, enderecoId: string) => {
    setEnderecosSelecionados((prev) => ({
      ...prev,
      [atacadistaId]: enderecoId,
    }));
  };

  const getEnderecoPadraoId = () => {
    if (!enderecos.length) return null;
    const principal = enderecos.find((endereco) => endereco.eh_principal);
    return principal?.id ?? enderecos[0].id;
  };

  useEffect(() => {
    if (!enderecos.length) return;
    const enderecoPadraoId = getEnderecoPadraoId();
    if (!enderecoPadraoId) return;

    const atacadistas = Object.keys(itensAgrupadosPorAtacadista);
    if (!atacadistas.length) return;

    setEnderecosSelecionados((prev) => {
      const next = { ...prev };
      for (const atacadistaId of atacadistas) {
        const current = next[atacadistaId];
        const exists = enderecos.some((endereco) => endereco.id === current);
        if (!current || !exists) {
          next[atacadistaId] = enderecoPadraoId;
        }
      }
      return next;
    });
  }, [enderecos, itensAgrupadosPorAtacadista]);

  const handleFinalizar = async () => {
    if (!carrinho || !carrinho.itens.length) {
      toast({
        title: 'Carrinho vazio',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!enderecos.length) {
      toast({
        title: 'Cadastre um endereco',
        description: 'Cadastre ao menos um endereco de entrega para finalizar o pedido.',
        status: 'warning',
        duration: 4000,
        isClosable: true,
      });
      return;
    }

    const atacadistas = Object.keys(itensAgrupadosPorAtacadista);
    const enderecoPadraoId = getEnderecoPadraoId();
    const enderecosPayload = atacadistas.map((atacadistaId) => ({
      atacadista_id: atacadistaId,
      endereco_id: enderecosSelecionados[atacadistaId] ?? enderecoPadraoId ?? '',
    }));

    const payload = {
      enderecos: enderecosPayload,
    };

    try {
      setIsFinalizando(true);
      const { data } = await api.post<FinalizarCarrinhoResponse>(
        '/carrinho/finalizar',
        payload,
      );

      toast({
        title: 'Pedidos gerados com sucesso',
        description: `${data.pedidos_gerados.length} pedido(s) foram criados.`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });

      // Apos finalizar, recarrega carrinho
      await loadCarrinho();
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? 'Nao foi possivel finalizar o carrinho.';
      toast({
        title: 'Erro ao finalizar carrinho',
        description: message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsFinalizando(false);
    }
  };

  if (!carrinho || carrinho.itens.length === 0) {
    return (
      <Box>
        <Text fontSize="2xl" fontWeight="bold" mb={2}>
          Meu carrinho
        </Text>
        <Text color="gray.500">Seu carrinho esta vazio no momento.</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Text fontSize="2xl" fontWeight="bold" mb={2}>
        Meu carrinho
      </Text>
      <Text color="gray.500" mb={6}>
        Revise os itens e selecione um endereco de entrega para cada atacadista antes de
        finalizar.
      </Text>

      <Stack spacing={6}>
        {Object.entries(itensAgrupadosPorAtacadista).map(([atacadistaId, itens]) => (
          <Box key={atacadistaId} borderWidth="1px" borderRadius="md" p={4} bg="white">
            <Flex
              justify="space-between"
              align={{ base: 'stretch', md: 'center' }}
              direction={{ base: 'column', md: 'row' }}
              mb={3}
              gap={{ base: 3, md: 0 }}
            >
              <HStack spacing={3}>
                <Text fontWeight="semibold">Atacadista</Text>
                <Badge colorScheme="purple">
                  {itens[0]?.atacadista_nome ?? atacadistaId}
                </Badge>
              </HStack>

              <Stack
                spacing={2}
                direction={{ base: 'column', sm: 'row' }}
                align={{ base: 'stretch', sm: 'center' }}
                w={{ base: 'full', md: 'auto' }}
              >
                <Text fontSize="sm" color="gray.600">
                  Endereco de entrega
                </Text>
                <Select
                  size="sm"
                  value={enderecosSelecionados[atacadistaId] ?? ''}
                  onChange={(e) => handleSelecionarEndereco(atacadistaId, e.target.value)}
                  w={{ base: 'full', md: '320px' }}
                  maxW={{ base: 'full', md: '320px' }}
                  isDisabled={enderecos.length <= 1}
                >
                  {enderecos.map((endereco) => (
                    <option key={endereco.id} value={endereco.id}>
                      {endereco.descricao} - {endereco.cidade}/{endereco.uf}
                    </option>
                  ))}
                </Select>
              </Stack>
            </Flex>

            <Stack spacing={3} display={{ base: 'flex', md: 'none' }}>
              {itens.map((item) => (
                <Box
                  key={`${item.produto_id}-${item.unidade_medida}`}
                  borderWidth="1px"
                  borderRadius="md"
                  p={3}
                  bg="gray.50"
                >
                  <Text fontWeight="medium">
                    {item.descricao_produto || 'Produto sem descricao'}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    ID: {item.produto_id}
                  </Text>

                  <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={3} mt={3}>
                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        Unidade
                      </Text>
                      <Select
                        size="sm"
                        value={item.unidade_medida}
                        onChange={(e) =>
                          handleAlterarItem(
                            item.produto_id,
                            item.quantidade,
                            e.target.value as CarrinhoItem['unidade_medida'],
                          )
                        }
                      >
                        {item.precos.map((preco) => (
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
                        value={item.quantidade}
                        onChange={(_, valueAsNumber) =>
                          handleAlterarItem(
                            item.produto_id,
                            Number.isFinite(valueAsNumber) ? valueAsNumber : 1,
                            item.unidade_medida,
                          )
                        }
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        Preco
                      </Text>
                      <Text fontWeight="semibold">{formatCurrency(item.preco_unitario)}</Text>
                    </Box>
                    <Box>
                      <Text fontSize="xs" color="gray.500" mb={1}>
                        Subtotal
                      </Text>
                      <Text fontWeight="semibold">{formatCurrency(item.subtotal)}</Text>
                    </Box>
                  </SimpleGrid>

                  <Button
                    size="xs"
                    variant="outline"
                    colorScheme="red"
                    mt={3}
                    onClick={() => handleRemoverItem(item.produto_id)}
                  >
                    Remover
                  </Button>
                </Box>
              ))}
            </Stack>

            <Table size="sm" display={{ base: 'none', md: 'table' }}>
              <Thead>
                <Tr>
                  <Th>Produto</Th>
                  <Th>Unidade</Th>
                  <Th isNumeric>Quantidade</Th>
                  <Th isNumeric>Preco unitario</Th>
                  <Th isNumeric>Subtotal</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {itens.map((item) => (
                  <Tr key={`${item.produto_id}-${item.unidade_medida}`}>
                    <Td>
                      <Text fontWeight="medium">
                        {item.descricao_produto || 'Produto sem descricao'}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        ID: {item.produto_id}
                      </Text>
                    </Td>
                    <Td>
                      <Select
                        size="sm"
                        value={item.unidade_medida}
                        onChange={(e) =>
                          handleAlterarItem(
                            item.produto_id,
                            item.quantidade,
                            e.target.value as CarrinhoItem['unidade_medida'],
                          )
                        }
                      >
                        {item.precos.map((preco) => (
                          <option key={preco.unidade} value={preco.unidade}>
                            {formatUnidade(preco.unidade)}
                          </option>
                        ))}
                      </Select>
                    </Td>
                    <Td isNumeric>
                      <NumberInput
                        size="sm"
                        min={1}
                        max={100}
                        value={item.quantidade}
                        onChange={(_, valueAsNumber) =>
                          handleAlterarItem(
                            item.produto_id,
                            Number.isFinite(valueAsNumber) ? valueAsNumber : 1,
                            item.unidade_medida,
                          )
                        }
                        maxW="100px"
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </Td>
                    <Td isNumeric>{formatCurrency(item.preco_unitario)}</Td>
                    <Td isNumeric>{formatCurrency(item.subtotal)}</Td>
                    <Td isNumeric>
                      <Button
                        size="xs"
                        variant="outline"
                        colorScheme="red"
                        onClick={() => handleRemoverItem(item.produto_id)}
                      >
                        Remover
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>

            <Divider my={3} />

            <Flex
              justify="space-between"
              align={{ base: 'flex-start', md: 'center' }}
              direction={{ base: 'column', md: 'row' }}
              gap={{ base: 1, md: 0 }}
            >
              <Text fontSize="sm" color="gray.600">
                Subtotal do atacadista
              </Text>
              <Text fontWeight="semibold">
                {formatCurrency(subtotalPorAtacadista[atacadistaId] ?? 0)}
              </Text>
            </Flex>
          </Box>
        ))}

        <Box textAlign={{ base: 'left', md: 'right' }}>
          <Text fontSize="sm" color="gray.600">
            Valor total do carrinho
          </Text>
          <Text fontSize="2xl" fontWeight="bold">
            {formatCurrency(carrinho.valor_total)}
          </Text>

          <Button
            mt={4}
            colorScheme="brand"
            onClick={handleFinalizar}
            isLoading={isFinalizando}
            w={{ base: 'full', md: 'auto' }}
          >
            Finalizar pedido
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

