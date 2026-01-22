import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { api } from '../api/client';

type PedidoStatus = 'pendente' | 'aceito' | 'recusado' | 'entregue' | 'cancelado';

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
  eh_principal?: boolean;
}

interface PedidoListItem {
  id: string;
  atacadista_id: string;
  atacadista_nome?: string | null;
  valor_total: number;
  status: PedidoStatus;
  data_criacao: string;
  endereco_entrega: EnderecoEntrega;
}

interface PedidoListResponse {
  items: PedidoListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface CarrinhoResponse {
  itens: { produto_id: string; quantidade: number; subtotal: number }[];
  valor_total: number;
  atualizado_em: string | null;
}

const formatCurrency = (value: number | null | undefined) => {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    safeValue,
  );
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');

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

export function DashboardPage() {
  const [pedidos, setPedidos] = useState<PedidoListItem[]>([]);
  const [pedidosTotal, setPedidosTotal] = useState(0);
  const [carrinho, setCarrinho] = useState<CarrinhoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const toast = useToast();
  const navigate = useNavigate();

  const carregarDados = async () => {
    try {
      setIsLoading(true);
      const [pedidosResp, carrinhoResp] = await Promise.all([
        api.get<PedidoListResponse>('/pedidos', { params: { page: 1, page_size: 10 } }),
        api.get<CarrinhoResponse>('/carrinho'),
      ]);

      setPedidos(pedidosResp.data.items ?? []);
      setPedidosTotal(pedidosResp.data.total ?? 0);
      setCarrinho(carrinhoResp.data);
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ?? 'Nao foi possivel carregar o dashboard.';
      toast({
        title: 'Erro ao carregar',
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
    carregarDados();
  }, []);

  const pedidosPendentes = useMemo(
    () => pedidos.filter((item) => item.status === 'pendente').length,
    [pedidos],
  );
  const totalUltimosPedidos = useMemo(
    () => pedidos.reduce((acc, item) => acc + item.valor_total, 0),
    [pedidos],
  );
  const ticketMedio = useMemo(() => {
    if (!pedidos.length) return 0;
    return totalUltimosPedidos / pedidos.length;
  }, [pedidos, totalUltimosPedidos]);

  const itensCarrinho = useMemo(
    () => carrinho?.itens?.reduce((acc, item) => acc + item.quantidade, 0) ?? 0,
    [carrinho],
  );

  return (
    <Box>
      <Flex justify="space-between" align={{ base: 'stretch', md: 'center' }} mb={6} gap={4}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            Dashboard
          </Text>
          <Text color="gray.500" fontSize="sm">
            Resumo rapido para abastecer o mercado com mais controle.
          </Text>
        </Box>
        <HStack spacing={2}>
          <Button size="sm" variant="outline" onClick={() => navigate('/produtos')}>
            Comprar agora
          </Button>
          <Button size="sm" colorScheme="brand" onClick={() => navigate('/carrinho')}>
            Ver carrinho
          </Button>
        </HStack>
      </Flex>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={4} mb={6}>
        <Skeleton isLoaded={!isLoading} borderRadius="lg">
          <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Pedidos pendentes
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {pedidosPendentes}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Ultimos 10 pedidos
            </Text>
          </Box>
        </Skeleton>
        <Skeleton isLoaded={!isLoading} borderRadius="lg">
          <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Valor no carrinho
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {formatCurrency(carrinho?.valor_total ?? 0)}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {itensCarrinho} itens selecionados
            </Text>
          </Box>
        </Skeleton>
        <Skeleton isLoaded={!isLoading} borderRadius="lg">
          <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Ticket medio
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {formatCurrency(ticketMedio)}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Baseado nos ultimos pedidos
            </Text>
          </Box>
        </Skeleton>
        <Skeleton isLoaded={!isLoading} borderRadius="lg">
          <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Total de pedidos
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              {pedidosTotal}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Todos os periodos
            </Text>
          </Box>
        </Skeleton>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
        <Skeleton isLoaded={!isLoading} borderRadius="lg">
          <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
            <Flex justify="space-between" align="center" mb={3}>
              <Text fontWeight="semibold">Ultimos pedidos</Text>
              <Button size="xs" variant="ghost" onClick={() => navigate('/pedidos')}>
                Ver todos
              </Button>
            </Flex>

            <Stack spacing={3}>
              {pedidos.length === 0 ? (
                <Text fontSize="sm" color="gray.500">
                  Nenhum pedido recente.
                </Text>
              ) : (
                pedidos.slice(0, 5).map((pedido) => (
                  <Flex
                    key={pedido.id}
                    justify="space-between"
                    align="center"
                    py={2}
                    borderBottomWidth="1px"
                    borderColor="gray.100"
                  >
                    <Box>
                      <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                        {pedido.atacadista_nome ?? pedido.atacadista_id}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {formatDate(pedido.data_criacao)}
                      </Text>
                    </Box>
                    <HStack spacing={3}>
                      <Text fontSize="sm" fontWeight="semibold">
                        {formatCurrency(pedido.valor_total)}
                      </Text>
                      <StatusBadge status={pedido.status} />
                    </HStack>
                  </Flex>
                ))
              )}
            </Stack>
          </Box>
        </Skeleton>

        <Skeleton isLoaded={!isLoading} borderRadius="lg">
          <Box bg="white" borderWidth="1px" borderRadius="lg" p={4}>
            <Text fontWeight="semibold" mb={3}>
              Atalhos rapidos
            </Text>
            <Stack spacing={3}>
              <Button
                variant="outline"
                onClick={() => navigate('/produtos')}
                justifyContent="space-between"
              >
                Comprar Produtos
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/carrinho')}
                justifyContent="space-between"
              >
                Revisar carrinho
              </Button>
            </Stack>
          </Box>
        </Skeleton>
      </SimpleGrid>
    </Box>
  );
}
