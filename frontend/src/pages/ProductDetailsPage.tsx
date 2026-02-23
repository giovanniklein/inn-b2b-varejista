import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Image,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { ArrowBackIcon } from '@chakra-ui/icons';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { api } from '../api/client';

type UnidadeTipo = string;

interface ProdutoPreco {
  unidade: UnidadeTipo;
  preco: number;
  quantidade_unidades: number;
}

interface Produto {
  id: string;
  codigo: string;
  descricao: string;
  imagem_base64?: string | null;
  precos?: ProdutoPreco[] | null;
  atacadista_id: string;
  atacadista_nome?: string | null;
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

const formatQtdUnidades = (value: number | null | undefined) => {
  const safeValue =
    typeof value === 'number' && Number.isFinite(value) && value > 0
      ? Math.trunc(value)
      : 1;
  return `${safeValue} un`;
};

export function ProductDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [produto, setProduto] = useState<Produto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnidadeTipo>('');
  const [selectedQty, setSelectedQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const carregarProduto = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const { data } = await api.get<Produto>(`/produtos/${id}`);
        setProduto(data);
        const firstUnit = Array.isArray(data.precos) ? data.precos[0]?.unidade : '';
        setSelectedUnit(firstUnit ?? '');
      } catch (err: any) {
        const message =
          err?.response?.data?.detail ?? 'Nao foi possivel carregar os detalhes do produto.';
        toast({
          title: 'Erro ao carregar produto',
          description: message,
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
        navigate('/produtos');
      } finally {
        setIsLoading(false);
      }
    };

    carregarProduto();
  }, [id, navigate, toast]);

  const precoSelecionado = useMemo(() => {
    const precos = Array.isArray(produto?.precos) ? produto?.precos : [];
    return precos.find((preco) => preco.unidade === selectedUnit) ?? null;
  }, [produto?.precos, selectedUnit]);

  const totalEstimado = useMemo(
    () => (precoSelecionado?.preco ?? 0) * selectedQty,
    [precoSelecionado?.preco, selectedQty],
  );

  const handleAddToCart = async () => {
    if (!produto) return;
    if (!selectedUnit) {
      toast({
        title: 'Selecione a unidade',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setIsAdding(true);
      await api.post('/carrinho/itens', {
        produto_id: produto.id,
        atacadista_id: produto.atacadista_id,
        quantidade: selectedQty,
        unidade_medida: selectedUnit,
      });

      toast({
        title: 'Produto adicionado ao carrinho',
        status: 'success',
        duration: 2500,
        isClosable: true,
      });
      navigate('/carrinho');
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? 'Nao foi possivel adicionar ao carrinho.';
      toast({
        title: 'Erro ao adicionar ao carrinho',
        description: message,
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return <Text>Carregando produto...</Text>;
  }

  if (!produto) {
    return <Text>Produto nao encontrado.</Text>;
  }

  const precos = Array.isArray(produto.precos) ? produto.precos : [];

  return (
    <Box maxW="760px" mx="auto">
      <HStack mb={4} spacing={2}>
        <IconButton
          aria-label="Voltar"
          icon={<ArrowBackIcon />}
          variant="ghost"
          onClick={() => navigate(-1)}
        />
        <Text fontSize="sm" color="gray.500">
          Detalhes do produto
        </Text>
      </HStack>

      <Stack spacing={4}>
        <Box borderWidth="1px" borderRadius="lg" bg="white" overflow="hidden">
          {produto.imagem_base64 ? (
            <Image
              src={`data:image/png;base64,${produto.imagem_base64}`}
              alt={produto.descricao}
              objectFit="contain"
              w="100%"
              h={{ base: '280px', md: '380px' }}
              bg="gray.50"
            />
          ) : (
            <Flex align="center" justify="center" h={{ base: '280px', md: '380px' }} bg="gray.50">
              <Text color="gray.400">Sem imagem</Text>
            </Flex>
          )}
        </Box>

        <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
          <Stack spacing={3}>
            <HStack justify="space-between" align="start">
              <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" lineHeight="short">
                {produto.descricao}
              </Text>
              <Badge colorScheme="purple">{produto.codigo}</Badge>
            </HStack>

            <Text fontSize="sm" color="gray.500">
              Atacadista: {produto.atacadista_nome ?? produto.atacadista_id}
            </Text>

            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                Faixas de preco
              </Text>
              <Stack spacing={1}>
                {precos.map((preco) => (
                  <Text key={preco.unidade} fontSize="sm">
                    <strong>
                      {formatUnidade(preco.unidade)} ({formatQtdUnidades(preco.quantidade_unidades)}):
                    </strong>{' '}
                    {formatCurrency(preco.preco)}
                  </Text>
                ))}
              </Stack>
            </Box>

            <Text fontSize="3xl" fontWeight="bold">
              {formatCurrency(precoSelecionado?.preco ?? 0)}
            </Text>
            <Text fontSize="sm" color="gray.500">
              {selectedUnit ? formatUnidade(selectedUnit) : 'Unidade'} -{' '}
              {formatQtdUnidades(precoSelecionado?.quantidade_unidades)}
            </Text>

            <Stack direction={{ base: 'column', sm: 'row' }} spacing={3}>
              <Box flex="1">
                <Text fontSize="xs" color="gray.500" mb={1}>
                  Unidade de medida
                </Text>
                <Select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value as UnidadeTipo)}
                  isDisabled={precos.length === 0}
                >
                  {precos.map((preco) => (
                    <option key={preco.unidade} value={preco.unidade}>
                      {formatUnidade(preco.unidade)}
                    </option>
                  ))}
                </Select>
              </Box>

              <Box w={{ base: 'full', sm: '140px' }}>
                <Text fontSize="xs" color="gray.500" mb={1}>
                  Quantidade
                </Text>
                <NumberInput
                  min={1}
                  max={100}
                  value={selectedQty}
                  onChange={(_, valueAsNumber) =>
                    setSelectedQty(Number.isFinite(valueAsNumber) ? valueAsNumber : 1)
                  }
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </Box>
            </Stack>

            <Box bg="gray.50" borderRadius="md" p={3} borderWidth="1px">
              <Text fontSize="xs" color="gray.500">
                Total estimado
              </Text>
              <Text fontSize="lg" fontWeight="semibold">
                {formatCurrency(totalEstimado)}
              </Text>
            </Box>

            <Button
              colorScheme="green"
              size="lg"
              onClick={handleAddToCart}
              isLoading={isAdding}
              isDisabled={precos.length === 0}
              w="full"
            >
              Adicionar ao carrinho
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}

