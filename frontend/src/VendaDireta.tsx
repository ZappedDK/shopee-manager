import React, { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import { PageHeader } from './ui';
import {
  colors, cardStyle, cardTitleStyle, cardDescStyle,
  inputStyle, btnSuccessStyle, btnNeutralStyle,
  formatarMoeda
} from './theme';

interface BaixaVendaManualProps {
  mostrarMensagem: (msg: string, duracao?: number) => void;
  carregarEstoqueGlobal?: () => void;
}

function calcularTaxasPlataforma(precoVenda: number, plataforma: any) {
  if (!plataforma) return { taxaPct: 0, taxaFixa: 0, valorTaxaTotal: 0, taxaDesc: 'Isento (Venda Direta)' };
  
  const nomeLower = (plataforma.nome || '').toLowerCase();
  const taxaExtra = Number(plataforma.taxa_extra || 0);

  // Faixas JSON customizadas se houver
  if (plataforma.faixas_json) {
    try {
      const faixas = typeof plataforma.faixas_json === 'string' ? JSON.parse(plataforma.faixas_json) : plataforma.faixas_json;
      if (Array.isArray(faixas) && faixas.length > 0) {
        const faixasOrdenadas = [...faixas].sort((a, b) => Number(a.de_valor || 0) - Number(b.de_valor || 0));
        for (const f of faixasOrdenadas) {
          const ate = f.ate_valor;
          if (ate === null || ate === undefined || ate === 0 || precoVenda <= Number(ate)) {
            let tp = Number(f.taxa_percentual || 0);
            if (tp > 1.0) tp = tp / 100.0;
            const tf = Number(f.taxa_fixa || 0);
            const taxaPct = tp + taxaExtra;
            const taxaFixa = tf;
            return {
              taxaPct,
              taxaFixa,
              valorTaxaTotal: (precoVenda * taxaPct) + taxaFixa,
              taxaDesc: `${plataforma.nome} (${(taxaPct * 100).toFixed(0)}% + R$ ${taxaFixa.toFixed(2)})`
            };
          }
        }
      }
    } catch (e) {
      console.error('Erro faixas json:', e);
    }
  }

  // Regras Específicas por Plataforma (compatível com financeiro.py)
  if (nomeLower.includes('shopee')) {
    let taxaPct = 0.14;
    let taxaFixa = 4.00;
    if (precoVenda <= 79.99) {
      taxaPct = 0.20 + taxaExtra;
      taxaFixa = 4.00;
    } else if (precoVenda <= 99.99) {
      taxaPct = 0.14 + taxaExtra;
      taxaFixa = 16.00;
    } else if (precoVenda <= 199.99) {
      taxaPct = 0.14 + taxaExtra;
      taxaFixa = 20.00;
    } else {
      taxaPct = 0.14 + taxaExtra;
      taxaFixa = 26.00;
    }
    const valorTaxaTotal = (precoVenda * taxaPct) + taxaFixa;
    return {
      taxaPct,
      taxaFixa,
      valorTaxaTotal,
      taxaDesc: `Shopee (${(taxaPct * 100).toFixed(0)}% + R$ ${taxaFixa.toFixed(2)})`
    };
  }

  if (nomeLower.includes('tiktok') || nomeLower.includes('tik tok')) {
    let taxaPct = 0.06;
    let taxaFixa = 4.00;
    if (precoVenda <= 50.00) {
      taxaPct = 0.10 + taxaExtra;
      taxaFixa = 4.00;
    } else {
      taxaPct = 0.06 + taxaExtra;
      taxaFixa = 6.00;
    }
    const valorTaxaTotal = (precoVenda * taxaPct) + taxaFixa;
    return {
      taxaPct,
      taxaFixa,
      valorTaxaTotal,
      taxaDesc: `TikTok Shop (${(taxaPct * 100).toFixed(0)}% + R$ ${taxaFixa.toFixed(2)})`
    };
  }

  if (nomeLower.includes('mercado livre') || nomeLower.includes('mercadolivre') || nomeLower.includes('ml')) {
    let taxaBase = (plataforma.taxa_plataforma || 0) / 100;
    if (taxaBase === 0) taxaBase = nomeLower.includes('premium') ? 0.19 : 0.14;
    let taxaFixa = 0;
    if (precoVenda < 12.50) {
      taxaFixa = precoVenda * 0.50;
    } else if (precoVenda < 79.00) {
      taxaFixa = 6.00;
    } else {
      taxaFixa = 0.00;
    }
    const taxaPct = taxaBase + taxaExtra;
    const valorTaxaTotal = (precoVenda * taxaPct) + taxaFixa;
    return {
      taxaPct,
      taxaFixa,
      valorTaxaTotal,
      taxaDesc: `Mercado Livre (${(taxaPct * 100).toFixed(0)}% + R$ ${taxaFixa.toFixed(2)})`
    };
  }

  // Fallback genérico
  const taxaPct = ((plataforma.taxa_comissao_pct || plataforma.taxa_plataforma || 0) / 100) + taxaExtra;
  const taxaFixa = plataforma.taxa_fixa || 0;
  const valorTaxaTotal = (precoVenda * taxaPct) + taxaFixa;
  return {
    taxaPct,
    taxaFixa,
    valorTaxaTotal,
    taxaDesc: `${plataforma.nome} (${(taxaPct * 100).toFixed(0)}% + R$ ${taxaFixa.toFixed(2)})`
  };
}

function SeletorProdutoVenda({ produtos, skuSelecionado, onSelectSku }: { produtos: any[]; skuSelecionado: string; onSelectSku: (sku: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const produtoAtual = produtos.find(p => p.sku === skuSelecionado);

  const produtosFiltrados = produtos.filter((p) => {
    if (!p.ativo) return false;
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
          {produtoAtual ? (
            <>
              📦 <strong style={{ color: colors.accent }}>{produtoAtual.sku}</strong> — {produtoAtual.nome} (Estoque: <strong style={{ color: produtoAtual.quantidade_estoque > 0 ? '#34d399' : '#f87171' }}>{produtoAtual.quantidade_estoque} un</strong>)
            </>
          ) : 'Selecione um produto do estoque...'}
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
                Nenhum produto ativo encontrado
              </div>
            ) : (
              produtosFiltrados.map((p) => {
                const selecionado = p.sku === skuSelecionado;
                const semEstoque = p.quantidade_estoque <= 0;
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
                    <span style={{ fontSize: '12px', color: semEstoque ? '#f87171' : '#34d399', fontWeight: 600, marginLeft: '8px' }}>
                      {semEstoque ? '⚠️ Zerado (0 un)' : `${p.quantidade_estoque} un em estoque`}
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

interface SeletorPlataformaVendaProps {
  plataformas: any[];
  plataformaIdStr: string;
  onSelectPlataforma: (id: string) => void;
}

function SeletorPlataformaVenda({ plataformas, plataformaIdStr, onSelectPlataforma }: SeletorPlataformaVendaProps) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const opcaoAtual = plataformaIdStr === 'direta'
    ? { id: 'direta', nome: '🤝 Venda Direta / Balcão (Sem Taxas)' }
    : plataformas.find(p => String(p.id) === plataformaIdStr);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const opcoes = [
    { id: 'direta', nome: '🤝 Venda Direta / Balcão (Sem Taxas)' },
    ...plataformas.map(p => ({ id: String(p.id), nome: `🛒 ${p.nome}` }))
  ];

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
        <span style={{ color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
          {opcaoAtual ? opcaoAtual.nome : 'Selecione a plataforma...'}
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
            padding: '6px',
          }}
        >
          {opcoes.map((op) => {
            const selecionado = String(op.id) === plataformaIdStr;
            return (
              <div
                key={op.id}
                onClick={() => {
                  onSelectPlataforma(String(op.id));
                  setAberto(false);
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
                <span>{op.nome}</span>
                {selecionado && <span style={{ color: colors.accent, fontWeight: 'bold' }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SeletorFormaPagamentoProps {
  formaPagamento: string;
  onSelectForma: (forma: string) => void;
}

function SeletorFormaPagamento({ formaPagamento, onSelectForma }: SeletorFormaPagamentoProps) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const opcoes = [
    { id: 'PIX', nome: '⚡ PIX' },
    { id: 'Dinheiro', nome: '💵 Dinheiro' },
    { id: 'Cartão de Crédito', nome: '💳 Cartão de Crédito' },
    { id: 'Cartão de Débito', nome: '💳 Cartão de Débito' },
    { id: 'Outros', nome: '🔄 Outros' }
  ];

  const opcaoAtual = opcoes.find(o => o.id === formaPagamento) || opcoes[0];

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
        <span style={{ color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
          {opcaoAtual ? opcaoAtual.nome : formaPagamento}
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
            padding: '6px',
          }}
        >
          {opcoes.map((op) => {
            const selecionado = op.id === formaPagamento;
            return (
              <div
                key={op.id}
                onClick={() => {
                  onSelectForma(op.id);
                  setAberto(false);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  backgroundColor: selecionado ? 'rgba(59,130,246,0.2)' : 'transparent',
                  color: selecionado ? '#60a5fa' : colors.textPrimary,
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
                <span>{op.nome}</span>
                {selecionado && <span style={{ color: colors.accent, fontWeight: 'bold' }}>✓</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function VendaDireta({ mostrarMensagem, carregarEstoqueGlobal }: BaixaVendaManualProps) {
  const [produtos, setProdutos] = useState<any[]>([]);
  const [plataformas, setPlataformas] = useState<any[]>([]);
  const [embalagens, setEmbalagens] = useState<any[]>([]);

  const [configuracoes, setConfiguracoes] = useState<any[]>([]);

  // Formulário de Baixa Manual de Venda
  const [skuSelecionado, setSkuSelecionado] = useState('');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [plataformaIdStr, setPlataformaIdStr] = useState<string>('direta'); // 'direta' ou ID numérico
  const [formaPagamento, setFormaPagamento] = useState<string>('PIX');
  const [precoUnitarioStr, setPrecoUnitarioStr] = useState<string>('');
  const [incluirEmbalagem, setIncluirEmbalagem] = useState<boolean>(true);
  const [incluirEtiqueta, setIncluirEtiqueta] = useState<boolean>(true);
  const [observacao, setObservacao] = useState<string>('');
  const [salvando, setSalvando] = useState<boolean>(false);
  const [modalConfirmacaoAberto, setModalConfirmacaoAberto] = useState<boolean>(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [resProd, resPlat, resEmb, resCfg] = await Promise.all([
        api.get('/produtos/detalhados'),
        api.get('/plataformas/'),
        api.get('/embalagens/'),
        api.get('/configuracoes/')
      ]);
      setProdutos(resProd.data || []);
      setPlataformas(resPlat.data || []);
      setEmbalagens(resEmb.data || []);
      setConfiguracoes(resCfg.data || []);
    } catch (err) {
      console.error('Erro ao carregar dados para Baixa Venda Manual:', err);
    }
  };

  const prodSelecionado = produtos.find(p => p.sku === skuSelecionado);
  const plataformaSelecionada = plataformaIdStr !== 'direta' 
    ? plataformas.find(p => String(p.id) === plataformaIdStr)
    : null;

  // Atualiza preço cobrado padrão ao selecionar produto ou mudar plataforma
  useEffect(() => {
    if (!prodSelecionado) return;
    if (plataformaSelecionada) {
      const analisePlat = prodSelecionado.analises_plataformas?.find((a: any) => a.plataforma_id === plataformaSelecionada.id);
      if (analisePlat && analisePlat.preco_sugerido) {
        setPrecoUnitarioStr(String(analisePlat.preco_sugerido));
      } else {
        setPrecoUnitarioStr(String(prodSelecionado.preco_venda || ''));
      }
    } else {
      setPrecoUnitarioStr(String(prodSelecionado.preco_venda || ''));
    }
  }, [skuSelecionado, plataformaIdStr]);

  // Trava de Estoque Insuficiente
  const estoqueAtual = prodSelecionado ? (prodSelecionado.quantidade_estoque || 0) : 0;
  const estoqueInsuficiente = prodSelecionado ? (quantidade > estoqueAtual) : false;

  // Cálculos Financeiros em Tempo Real
  const precoUnitarioNum = parseFloat(precoUnitarioStr.replace(',', '.')) || (prodSelecionado?.preco_venda || 0);
  const custoProdNum = prodSelecionado?.custo_produto || 0;

  // Embalagem e Etiqueta reais do sistema
  let custoEmbNum = 0;
  if (incluirEmbalagem && prodSelecionado?.embalagem_id && embalagens.length > 0) {
    const emb = embalagens.find(e => e.id === prodSelecionado.embalagem_id);
    if (emb && emb.qtd_unidades > 0) {
      custoEmbNum = emb.custo_pacote / emb.qtd_unidades;
    }
  }

  let custoEtiqNum = 0;
  if (incluirEtiqueta) {
    const cfgEtiqueta = configuracoes.find(c => c.chave === 'etiqueta_padrao');
    if (cfgEtiqueta && cfgEtiqueta.qtd_unidades > 0) {
      custoEtiqNum = cfgEtiqueta.valor_pacote / cfgEtiqueta.qtd_unidades;
    } else {
      custoEtiqNum = 0.04;
    }
  }

  // Taxa de Plataforma exata baseada nas faixas reais
  const taxaInfo = calcularTaxasPlataforma(precoUnitarioNum, plataformaSelecionada);
  const taxaPlataformaUnitario = taxaInfo.valorTaxaTotal;

  const custoTotalUnitario = custoProdNum + custoEmbNum + custoEtiqNum + taxaPlataformaUnitario;
  const lucroUnitario = precoUnitarioNum - custoTotalUnitario;
  const receitaTotal = precoUnitarioNum * quantidade;
  const taxaTotal = taxaPlataformaUnitario * quantidade;
  const lucroTotal = lucroUnitario * quantidade;
  const margemPct = receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0;

  const handleSubmitVenda = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skuSelecionado) {
      mostrarMensagem('❌ Selecione um produto para dar baixa.', 4000);
      return;
    }
    if (estoqueInsuficiente) {
      mostrarMensagem(`❌ Trava de Estoque: Estoque insuficiente! (Atual: ${estoqueAtual} un, Solicitado: ${quantidade} un).`, 6000);
      return;
    }
    setModalConfirmacaoAberto(true);
  };

  const executarBaixaVenda = async () => {
    try {
      setSalvando(true);
      const payload = {
        sku: skuSelecionado,
        quantidade: Number(quantidade),
        plataforma_id: plataformaIdStr !== 'direta' ? Number(plataformaIdStr) : null,
        forma_pagamento: plataformaIdStr === 'direta' ? formaPagamento : null,
        preco_venda_unitario: precoUnitarioNum,
        incluir_embalagem: incluirEmbalagem,
        incluir_etiqueta: incluirEtiqueta,
        observacao: observacao.trim() || undefined
      };

      await api.post('/vendas/baixa-manual', payload);
      mostrarMensagem(`🎉 Baixa de venda concluída com sucesso! ${quantidade} un. do SKU '${skuSelecionado}' abatidas no estoque.`, 6000);

      // Reseta formulário e fecha modal
      setModalConfirmacaoAberto(false);
      setSkuSelecionado('');
      setQuantidade(1);
      setPrecoUnitarioStr('');
      setObservacao('');

      await carregarDados();
      if (carregarEstoqueGlobal) carregarEstoqueGlobal();
    } catch (err: any) {
      const erroMsg = err.response?.data?.detail || 'Erro ao registrar baixa de venda.';
      mostrarMensagem(`❌ ${erroMsg}`, 7000);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="🤝 Baixa de Venda Manual"
        subtitle="Registre vendas manuais e dê baixa imediata no estoque para Shopee, TikTok, Mercado Livre ou Venda Direta (balcão)."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* Formulário de Baixa */}
        <div style={{ ...cardStyle, borderLeft: `4px solid ${colors.success}` }}>
          <h3 style={{ ...cardTitleStyle, color: '#34d399', marginBottom: '4px' }}>
            📝 Dar Baixa de Venda no Estoque
          </h3>
          <p style={{ ...cardDescStyle, marginBottom: '20px' }}>
            Selecione a plataforma de venda ou opção direta e informe a quantidade vendida.
          </p>

          <form onSubmit={handleSubmitVenda} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Seleção do Produto */}
            <div>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>
                📦 Produto Vendido:
              </label>
              <SeletorProdutoVenda
                produtos={produtos}
                skuSelecionado={skuSelecionado}
                onSelectSku={setSkuSelecionado}
              />
            </div>

            {/* Trava de Estoque Visual */}
            {prodSelecionado && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: estoqueInsuficiente ? 'rgba(239, 68, 68, 0.18)' : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${estoqueInsuficiente ? '#f87171' : 'rgba(16, 185, 129, 0.4)'}`,
                  color: estoqueInsuficiente ? '#f87171' : '#34d399',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {estoqueInsuficiente ? (
                  <>
                    <span>🛑</span>
                    <span>TRAVA DE ESTOQUE: Estoque insuficiente! (Disponível: {estoqueAtual} un | Solicitado: {quantidade} un)</span>
                  </>
                ) : (
                  <>
                    <span>✅</span>
                    <span>Estoque disponível: <strong>{estoqueAtual} un.</strong></span>
                  </>
                )}
              </div>
            )}

            {/* Plataforma de Venda e Forma de Pagamento */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: plataformaIdStr === 'direta' ? 1 : '1 1 100%', width: '100%', minWidth: '180px' }}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>
                  🏪 Plataforma da Venda:
                </label>
                <SeletorPlataformaVenda
                  plataformas={plataformas}
                  plataformaIdStr={plataformaIdStr}
                  onSelectPlataforma={setPlataformaIdStr}
                />
              </div>

              {/* Opção de Forma de Pagamento (EXIBIDA APENAS PARA VENDA DIRETA) */}
              {plataformaIdStr === 'direta' && (
                <div style={{ flex: 1, minWidth: '160px' }}>
                  <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 600 }}>
                    💳 Forma de Pagamento:
                  </label>
                  <SeletorFormaPagamento
                    formaPagamento={formaPagamento}
                    onSelectForma={setFormaPagamento}
                  />
                </div>
              )}
            </div>

            {/* Quantidade e Preço Cobrado */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '130px' }}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                  Quantidade Vendida:
                </label>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.max(1, Number(e.target.value)))}
                  style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0, fontWeight: 'bold' }}
                />
              </div>

              <div style={{ flex: 1.5, minWidth: '160px' }}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
                  Preço Cobrado Unitário (R$):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={precoUnitarioStr}
                  onChange={(e) => setPrecoUnitarioStr(e.target.value)}
                  placeholder="Ex: 69.99"
                  style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0, fontWeight: 'bold', color: '#60a5fa' }}
                />
              </div>
            </div>

            {/* Opções de Insumos */}
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', backgroundColor: colors.bgInput, padding: '12px 14px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary, fontSize: '12.5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={incluirEmbalagem}
                  onChange={(e) => setIncluirEmbalagem(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                Incluir custo de Embalagem?
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary, fontSize: '12.5px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={incluirEtiqueta}
                  onChange={(e) => setIncluirEtiqueta(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                Incluir custo de Etiqueta ({formatarMoeda(custoEtiqNum)})?
              </label>
            </div>

            {/* Observação */}
            <div>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px' }}>
                Observação / Identificação do Cliente (Opcional):
              </label>
              <input
                type="text"
                placeholder="Ex: Venda Erlan Pix"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                style={{ ...inputStyle, width: '100%', maxWidth: 'none', margin: 0 }}
              />
            </div>

            <button
              type="submit"
              disabled={salvando || !skuSelecionado || estoqueInsuficiente}
              style={{
                ...btnSuccessStyle,
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 600,
                marginTop: '8px',
                opacity: (salvando || !skuSelecionado || estoqueInsuficiente) ? 0.5 : 1,
                cursor: (salvando || !skuSelecionado || estoqueInsuficiente) ? 'not-allowed' : 'pointer'
              }}
            >
              {salvando ? 'Processando Baixa...' : '🤝 Confirmar Venda & Dar Baixa no Estoque'}
            </button>
          </form>
        </div>

        {/* Resumo Financeiro */}
        <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: `4px solid ${colors.accent}` }}>
          <div>
            <h3 style={{ ...cardTitleStyle, color: '#60a5fa', marginBottom: '4px' }}>
              📊 Resumo da Precificação da Venda
            </h3>
            <p style={{ ...cardDescStyle, marginBottom: '20px' }}>
              Cálculo detalhado de receitas, taxas reais da plataforma, insumos e lucro líquido.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: colors.bgInput, borderRadius: '8px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Receita Bruta Total:</span>
                <strong style={{ color: colors.textPrimary, fontSize: '16px' }}>{formatarMoeda(receitaTotal)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: colors.bgInput, borderRadius: '8px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Custo da Mercadoria:</span>
                <span style={{ color: '#f87171', fontWeight: 600, fontSize: '14px' }}>- {formatarMoeda(custoProdNum * quantidade)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: colors.bgInput, borderRadius: '8px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Insumos (Embalagem + Etiqueta):</span>
                <span style={{ color: '#f87171', fontWeight: 600, fontSize: '14px' }}>- {formatarMoeda((custoEmbNum + custoEtiqNum) * quantidade)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: plataformaSelecionada ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.15)', borderRadius: '8px' }}>
                <span style={{ color: colors.textSecondary, fontSize: '13px' }}>Taxa da Plataforma ({taxaInfo.taxaDesc}):</span>
                <strong style={{ color: plataformaSelecionada ? '#f87171' : '#34d399', fontSize: '14px' }}>
                  {plataformaSelecionada ? `- ${formatarMoeda(taxaTotal)}` : 'R$ 0,00 (ISENTO 🎉)'}
                </strong>
              </div>

              <div style={{ marginTop: '10px', padding: '16px', backgroundColor: 'rgba(16, 185, 129, 0.18)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '10px', textAlign: 'center' }}>
                <span style={{ color: colors.textSecondary, fontSize: '12px', display: 'block', marginBottom: '4px' }}>LUCRO LÍQUIDO REAL ESTIMADO</span>
                <strong style={{ color: '#34d399', fontSize: '26px', display: 'block' }}>{formatarMoeda(lucroTotal)}</strong>
                <span style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>Margem Líquida Real: {margemPct.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Baixa de Venda */}
      {modalConfirmacaoAberto && prodSelecionado && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
          onClick={() => !salvando && setModalConfirmacaoAberto(false)}
        >
          <div
            style={{
              backgroundColor: colors.bgCard,
              border: `1px solid ${colors.borderStrong}`,
              borderRadius: '16px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              padding: '24px',
              boxSizing: 'border-box'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <div>
                <h3 style={{ ...cardTitleStyle, fontSize: '18px', margin: 0, color: '#f59e0b' }}>
                  Confirmar Baixa no Estoque?
                </h3>
                <p style={{ ...cardDescStyle, margin: 0, fontSize: '12.5px' }}>
                  Confira o resumo da venda antes de abater do estoque.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: colors.bgInput, padding: '16px', borderRadius: '10px', border: `1px solid ${colors.border}`, marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: colors.textSecondary }}>📦 Produto:</span>
                <strong style={{ color: colors.textPrimary, textAlign: 'right', maxWidth: '250px' }}>
                  {prodSelecionado.sku} — {prodSelecionado.nome}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: colors.textSecondary }}>🏪 Plataforma:</span>
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>
                  {plataformaSelecionada ? plataformaSelecionada.nome : `Venda Direta [${formaPagamento}]`}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: colors.textSecondary }}>📉 Qtd. Vendida:</span>
                <strong style={{ color: '#f87171' }}>- {quantidade} un.</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: colors.textSecondary }}>📊 Novo Estoque:</span>
                <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
                  {estoqueAtual} un. ➔ <strong style={{ color: '#34d399' }}>{estoqueAtual - quantidade} un.</strong>
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderTop: `1px dashed ${colors.border}`, paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ color: colors.textSecondary }}>💰 Receita Total:</span>
                <strong style={{ color: colors.textPrimary, fontSize: '15px' }}>{formatarMoeda(receitaTotal)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: colors.textSecondary }}>💵 Lucro Líquido Real:</span>
                <strong style={{ color: '#34d399', fontSize: '15px' }}>{formatarMoeda(lucroTotal)} ({margemPct.toFixed(1)}%)</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setModalConfirmacaoAberto(false)}
                disabled={salvando}
                style={{ ...btnNeutralStyle, padding: '10px 18px', fontSize: '13.5px' }}
              >
                ❌ Cancelar
              </button>
              <button
                type="button"
                onClick={executarBaixaVenda}
                disabled={salvando}
                style={{
                  ...btnSuccessStyle,
                  padding: '10px 20px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  opacity: salvando ? 0.6 : 1,
                  cursor: salvando ? 'not-allowed' : 'pointer'
                }}
              >
                {salvando ? 'Processando...' : '✅ Sim, Confirmar Baixa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
