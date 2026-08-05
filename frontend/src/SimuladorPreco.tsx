import { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import { PlatformIcon } from './PlatformIcon';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnStyle, btnNeutralStyle,
  tableHeaderStyle, tableCellStyle,
  formatarMoeda, formatarNumero
} from './theme';
import { SkeletonTable } from './Skeleton';

interface SeletorProdutoComBuscaProps {
  produtos: any[];
  skuSelecionado: string;
  onSelectSku: (sku: string) => void;
}

function SeletorProdutoComBusca({ produtos, skuSelecionado, onSelectSku }: SeletorProdutoComBuscaProps) {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const produtoAtual = produtos.find(p => p.sku === skuSelecionado);

  const produtosFiltrados = produtos.filter((p) => {
    const t = termoBusca.toLowerCase().trim();
    if (!t) return true;
    return (p.sku && p.sku.toLowerCase().includes(t)) || (p.nome && p.nome.toLowerCase().includes(t));
  });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setAberto(!aberto)}
        style={{
          ...inputStyle,
          width: '100%',
          maxWidth: 'none',
          margin: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          border: `1px solid ${aberto ? colors.accent : colors.borderStrong}`,
          backgroundColor: colors.bgInput,
          userSelect: 'none'
        }}
      >
        <span style={{ color: produtoAtual ? colors.textPrimary : colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {produtoAtual ? `📦 ${produtoAtual.sku} — ${produtoAtual.nome} (${formatarMoeda(produtoAtual.custo_produto)})` : 'Selecione um produto...'}
        </span>
        <span style={{ fontSize: '12px', color: colors.textSecondary, marginLeft: '8px' }}>
          {aberto ? '▲' : '▼'}
        </span>
      </div>

      {aberto && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: colors.bgSidebar,
            border: `1px solid ${colors.borderStrong}`,
            borderRadius: '10px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            zIndex: 1000,
            padding: '8px',
          }}
        >
          <input
            type="text"
            placeholder="🔍 Digite para pesquisar SKU ou Nome..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            autoFocus
            style={{
              ...inputStyle,
              width: '100%',
              maxWidth: 'none',
              marginBottom: '8px',
              padding: '8px 12px',
              fontSize: '13px',
              backgroundColor: colors.bgApp
            }}
          />

          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {produtosFiltrados.length === 0 ? (
              <div style={{ padding: '10px', color: colors.textMuted, textAlign: 'center', fontSize: '13px' }}>
                Nenhum produto encontrado
              </div>
            ) : (
              produtosFiltrados.map((p) => {
                const selecionado = p.sku === skuSelecionado;
                return (
                  <div
                    key={p.sku}
                    onClick={() => {
                      onSelectSku(p.sku);
                      setAberto(false);
                      setTermoBusca('');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      backgroundColor: selecionado ? 'rgba(59,130,246,0.2)' : 'transparent',
                      color: selecionado ? '#fff' : colors.textPrimary,
                      fontWeight: selecionado ? 600 : 400,
                      marginBottom: '2px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (!selecionado) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      if (!selecionado) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <span>
                      <strong style={{ color: colors.accent }}>{p.sku}</strong> — {p.nome}
                    </span>
                    <span style={{ fontSize: '12px', color: colors.textSecondary, marginLeft: '8px' }}>
                      Custo: {formatarMoeda(p.custo_produto)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// --- FUNÇÕES AUXILIARES DE CÁLCULO LOCAL PARA COMPARATIVO GERAL ---
function calcularMetricasPlataformaLocal(
  precoVenda: number,
  custoProduto: number,
  custoEmbalagem: number,
  custoEtiqueta: number,
  plat: any
) {
  if (!precoVenda || precoVenda <= 0) {
    return { precoVenda: 0, lucroLiquido: 0, margemFinal: 0, taxaPlataforma: 0 };
  }

  let taxaPercentual = (plat.taxa_plataforma || 0.0) > 1 ? (plat.taxa_plataforma / 100) : (plat.taxa_plataforma || 0.0);
  let taxaFixa = plat.taxa_fixa || 0.0;
  const taxaExtra = (plat.taxa_extra || 0.0) > 1 ? (plat.taxa_extra / 100) : (plat.taxa_extra || 0.0);
  const nomeLower = (plat.nome || '').toLowerCase();

  if (plat.faixas_json) {
    try {
      const faixas = typeof plat.faixas_json === 'string' ? JSON.parse(plat.faixas_json) : plat.faixas_json;
      if (Array.isArray(faixas) && faixas.length > 0) {
        const faixasOrdenadas = [...faixas].sort((a, b) => Number(a.de_valor || 0) - Number(b.de_valor || 0));
        for (const f of faixasOrdenadas) {
          const ate = f.ate_valor;
          if (ate === null || ate === undefined || ate === 0 || precoVenda <= Number(ate)) {
            let tp = Number(f.taxa_percentual || 0);
            if (tp > 1.0) tp = tp / 100.0;
            taxaPercentual = tp + taxaExtra;
            taxaFixa = Number(f.taxa_fixa || 0);
            break;
          }
        }
      }
    } catch (e) {
      console.error('Erro ao parsear faixas_json:', e);
    }
  } else if (nomeLower.includes('shopee')) {
    if (precoVenda <= 79.99) {
      taxaPercentual = 0.20 + taxaExtra;
      taxaFixa = 4.00;
    } else if (precoVenda <= 99.99) {
      taxaPercentual = 0.14 + taxaExtra;
      taxaFixa = 16.00;
    } else if (precoVenda <= 199.99) {
      taxaPercentual = 0.14 + taxaExtra;
      taxaFixa = 20.00;
    } else {
      taxaPercentual = 0.14 + taxaExtra;
      taxaFixa = 26.00;
    }
  } else if (nomeLower.includes('tiktok') || nomeLower.includes('tik tok')) {
    if (precoVenda <= 50.00) {
      taxaPercentual = 0.10 + taxaExtra;
      taxaFixa = 4.00;
    } else {
      taxaPercentual = 0.06 + taxaExtra;
      taxaFixa = 6.00;
    }
  } else if (nomeLower.includes('mercado livre') || nomeLower.includes('mercadolivre') || nomeLower.includes('ml')) {
    let taxaBase = (plat.taxa_plataforma || 0) / 100;
    if (taxaBase === 0) taxaBase = nomeLower.includes('premium') ? 0.19 : 0.14;
    if (precoVenda < 12.50) {
      taxaFixa = precoVenda * 0.50;
    } else if (precoVenda < 79.00) {
      taxaFixa = 6.00;
    } else {
      taxaFixa = 0.00;
    }
    taxaPercentual = taxaBase + taxaExtra;
  }

  const comissaoPlat = precoVenda * taxaPercentual + taxaFixa;
  const custoOp = precoVenda * (plat.custo_operacional_percentual || 0.0);
  const imposto = precoVenda * (plat.imposto_percentual || 0.0);

  const custoTotal = custoProduto + custoEmbalagem + custoEtiqueta + comissaoPlat + custoOp + imposto;
  const lucroLiquido = precoVenda - custoTotal;
  const margemFinal = lucroLiquido / precoVenda;

  return {
    precoVenda,
    lucroLiquido,
    margemFinal,
    taxaPlataforma: comissaoPlat
  };
}

function calcularPrecoPorMargemLocal(
  margemDesejadaPct: number,
  custoProduto: number,
  custoEmbalagem: number,
  custoEtiqueta: number,
  plat: any
) {
  const m = margemDesejadaPct / 100;
  const custoFixoInsumos = custoProduto + custoEmbalagem + custoEtiqueta;

  let taxaPct = (plat.taxa_plataforma || 0) + (plat.custo_operacional_percentual || 0) + (plat.imposto_percentual || 0);
  let taxaFixa = plat.taxa_fixa || 0;

  let divisor = 1 - taxaPct - m;
  if (divisor <= 0.05) divisor = 0.05;
  let precoEstimado = (custoFixoInsumos + taxaFixa) / divisor;

  for (let iter = 0; iter < 4; iter++) {
    const res = calcularMetricasPlataformaLocal(precoEstimado, custoProduto, custoEmbalagem, custoEtiqueta, plat);
    const diffMargem = m - res.margemFinal;
    if (Math.abs(diffMargem) < 0.0005) break;
    precoEstimado += precoEstimado * diffMargem;
  }

  return Math.max(0.01, precoEstimado);
}

export function SimuladorPreco() {
  const [modo, setModo] = useState<'existente' | 'livre' | 'comparativo'>('existente');

  // Dados do backend
  const [produtos, setProdutos] = useState<any[]>([]);
  const [embalagens, setEmbalagens] = useState<any[]>([]);
  const [plataformas, setPlataformas] = useState<any[]>([]);
  const [configuracoes, setConfiguracoes] = useState<any[]>([]);

  // Formulário - Modo Existente
  const [skuSelecionado, setSkuSelecionado] = useState<string>('');

  // Modo de Cálculo: 'margem' (Precificação por Margem %) ou 'preco' (Lucro por Preço R$)
  type TipoCalculo = 'margem' | 'preco';
  const [tipoCalculo, setTipoCalculo] = useState<TipoCalculo>('margem');

  // Formulário - Modo Livre
  const [custoProdutoLivre, setCustoProdutoLivre] = useState<string>('20.00');
  const [embalagemIdLivre, setEmbalagemIdLivre] = useState<string>('');

  // Inputs de Parâmetros
  const [margemDesejada, setMargemDesejada] = useState<number>(20);
  const [precoVendaInformado, setPrecoVendaInformado] = useState<string>('50.00');

  // Resultado da simulação individual
  const [resultado, setResultado] = useState<any | null>(null);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [erro, setErro] = useState<string>('');

  // ESTADOS DO MODO COMPARATIVO GERAL
  const [customPrecos, setCustomPrecos] = useState<{ [key: string]: number }>({});
  const [buscaComparativo, setBuscaComparativo] = useState<string>('');
  const [filtroMargemComparativo, setFiltroMargemComparativo] = useState<'todos' | 'alerta' | 'prejuizo'>('todos');
  const [filtroStatusComparativo, setFiltroStatusComparativo] = useState<'ativos' | 'inativos' | 'todos'>('ativos');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [resProd, resEmb, resPlat, resCfg] = await Promise.all([
        api.get('/produtos/detalhados'),
        api.get('/embalagens/'),
        api.get('/plataformas/'),
        api.get('/configuracoes/')
      ]);
      setProdutos(resProd.data || []);
      setEmbalagens(resEmb.data || []);
      setPlataformas(resPlat.data || []);
      setConfiguracoes(resCfg.data || []);

      if (resProd.data && resProd.data.length > 0) {
        setSkuSelecionado(resProd.data[0].sku);
        if (resProd.data[0].preco_venda) {
          setPrecoVendaInformado(String(resProd.data[0].preco_venda));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados para simulação:', err);
    }
  };

  useEffect(() => {
    if (modo === 'existente' && skuSelecionado && produtos.length > 0) {
      const prod = produtos.find(p => p.sku === skuSelecionado);
      if (prod && prod.preco_venda) {
        setPrecoVendaInformado(String(prod.preco_venda));
      }
    }
  }, [skuSelecionado, modo, produtos]);

  useEffect(() => {
    if (modo !== 'comparativo') {
      executarSimulacao();
    }
  }, [modo, skuSelecionado, custoProdutoLivre, embalagemIdLivre, margemDesejada, tipoCalculo, precoVendaInformado]);

  const executarSimulacao = async () => {
    setCarregando(true);
    setErro('');

    try {
      if (modo === 'existente') {
        if (!skuSelecionado) {
          setResultado(null);
          return;
        }
        let url = `/produtos/${skuSelecionado}/simular-preco?tipo_calculo=${tipoCalculo}`;
        if (tipoCalculo === 'margem') {
          url += `&margem_desejada=${margemDesejada}`;
        } else {
          const precoNum = parseFloat(precoVendaInformado.replace(',', '.'));
          url += `&preco_venda=${precoNum}`;
        }
        const res = await api.get(url);
        setResultado(res.data);
      } else if (modo === 'livre') {
        const custoNum = parseFloat(custoProdutoLivre.replace(',', '.'));
        if (isNaN(custoNum) || custoNum <= 0) {
          setResultado(null);
          return;
        }
        const embParam = embalagemIdLivre ? `&embalagem_id=${embalagemIdLivre}` : '';
        let url = `/simular-preco?custo_produto=${custoNum}&tipo_calculo=${tipoCalculo}${embParam}`;
        if (tipoCalculo === 'margem') {
          url += `&margem_desejada=${margemDesejada}`;
        } else {
          const precoNum = parseFloat(precoVendaInformado.replace(',', '.'));
          url += `&preco_venda=${precoNum}`;
        }
        const res = await api.get(url);
        setResultado(res.data);
      }
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao realizar simulação.');
      setResultado(null);
    } finally {
      setCarregando(false);
    }
  };

  const presetsMargem = [10, 15, 20, 25, 30, 35, 40];

  // Cálculo preciso de Embalagem e Etiqueta para o produto
  const getCustoEmbEtiqueta = (p: any) => {
    let custoEmb = 0.0;
    if (p.embalagem_id && embalagens.length > 0) {
      const emb = embalagens.find((e: any) => e.id === p.embalagem_id);
      if (emb && emb.qtd_unidades > 0) {
        custoEmb = emb.custo_pacote / emb.qtd_unidades;
      }
    } else if (p.custo_embalagem) {
      custoEmb = p.custo_embalagem;
    }

    let custoEtiq = 0.04;
    const cfgEtiqueta = configuracoes.find((c: any) => c.chave === 'etiqueta_padrao');
    if (cfgEtiqueta && cfgEtiqueta.qtd_unidades > 0) {
      custoEtiq = cfgEtiqueta.valor_pacote / cfgEtiqueta.qtd_unidades;
    }

    return { custoEmb, custoEtiq };
  };

  // Métodos do Comparativo Geral
  const getPrecoCustom = (sku: string, platId: number, precoBase: number) => {
    const key = `${sku}_${platId}`;
    return customPrecos[key] !== undefined ? customPrecos[key] : (precoBase || 0);
  };

  const setPrecoCustom = (sku: string, platId: number, valor: number) => {
    const key = `${sku}_${platId}`;
    setCustomPrecos(prev => ({ ...prev, [key]: valor }));
  };

  const setMargemCustom = (p: any, plat: any, margemDesejadaPct: number) => {
    const { custoEmb, custoEtiq } = getCustoEmbEtiqueta(p);
    const novoPreco = calcularPrecoPorMargemLocal(margemDesejadaPct, p.custo_produto || 0, custoEmb, custoEtiq, plat);
    setPrecoCustom(p.sku, plat.id, Number(novoPreco.toFixed(2)));
  };

  // Estado e Função de Ordenação para o Comparativo Geral
  const [sortComparativo, setSortComparativo] = useState<{ campo: string; direcao: 'asc' | 'desc' }>({
    campo: 'sku',
    direcao: 'asc'
  });

  const toggleSortComparativo = (campo: string) => {
    if (sortComparativo.campo === campo) {
      setSortComparativo({
        campo,
        direcao: sortComparativo.direcao === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortComparativo({ campo, direcao: 'desc' });
    }
  };

  const renderSortIcon = (campo: string) => {
    if (sortComparativo.campo !== campo) return <span style={{ fontSize: '10px', color: colors.textMuted, marginLeft: '3px' }}>↕</span>;
    return <span style={{ fontSize: '11px', color: colors.accent, marginLeft: '3px' }}>{sortComparativo.direcao === 'asc' ? '▲' : '▼'}</span>;
  };

  // Filtragem dos produtos para o Comparativo Geral
  const prodsComparativoFiltrados = produtos.filter((p) => {
    const isAtivo = p.ativo !== false;
    if (filtroStatusComparativo === 'ativos' && !isAtivo) return false;
    if (filtroStatusComparativo === 'inativos' && isAtivo) return false;

    const b = buscaComparativo.toLowerCase().trim();
    if (b && !p.sku?.toLowerCase().includes(b) && !p.nome?.toLowerCase().includes(b)) {
      return false;
    }

    if (filtroMargemComparativo !== 'todos') {
      let possuiCondicao = false;
      plataformas.forEach((plat) => {
        const pr = getPrecoCustom(p.sku, plat.id, p.preco_venda);
        const { custoEmb, custoEtiq } = getCustoEmbEtiqueta(p);
        const m = calcularMetricasPlataformaLocal(pr, p.custo_produto || 0, custoEmb, custoEtiq, plat);
        if (filtroMargemComparativo === 'prejuizo' && m.lucroLiquido < 0) possuiCondicao = true;
        if (filtroMargemComparativo === 'alerta' && (m.margemFinal * 100) < 10) possuiCondicao = true;
      });
      if (!possuiCondicao) return false;
    }

    return true;
  });

  // Ordenação Dinâmica dos Produtos Filtrados no Comparativo
  const prodsComparativoOrdenados = [...prodsComparativoFiltrados].sort((a, b) => {
    const dir = sortComparativo.direcao === 'asc' ? 1 : -1;
    const campo = sortComparativo.campo;

    if (campo === 'sku') {
      return (a.sku || '').localeCompare(b.sku || '', undefined, { numeric: true, sensitivity: 'base' }) * dir;
    }
    if (campo === 'nome') {
      return (a.nome || '').localeCompare(b.nome || '', undefined, { numeric: true, sensitivity: 'base' }) * dir;
    }
    if (campo === 'custo') {
      const cA_emb = getCustoEmbEtiqueta(a);
      const cB_emb = getCustoEmbEtiqueta(b);
      const cA = (a.custo_produto || 0) + cA_emb.custoEmb + cA_emb.custoEtiq;
      const cB = (b.custo_produto || 0) + cB_emb.custoEmb + cB_emb.custoEtiq;
      return (cA - cB) * dir;
    }

    if (campo.startsWith('preco_')) {
      const platId = Number(campo.replace('preco_', ''));
      const prA = getPrecoCustom(a.sku, platId, a.preco_venda);
      const prB = getPrecoCustom(b.sku, platId, b.preco_venda);
      return (prA - prB) * dir;
    }

    if (campo.startsWith('lucro_')) {
      const platId = Number(campo.replace('lucro_', ''));
      const plat = plataformas.find(p => p.id === platId);
      const prA = getPrecoCustom(a.sku, platId, a.preco_venda);
      const prB = getPrecoCustom(b.sku, platId, b.preco_venda);
      const cA_emb = getCustoEmbEtiqueta(a);
      const cB_emb = getCustoEmbEtiqueta(b);
      const mA = calcularMetricasPlataformaLocal(prA, a.custo_produto || 0, cA_emb.custoEmb, cA_emb.custoEtiq, plat);
      const mB = calcularMetricasPlataformaLocal(prB, b.custo_produto || 0, cB_emb.custoEmb, cB_emb.custoEtiq, plat);
      return (mA.lucroLiquido - mB.lucroLiquido) * dir;
    }

    if (campo.startsWith('margem_')) {
      const platId = Number(campo.replace('margem_', ''));
      const plat = plataformas.find(p => p.id === platId);
      const prA = getPrecoCustom(a.sku, platId, a.preco_venda);
      const prB = getPrecoCustom(b.sku, platId, b.preco_venda);
      const cA_emb = getCustoEmbEtiqueta(a);
      const cB_emb = getCustoEmbEtiqueta(b);
      const mA = calcularMetricasPlataformaLocal(prA, a.custo_produto || 0, cA_emb.custoEmb, cA_emb.custoEtiq, plat);
      const mB = calcularMetricasPlataformaLocal(prB, b.custo_produto || 0, cB_emb.custoEmb, cB_emb.custoEtiq, plat);
      return (mA.margemFinal - mB.margemFinal) * dir;
    }

    return 0;
  });

  // Estatísticas de Resumo do Comparativo
  let totalComBoaMargem = 0;
  let totalComAlerta = 0;
  let totalComPrejuizo = 0;

  const prodsParaKPI = produtos.filter((p) => {
    const isAtivo = p.ativo !== false;
    if (filtroStatusComparativo === 'ativos' && !isAtivo) return false;
    if (filtroStatusComparativo === 'inativos' && isAtivo) return false;
    return true;
  });

  prodsParaKPI.forEach((p) => {
    let temPrejuizo = false;
    let temAlerta = false;
    plataformas.forEach((plat) => {
      const pr = getPrecoCustom(p.sku, plat.id, p.preco_venda);
      const { custoEmb, custoEtiq } = getCustoEmbEtiqueta(p);
      const m = calcularMetricasPlataformaLocal(pr, p.custo_produto || 0, custoEmb, custoEtiq, plat);
      if (m.lucroLiquido < 0) temPrejuizo = true;
      else if ((m.margemFinal * 100) < 10) temAlerta = true;
    });

    if (temPrejuizo) totalComPrejuizo++;
    else if (temAlerta) totalComAlerta++;
    else totalComBoaMargem++;
  });

  return (
    <div>
      <PageHeader
        title="🎯 Simulador de Preço & Margem Ideal"
        subtitle="Simulação bidirecional: calcule o preço ideal a partir da margem desejada ou analise o comparativo geral de preços e margens em todas as plataformas."
      />

      {/* Seletor de Origem (Estoque vs Livre vs Comparativo Geral) */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setModo('existente')}
          style={{
            ...btnStyle,
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: modo === 'existente' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(30, 41, 59, 0.75)',
            border: modo === 'existente' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #334155',
            color: modo === 'existente' ? '#60a5fa' : '#cbd5e1',
            boxShadow: modo === 'existente' ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
            transition: '0.15s ease-in-out'
          }}
        >
          📦 Usar Produto do Estoque
        </button>
        <button
          onClick={() => setModo('livre')}
          style={{
            ...btnStyle,
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: modo === 'livre' ? 'rgba(59, 130, 246, 0.18)' : 'rgba(30, 41, 59, 0.75)',
            border: modo === 'livre' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid #334155',
            color: modo === 'livre' ? '#60a5fa' : '#cbd5e1',
            boxShadow: modo === 'livre' ? '0 2px 8px rgba(59, 130, 246, 0.15)' : 'none',
            transition: '0.15s ease-in-out'
          }}
        >
          💡 Simulação Livre (Novo Produto)
        </button>
        <button
          onClick={() => setModo('comparativo')}
          style={{
            ...btnStyle,
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: modo === 'comparativo' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(30, 41, 59, 0.75)',
            border: modo === 'comparativo' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #334155',
            color: modo === 'comparativo' ? '#34d399' : '#cbd5e1',
            boxShadow: modo === 'comparativo' ? '0 2px 8px rgba(16, 185, 129, 0.15)' : 'none',
            transition: '0.15s ease-in-out'
          }}
        >
          📊 Comparativo Geral
        </button>
      </div>

      {/* VIEW COMPARATIVO GERAL */}
      {modo === 'comparativo' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cards de Resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 500 }}>Total de SKUs</span>
              <strong style={{ fontSize: '22px', color: colors.textPrimary }}>{produtos.length}</strong>
            </div>

            <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '4px solid #34d399' }}>
              <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 500 }}>🟢 Boa Margem (≥ 20%)</span>
              <strong style={{ fontSize: '22px', color: '#34d399' }}>{totalComBoaMargem} SKUs</strong>
            </div>

            <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '4px solid #fbbf24' }}>
              <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 500 }}>⚠️ Margem em Alerta (&lt; 10%)</span>
              <strong style={{ fontSize: '22px', color: '#fbbf24' }}>{totalComAlerta} SKUs</strong>
            </div>

            <div style={{ ...cardStyle, padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '4px solid #f87171' }}>
              <span style={{ fontSize: '12px', color: colors.textSecondary, fontWeight: 500 }}>❌ No Prejuízo (&lt; 0%)</span>
              <strong style={{ fontSize: '22px', color: '#f87171' }}>{totalComPrejuizo} SKUs</strong>
            </div>
          </div>

          {/* Filtros e Busca do Comparativo */}
          <div style={{ ...cardStyle, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Filtro por Status (Ativos / Inativos) */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: 500, marginRight: '2px' }}>Status:</span>
                <button
                  onClick={() => setFiltroStatusComparativo('ativos')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filtroStatusComparativo === 'ativos' ? '1px solid #34d399' : '1px solid #334155',
                    backgroundColor: filtroStatusComparativo === 'ativos' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: filtroStatusComparativo === 'ativos' ? '#34d399' : colors.textMuted
                  }}
                >
                  ✅ Ativos
                </button>
                <button
                  onClick={() => setFiltroStatusComparativo('inativos')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filtroStatusComparativo === 'inativos' ? '1px solid #f87171' : '1px solid #334155',
                    backgroundColor: filtroStatusComparativo === 'inativos' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: filtroStatusComparativo === 'inativos' ? '#f87171' : colors.textMuted
                  }}
                >
                  🚫 Inativos
                </button>
                <button
                  onClick={() => setFiltroStatusComparativo('todos')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filtroStatusComparativo === 'todos' ? '1px solid #60a5fa' : '1px solid #334155',
                    backgroundColor: filtroStatusComparativo === 'todos' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: filtroStatusComparativo === 'todos' ? '#60a5fa' : colors.textMuted
                  }}
                >
                  🌐 Todos
                </button>
              </div>

              <div style={{ width: '1px', height: '24px', backgroundColor: colors.border, margin: '0 4px' }} />

              {/* Filtro por Margens */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: colors.textSecondary, fontWeight: 500, marginRight: '2px' }}>Margens:</span>
                <button
                  onClick={() => setFiltroMargemComparativo('todos')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filtroMargemComparativo === 'todos' ? '1px solid #60a5fa' : '1px solid #334155',
                    backgroundColor: filtroMargemComparativo === 'todos' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: filtroMargemComparativo === 'todos' ? '#60a5fa' : colors.textMuted
                  }}
                >
                  📋 Todas Margens
                </button>
                <button
                  onClick={() => setFiltroMargemComparativo('alerta')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filtroMargemComparativo === 'alerta' ? '1px solid #fbbf24' : '1px solid #334155',
                    backgroundColor: filtroMargemComparativo === 'alerta' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                    color: filtroMargemComparativo === 'alerta' ? '#fbbf24' : colors.textMuted
                  }}
                >
                  ⚠️ Alerta (&lt; 10%)
                </button>
                <button
                  onClick={() => setFiltroMargemComparativo('prejuizo')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: filtroMargemComparativo === 'prejuizo' ? '1px solid #f87171' : '1px solid #334155',
                    backgroundColor: filtroMargemComparativo === 'prejuizo' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: filtroMargemComparativo === 'prejuizo' ? '#f87171' : colors.textMuted
                  }}
                >
                  ❌ Prejuízo (&lt; 0%)
                </button>
              </div>
            </div>

            <input
              type="text"
              placeholder="🔎 Buscar produto por SKU ou nome..."
              value={buscaComparativo}
              onChange={(e) => setBuscaComparativo(e.target.value)}
              style={{
                ...inputStyle,
                width: '100%',
                maxWidth: '280px',
                margin: 0,
                fontSize: '12.5px',
                padding: '6px 12px'
              }}
            />
          </div>

          {/* Tabela Matriz Comparativa Padronizada */}
          <div style={cardStyle}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th colSpan={2} style={{ ...tableHeaderStyle, minWidth: '300px', position: 'sticky', left: 0, zIndex: 12, backgroundColor: colors.bgCard }}>
                      Identificação do Produto
                    </th>
                    <th
                      style={{ ...tableHeaderStyle, width: '100px', textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleSortComparativo('custo')}
                      title="Clique para ordenar por Custo Base"
                    >
                      Custo Base {renderSortIcon('custo')}
                    </th>

                    {plataformas.map((plat) => (
                      <th
                        key={plat.id}
                        colSpan={3}
                        style={{
                          ...tableHeaderStyle,
                          minWidth: '225px',
                          width: '225px',
                          textAlign: 'center',
                          borderLeft: `2px solid ${colors.border}`,
                          backgroundColor: 'rgba(30, 41, 59, 0.8)'
                        }}
                      >
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <PlatformIcon nome={plat.nome} icone={plat.icone} size={16} />
                          <span>{plat.nome}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th
                      style={{ ...tableHeaderStyle, width: '40px', minWidth: '40px', position: 'sticky', left: 0, zIndex: 12, backgroundColor: colors.bgCard, fontSize: '11px', color: colors.accent, padding: '8px 2px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleSortComparativo('sku')}
                      title="Clique para ordenar por SKU"
                    >
                      SKU {renderSortIcon('sku')}
                    </th>
                    <th
                      style={{ ...tableHeaderStyle, minWidth: '260px', position: 'sticky', left: '40px', zIndex: 12, backgroundColor: colors.bgCard, fontSize: '11px', color: colors.textSecondary, cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleSortComparativo('nome')}
                      title="Clique para ordenar de A-Z ou Z-A por Nome"
                    >
                      Nome do Produto {renderSortIcon('nome')}
                    </th>
                    <th
                      style={{ ...tableHeaderStyle, width: '100px', fontSize: '11px', color: colors.textMuted, textAlign: 'right', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleSortComparativo('custo')}
                      title="Clique para ordenar por Custo Insumos + Produto"
                    >
                      (Prod + Emb) {renderSortIcon('custo')}
                    </th>

                    {plataformas.map((plat) => (
                      <FragmentKey key={plat.id}>
                        <th
                          style={{ ...tableHeaderStyle, width: '75px', minWidth: '75px', maxWidth: '75px', fontSize: '11px', textAlign: 'center', borderLeft: `2px solid ${colors.border}`, color: '#60a5fa', cursor: 'pointer', userSelect: 'none', padding: '6px 2px' }}
                          onClick={() => toggleSortComparativo(`preco_${plat.id}`)}
                          title={`Clique para ordenar por Preço Venda em ${plat.nome}`}
                        >
                          Preço {renderSortIcon(`preco_${plat.id}`)}
                        </th>
                        <th
                          style={{ ...tableHeaderStyle, width: '75px', minWidth: '75px', maxWidth: '75px', fontSize: '11px', textAlign: 'center', color: '#34d399', cursor: 'pointer', userSelect: 'none', padding: '6px 2px' }}
                          onClick={() => toggleSortComparativo(`lucro_${plat.id}`)}
                          title={`Clique para ordenar por Lucro Líquido em ${plat.nome}`}
                        >
                          Lucro {renderSortIcon(`lucro_${plat.id}`)}
                        </th>
                        <th
                          style={{ ...tableHeaderStyle, width: '75px', minWidth: '75px', maxWidth: '75px', fontSize: '11px', textAlign: 'center', color: colors.textSecondary, cursor: 'pointer', userSelect: 'none', padding: '6px 2px' }}
                          onClick={() => toggleSortComparativo(`margem_${plat.id}`)}
                          title={`Clique para ordenar por Margem % em ${plat.nome}`}
                        >
                          Margem {renderSortIcon(`margem_${plat.id}`)}
                        </th>
                      </FragmentKey>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prodsComparativoOrdenados.length === 0 ? (
                    <tr>
                      <td colSpan={3 + plataformas.length * 3} style={{ ...tableCellStyle, textAlign: 'center', color: colors.textMuted, padding: '30px' }}>
                        Nenhum produto encontrado no comparativo.
                      </td>
                    </tr>
                  ) : (
                    prodsComparativoOrdenados.map((p) => {
                      const { custoEmb, custoEtiq } = getCustoEmbEtiqueta(p);
                      const custoTotalBase = (p.custo_produto || 0) + custoEmb + custoEtiq;

                      return (
                        <tr key={p.sku} style={{ borderBottom: `1px solid ${colors.border}` }}>
                          {/* Coluna 1: SKU Ultra Compacta 40px Fixa */}
                          <td style={{ ...tableCellStyle, width: '40px', minWidth: '40px', position: 'sticky', left: 0, zIndex: 10, backgroundColor: colors.bgCard, padding: '6px 2px', textAlign: 'center', height: '42px', boxSizing: 'border-box' }}>
                            <strong style={{ color: colors.accent, fontSize: '12.5px' }}>{p.sku}</strong>
                          </td>

                          {/* Coluna 2: Nome do Produto Fixa a partir de 40px */}
                          <td style={{ ...tableCellStyle, minWidth: '260px', position: 'sticky', left: '40px', zIndex: 10, backgroundColor: colors.bgCard, padding: '6px 8px', height: '42px', boxSizing: 'border-box' }}>
                            <span style={{ color: p.ativo === false ? colors.textMuted : colors.textPrimary, fontSize: '12.5px', fontWeight: 500 }} title={p.nome}>
                              {p.nome}
                              {p.ativo === false && (
                                <span style={{ fontSize: '10px', color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: '1px 5px', borderRadius: '4px', marginLeft: '6px', fontWeight: 700 }}>
                                  INATIVO
                                </span>
                              )}
                            </span>
                          </td>

                          {/* Coluna 3: Custo Base (Produto + Embalagem + Etiqueta) */}
                          <td style={{ ...tableCellStyle, width: '100px', textAlign: 'right', fontWeight: 600, color: colors.textSecondary, padding: '6px 8px', height: '42px', boxSizing: 'border-box' }}>
                            {formatarMoeda(custoTotalBase)}
                          </td>

                          {plataformas.map((plat) => {
                            const precoAtual = getPrecoCustom(p.sku, plat.id, p.preco_venda);
                            const metricas = calcularMetricasPlataformaLocal(precoAtual, p.custo_produto || 0, custoEmb, custoEtiq, plat);
                            const margemPct = metricas.margemFinal * 100;
                            const ehPrejuizo = metricas.lucroLiquido < 0;
                            const ehAlerta = margemPct < 10 && !ehPrejuizo;

                            let bgMargem = 'rgba(59, 130, 246, 0.15)';
                            let colorMargem = '#60a5fa';
                            if (ehPrejuizo) {
                              bgMargem = 'rgba(239, 68, 68, 0.25)';
                              colorMargem = '#f87171';
                            } else if (ehAlerta) {
                              bgMargem = 'rgba(245, 158, 11, 0.2)';
                              colorMargem = '#fbbf24';
                            } else if (margemPct >= 20) {
                              bgMargem = 'rgba(16, 185, 129, 0.2)';
                              colorMargem = '#34d399';
                            }

                            return (
                              <FragmentKey key={plat.id}>
                                {/* Coluna 1: Preço Editável (Padronizada 75px) */}
                                <td style={{ ...tableCellStyle, width: '75px', minWidth: '75px', maxWidth: '75px', borderLeft: `2px solid ${colors.border}`, padding: '4px 2px', textAlign: 'center', height: '42px', boxSizing: 'border-box' }}>
                                  <input
                                    type="number"
                                    step="0.10"
                                    value={precoAtual || ''}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value);
                                      setPrecoCustom(p.sku, plat.id, isNaN(val) ? 0 : val);
                                    }}
                                    style={{
                                      ...inputStyle,
                                      width: '64px',
                                      margin: 0,
                                      padding: '3px 2px',
                                      fontSize: '11px',
                                      textAlign: 'center',
                                      borderColor: ehPrejuizo ? '#f87171' : colors.border
                                    }}
                                  />
                                </td>

                                {/* Coluna 2: Lucro Líquido Calculado na Hora (Padronizada 75px) */}
                                <td style={{ ...tableCellStyle, width: '75px', minWidth: '75px', maxWidth: '75px', textAlign: 'center', padding: '4px 2px', height: '42px', boxSizing: 'border-box' }}>
                                  <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: ehPrejuizo ? '#f87171' : '#34d399'
                                  }}>
                                    {formatarMoeda(metricas.lucroLiquido)}
                                  </span>
                                </td>

                                {/* Coluna 3: Margem % Calculada ou Editável (Padronizada 75px) */}
                                <td style={{ ...tableCellStyle, width: '75px', minWidth: '75px', maxWidth: '75px', textAlign: 'center', padding: '4px 2px', height: '42px', boxSizing: 'border-box' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', justifyContent: 'center' }}>
                                    <input
                                      type="number"
                                      step="1"
                                      value={isNaN(margemPct) ? 0 : Number(margemPct.toFixed(1))}
                                      onChange={(e) => {
                                        const mVal = parseFloat(e.target.value);
                                        if (!isNaN(mVal)) {
                                          setMargemCustom(p, plat, mVal);
                                        }
                                      }}
                                      style={{
                                        width: '42px',
                                        padding: '3px 1px',
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        borderRadius: '4px',
                                        border: `1px solid ${colorMargem}`,
                                        backgroundColor: bgMargem,
                                        color: colorMargem,
                                        textAlign: 'center',
                                        boxSizing: 'border-box'
                                      }}
                                    />
                                    <span style={{ fontSize: '9.5px', color: colorMargem, fontWeight: 700 }}>%</span>
                                  </div>
                                </td>
                              </FragmentKey>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* MODOS EXISTENTE & LIVRE */
        <div>
          {/* Seletor de Tipo de Simulação (Margem % vs Preço R$) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', backgroundColor: colors.bgCard, padding: '10px 16px', borderRadius: '10px', border: `1px solid ${colors.border}`, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: colors.textSecondary }}>Modo de Cálculo:</span>
            <button
              type="button"
              onClick={() => setTipoCalculo('margem')}
              style={{
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                borderRadius: '6px',
                border: tipoCalculo === 'margem' ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid transparent',
                backgroundColor: tipoCalculo === 'margem' ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                color: tipoCalculo === 'margem' ? '#60a5fa' : colors.textMuted,
                cursor: 'pointer',
                transition: '0.15s'
              }}
            >
              🎯 Descobrir Preço (por Margem % Desejada)
            </button>
            <button
              type="button"
              onClick={() => setTipoCalculo('preco')}
              style={{
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                borderRadius: '6px',
                border: tipoCalculo === 'preco' ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid transparent',
                backgroundColor: tipoCalculo === 'preco' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                color: tipoCalculo === 'preco' ? '#34d399' : colors.textMuted,
                cursor: 'pointer',
                transition: '0.15s'
              }}
            >
              💰 Descobrir Lucro & Margem (por Preço R$ Informado)
            </button>
          </div>

          {/* Painel Principal de Simulação */}
          <div style={{ ...cardStyle, marginBottom: '24px' }}>
            <h3 style={{ ...cardTitleStyle, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚙️</span> {tipoCalculo === 'margem' ? 'Parâmetros da Simulação' : 'Informar Preço de Venda para Simulação'}
            </h3>
            <p style={{ ...cardDescStyle, marginBottom: '20px' }}>
              {tipoCalculo === 'margem'
                ? 'Informe a margem de lucro líquido desejada (%) para o sistema calcular o preço de venda recomendado.'
                : 'Informe o preço de venda desejado (R$) para consultar a margem final e o lucro líquido em cada plataforma.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: modo === 'existente' ? '2fr 1fr' : '1fr 1fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
              {modo === 'existente' ? (
                <div>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                    Selecione o Produto:
                  </label>
                  <SeletorProdutoComBusca
                    produtos={produtos}
                    skuSelecionado={skuSelecionado}
                    onSelectSku={setSkuSelecionado}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                      Custo da Mercadoria (R$):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={custoProdutoLivre}
                      onChange={e => setCustoProdutoLivre(e.target.value)}
                      style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                      Embalagem / Caixas (Insumo):
                    </label>
                    <select
                      value={embalagemIdLivre}
                      onChange={e => setEmbalagemIdLivre(e.target.value)}
                      style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0, color: colors.textPrimary }}
                    >
                      <option value="">-- Sem Embalagem (Caixa Própria) --</option>
                      {embalagens.map(emb => (
                        <option key={emb.id} value={emb.id}>
                          {emb.nome} ({formatarMoeda(emb.custo_pacote / emb.qtd_unidades)}/un)
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {tipoCalculo === 'margem' ? (
                <div>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                    Margem de Lucro Desejada (%):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={margemDesejada}
                    onChange={e => setMargemDesejada(Number(e.target.value))}
                    style={{
                      ...inputStyle,
                      width: '100%',
                      maxWidth: 'none',
                      margin: 0,
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: '#60a5fa',
                      padding: '10px 14px'
                    }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                    Preço de Venda Simulado (R$):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={precoVendaInformado}
                    onChange={e => setPrecoVendaInformado(e.target.value)}
                    style={{
                      ...inputStyle,
                      width: '100%',
                      maxWidth: 'none',
                      margin: 0,
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: '#34d399',
                      padding: '10px 14px'
                    }}
                  />
                </div>
              )}
            </div>

            {tipoCalculo === 'margem' && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: colors.textMuted, marginRight: '4px' }}>Atalhos de Margem:</span>
                {presetsMargem.map(p => (
                  <button
                    key={p}
                    onClick={() => setMargemDesejada(p)}
                    style={{
                      ...btnNeutralStyle,
                      padding: '6px 14px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: margemDesejada === p ? '1px solid #60a5fa' : `1px solid ${colors.border}`,
                      backgroundColor: margemDesejada === p ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                      color: margemDesejada === p ? '#60a5fa' : colors.textSecondary
                    }}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Painel de Resultados */}
          {carregando ? (
            <SkeletonTable rows={4} cols={5} />
          ) : erro ? (
            <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.dangerText}`, color: colors.dangerText }}>
              ⚠️ {erro}
            </div>
          ) : resultado ? (
            <div style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ ...cardTitleStyle, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>📊</span> 2. Resultado da Precificação
                  </h3>
                  <span style={{ fontSize: '13px', color: colors.textSecondary }}>
                    Produto: <strong>{resultado.nome || resultado.produto_nome || (modo === 'existente' ? skuSelecionado : 'Simulação Livre')}</strong> — Custo Total Base: <strong style={{ color: colors.accent }}>{formatarMoeda(resultado.custo_base_total !== undefined ? resultado.custo_base_total : ((resultado.custo_produto || 0) + (resultado.custo_embalagem || 0) + (resultado.custo_etiqueta || 0)))}</strong>
                  </span>
                </div>
              </div>

              <div className="table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={tableHeaderStyle}>Plataforma</th>
                      <th style={tableHeaderStyle}>
                        {tipoCalculo === 'margem' ? 'Preço Recomendado' : 'Preço Simulado'}
                      </th>
                      <th style={tableHeaderStyle}>
                        {tipoCalculo === 'margem' ? 'Margem Esperada' : 'Margem Alcançada'}
                      </th>
                      <th style={tableHeaderStyle}>
                        {tipoCalculo === 'margem' ? 'Lucro Líquido Estimado' : 'Lucro Líquido Real'}
                      </th>
                      <th style={tableHeaderStyle}>Taxas Totais de Plataforma</th>
                      {tipoCalculo === 'preco' && <th style={tableHeaderStyle}>ROAS Mínimo</th>}
                      <th style={tableHeaderStyle}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.simulacoes?.map((sim: any) => (
                      <tr key={sim.plataforma_id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                        <td style={tableCellStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                            <PlatformIcon nome={sim.plataforma_nome} icone={sim.icone} size={18} />
                            {sim.plataforma_nome}
                          </div>
                        </td>

                        <td style={tableCellStyle}>
                          {sim.inviavel ? (
                            <span style={{ color: colors.dangerText }}>Inviável</span>
                          ) : (
                            <strong style={{ color: colors.cyan, fontSize: '15px' }}>
                              {formatarMoeda(
                                sim.preco_sugerido !== undefined
                                  ? sim.preco_sugerido
                                  : (sim.preco_venda !== undefined
                                    ? sim.preco_venda
                                    : (sim.preco_venda_calculado || sim.preco_venda_simulado || 0))
                              )}
                            </strong>
                          )}
                        </td>

                        <td style={tableCellStyle}>
                          {sim.inviavel ? (
                            <span style={{ color: colors.dangerText }}>—</span>
                          ) : (
                            <strong style={{ color: (sim.margem_desejada_pct ?? sim.margem_liquida_alvo ?? sim.margem_liquida_real ?? (sim.margem_final !== undefined ? sim.margem_final * 100 : 0)) > 0 ? colors.successText : colors.dangerText }}>
                              {formatarNumero(
                                sim.margem_desejada_pct !== undefined
                                  ? sim.margem_desejada_pct
                                  : (sim.margem_liquida_alvo !== undefined
                                    ? sim.margem_liquida_alvo
                                    : (sim.margem_liquida_real !== undefined
                                      ? sim.margem_liquida_real
                                      : (sim.margem_final !== undefined ? sim.margem_final * 100 : 0)))
                              )}%
                            </strong>
                          )}
                        </td>

                        <td style={tableCellStyle}>
                          {sim.inviavel ? (
                            <span style={{ color: colors.dangerText }}>{formatarMoeda(sim.lucro_liquido)}</span>
                          ) : (
                            <strong style={{ color: colors.successText, fontSize: '15px' }}>
                              {formatarMoeda(sim.lucro_liquido)}
                            </strong>
                          )}
                        </td>

                        <td style={tableCellStyle}>
                          {sim.inviavel ? (
                            <span style={{ color: colors.dangerText }}>—</span>
                          ) : (
                            <span style={{ color: '#EE6C6D' }}>
                              {formatarMoeda(sim.taxa_plataforma_real + sim.taxa_fixa)}
                            </span>
                          )}
                        </td>

                        {tipoCalculo === 'preco' && (
                          <td style={tableCellStyle}>
                            <strong style={{ color: '#e2e8f0' }}>{formatarNumero(sim.roas_minimo)}</strong>
                          </td>
                        )}

                        <td style={tableCellStyle}>
                          {sim.inviavel ? (
                            <span style={{ color: colors.dangerText, backgroundColor: '#7f1d1d', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                              ⚠️ {tipoCalculo === 'preco' ? 'Prejuízo / Inviável' : 'Margem Inviável'}
                            </span>
                          ) : (
                            <span style={{ color: colors.successText, backgroundColor: colors.successBg, border: `1px solid ${colors.successBorder}`, padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                              ✅ {tipoCalculo === 'preco' ? 'Lucrativo' : 'Viável'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

// FragmentKey helper
function FragmentKey({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
