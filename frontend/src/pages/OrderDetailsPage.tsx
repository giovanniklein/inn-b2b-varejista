import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  SimpleGrid,
  Skeleton,
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
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { api } from '../api/client';

import type { PedidoStatus } from './OrdersPage';

interface EnderecoEntrega {
  id: string;
  descricao: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  complemento?: string | null;
}

interface PedidoItem {
  produto_id: string;
  descricao_produto: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

interface PedidoDetailResponse {
  id: string;
  atacadista_id: string;
  atacadista_nome?: string | null;
  varejista_id: string;
  valor_total: number;
  status: PedidoStatus;
  data_criacao: string;
  endereco_entrega: EnderecoEntrega;
  itens: PedidoItem[];
}

const formatCurrency = (value: number | null | undefined) => {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    safeValue,
  );
};

const formatDate = (value: string) => new Date(value).toLocaleString('pt-BR');

function StatusBadge({ status }: { status: PedidoStatus }) {
  const colorScheme =
    status === 'pendente'
      ? 'yellow'
      : status === 'aceito'
        ? 'green'
        : status === 'recusado'
          ? 'red'
          : status === 'cancelado'
            ? 'gray'
            : 'blue';

  const label =
    status === 'pendente'
      ? 'Pendente'
      : status === 'aceito'
        ? 'Aceito'
        : status === 'recusado'
          ? 'Recusado'
          : status === 'cancelado'
            ? 'Cancelado'
            : 'Entregue';

  return (
    <Badge colorScheme={colorScheme} variant="subtle" fontSize="0.75rem">
      {label}
    </Badge>
  );
}

export function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [pedido, setPedido] = useState<PedidoDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const carregarPedido = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const { data } = await api.get<PedidoDetailResponse>(`/pedidos/${id}`);
      setPedido(data);
    } catch (error: any) {
      const message = error?.response?.data?.detail ?? 'Nao foi possivel carregar o pedido.';
      toast({
        title: 'Erro ao carregar pedido',
        description: message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      navigate('/pedidos');
    } finally {
      setIsLoading(false);
    }
  };

  const duplicarPedido = async () => {
    if (!id) return;
    try {
      setIsDuplicating(true);
      await api.post(`/pedidos/${id}/duplicar`);
      toast({
        title: 'Pedido duplicado',
        description: 'Os itens foram adicionados ao carrinho.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      navigate('/carrinho');
    } catch (error: any) {
      const message = error?.response?.data?.detail ?? 'Nao foi possivel duplicar o pedido.';
      toast({
        title: 'Erro ao duplicar pedido',
        description: message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  useEffect(() => {
    carregarPedido();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!pedido && !isLoading) {
    return (
      <Box>
        <Text>Pedido nao encontrado.</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} mb={4} gap={3}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Pedido {pedido?.id}
          </Text>
          <Text fontSize="sm" color="gray.500">
            Detalhes do pedido enviado para o atacadista.
          </Text>
        </Box>
        <Button
          size="sm"
          colorScheme="brand"
          onClick={duplicarPedido}
          isLoading={isDuplicating}
          alignSelf={{ base: 'flex-start', md: 'center' }}
        >
          Duplicar pedido
        </Button>
      </Flex>

      <Skeleton isLoaded={!isLoading} borderRadius="md">
        {pedido && (
          <Stack spacing={6}>
            <Box>
              <Text fontWeight="semibold" mb={2}>
                Informacoes gerais
              </Text>
              <Stack spacing={1} fontSize="sm">
                <HStack justify="space-between">
                  <Text color="gray.600">Atacadista</Text>
                  <Badge colorScheme="purple">
                    {pedido.atacadista_nome ?? pedido.atacadista_id}
                  </Badge>
                </HStack>
                <HStack justify="space-between">
                  <Text color="gray.600">Status</Text>
                  <StatusBadge status={pedido.status} />
                </HStack>
                <HStack justify="space-between">
                  <Text color="gray.600">Valor total</Text>
                  <Text fontWeight="semibold">{formatCurrency(pedido.valor_total)}</Text>
                </HStack>
                <HStack justify="space-between">
                  <Text color="gray.600">Data de criacao</Text>
                  <Text>{formatDate(pedido.data_criacao)}</Text>
                </HStack>
              </Stack>
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="semibold" mb={2}>
                Endereco de entrega
              </Text>
              <Text fontSize="sm">
                {pedido.endereco_entrega.descricao} - {pedido.endereco_entrega.logradouro},{' '}
                {pedido.endereco_entrega.numero} - {pedido.endereco_entrega.bairro} -
                {pedido.endereco_entrega.cidade}/{pedido.endereco_entrega.uf} - CEP{' '}
                {pedido.endereco_entrega.cep}
              </Text>
              {pedido.endereco_entrega.complemento && (
                <Text fontSize="sm" color="gray.600">
                  {pedido.endereco_entrega.complemento}
                </Text>
              )}
            </Box>

            <Divider />

            <Box>
              <Text fontWeight="semibold" mb={2}>
                Itens do pedido
              </Text>

              <Stack spacing={3} display={{ base: 'flex', md: 'none' }}>
                {pedido.itens.map((item) => (
                  <Box key={`${item.produto_id}-${item.unidade}`} borderWidth="1px" borderRadius="md" p={3}>
                    <Text fontWeight="semibold" fontSize="sm">
                      {item.descricao_produto}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      Produto ID: {item.produto_id}
                    </Text>
                    <SimpleGrid columns={2} spacing={2} mt={2} fontSize="sm">
                      <Text color="gray.600">Unidade</Text>
                      <Text textAlign="right">{item.unidade}</Text>
                      <Text color="gray.600">Quantidade</Text>
                      <Text textAlign="right">{item.quantidade}</Text>
                      <Text color="gray.600">Valor unitario</Text>
                      <Text textAlign="right">{formatCurrency(item.valor_unitario)}</Text>
                      <Text color="gray.600">Subtotal</Text>
                      <Text textAlign="right" fontWeight="semibold">
                        {formatCurrency(item.valor_total)}
                      </Text>
                    </SimpleGrid>
                  </Box>
                ))}
              </Stack>

              <Table size="sm" display={{ base: 'none', md: 'table' }}>
                <Thead>
                  <Tr>
                    <Th>Produto</Th>
                    <Th>Unidade</Th>
                    <Th isNumeric>Quantidade</Th>
                    <Th isNumeric>Valor unitario</Th>
                    <Th isNumeric>Subtotal</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {pedido.itens.map((item) => (
                    <Tr key={`${item.produto_id}-${item.unidade}`}>
                      <Td>
                        <Text fontSize="sm" fontWeight="semibold">
                          {item.descricao_produto}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          Produto ID: {item.produto_id}
                        </Text>
                      </Td>
                      <Td>{item.unidade}</Td>
                      <Td isNumeric>{item.quantidade}</Td>
                      <Td isNumeric>{formatCurrency(item.valor_unitario)}</Td>
                      <Td isNumeric>{formatCurrency(item.valor_total)}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Stack>
        )}
      </Skeleton>
    </Box>
  );
}
