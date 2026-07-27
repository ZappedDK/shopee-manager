import { useState, useEffect } from 'react';
import { api } from './services/api';
import { PlatformIcon } from './PlatformIcon';
import { colors, cardStyle, cardTitleStyle, cardDescStyle, inputStyle, btnStyle, btnNeutralStyle, formatarMoeda } from './theme';

interface ModalEditarProdutoProps {
  produto: any;
  embalagens: any[];
  plataformas: any[];
  onClose: () => void;
  onSuccess: (mensagem: string) => void;
}

export function ModalEditarProduto({ produto, embalagens, plataformas, onClose, onSuccess }: ModalEditarProdutoProps) {
  const [nome, setNome] = useState(produto.nome || '');
  const [precoVenda, setPrecoVenda] = useState(produto.preco_venda ? String(produto.preco_venda) : '');
  const [custoProduto, setCustoProduto] = useState(produto.custo_produto ? String(produto.custo_produto) : '');
  const [quantidadeEstoque, setQuantidadeEstoque] = useState(produto.quantidade_estoque ? String(produto.quantidade_estoque) : '0');
  const [ativo, setAtivo] = useState(produto.ativo !== false);
  const [embalagemId, setEmbalagemId] = useState(produto.embalagem_id ? String(produto.embalagem_id) : (produto.embalagem?.id ? String(produto.embalagem.id) : ''));
  const [plataformasIds, setPlataformasIds] = useState<number[]>([]);
  const [motivoAjuste, setMotivoAjuste] = useState('Reajuste de custo/preço/estoque');

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    // Inicializa IDs das plataformas vinculadas ao produto
    if (produto.analises_plataformas && Array.isArray(produto.analises_plataformas)) {
      const ids = produto.analises_plataformas.map((a: any) => a.plataforma_id);
      setPlataformasIds(ids);
    } else if (produto.plataformas && Array.isArray(produto.plataformas)) {
      const ids = produto.plataformas.map((p: any) => p.id);
      setPlataformasIds(ids);
    }
  }, [produto]);

  const togglePlataforma = (id: number) => {
    if (plataformasIds.includes(id)) {
      setPlataformasIds(plataformasIds.filter(item => item !== id));
    } else {
      setPlataformasIds([...plataformasIds, id]);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nome.trim() || !precoVenda || !custoProduto || quantidadeEstoque === '') {
      setErro('Preencha todos os campos obrigatórios.');
      return;
    }

    try {
      setCarregando(true);
      const payload = {
        nome,
        preco_venda: parseFloat(precoVenda.replace(',', '.')),
        custo_produto: parseFloat(custoProduto.replace(',', '.')),
        quantidade_estoque: Number(quantidadeEstoque),
        ativo,
        embalagem_id: embalagemId ? Number(embalagemId) : null,
        plataformas_ids: plataformasIds,
        motivo_ajuste: motivoAjuste
      };

      await api.put(`/produtos/${produto.sku}`, payload);
      onSuccess(`✅ Produto ${produto.sku} atualizado com sucesso!`);
      onClose();
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao atualizar produto.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        style={{
          ...cardStyle,
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          border: `1px solid ${colors.borderStrong}`,
          padding: '32px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <h3 style={{ ...cardTitleStyle, margin: 0, fontSize: '18px' }}>
            ✏️ Editar Produto (SKU: {produto.sku})
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setAtivo(!ativo)}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                border: `1px solid ${ativo ? colors.successBorder : colors.dangerBorder}`,
                backgroundColor: ativo ? colors.successBg : colors.dangerBg,
                color: ativo ? colors.successText : colors.dangerText,
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: '0.2s'
              }}
              title="Clique para alternar o status do produto (Ativo / Desativado)"
            >
              <span style={{ fontSize: '10px' }}>{ativo ? '🟢' : '🔴'}</span>
              <span>{ativo ? 'Ativo' : 'Desativado'}</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: colors.textSecondary,
                fontSize: '20px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <p style={cardDescStyle}>Atualize os preços, custos, quantidade em estoque ou insumos vinculados a este SKU.</p>

        {erro && (
          <div style={{ padding: '10px 14px', backgroundColor: colors.dangerBg, color: colors.dangerText, border: `1px solid ${colors.dangerBorder}`, borderRadius: '8px', marginBottom: '18px', fontSize: '13px' }}>
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={handleSalvar}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px', fontWeight: 500 }}>
              SKU (Não editável)
            </label>
            <input
              value={produto.sku}
              disabled
              style={{ ...inputStyle, maxWidth: '100%', opacity: 0.6, backgroundColor: colors.bgApp, cursor: 'not-allowed' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px', fontWeight: 500 }}>
              Nome do Produto
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              style={{ ...inputStyle, maxWidth: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px', fontWeight: 500 }}>
                Custo da Mercadoria (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={custoProduto}
                onChange={(e) => setCustoProduto(e.target.value)}
                required
                style={{ ...inputStyle, maxWidth: '100%' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '160px' }}>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px', fontWeight: 500 }}>
                Preço de Venda Base (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={precoVenda}
                onChange={(e) => setPrecoVenda(e.target.value)}
                required
                style={{ ...inputStyle, maxWidth: '100%' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '140px' }}>
              <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px', fontWeight: 500 }}>
                Estoque Atual (Unidades)
              </label>
              <input
                type="number"
                value={quantidadeEstoque}
                onChange={(e) => setQuantidadeEstoque(e.target.value)}
                required
                style={{ ...inputStyle, maxWidth: '100%' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px', fontWeight: 500 }}>
              Embalagem Vinculada
            </label>
            <select
              value={embalagemId}
              onChange={(e) => setEmbalagemId(e.target.value)}
              style={{ ...inputStyle, maxWidth: '100%', color: colors.textPrimary }}
            >
              <option value="">-- Sem Embalagem (Caixa Própria - R$ 0,00) --</option>
              {embalagens.map((emb) => (
                <option key={emb.id} value={emb.id}>
                  {emb.nome} ({formatarMoeda(emb.custo_pacote / emb.qtd_unidades)}/un)
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ color: colors.textSecondary, display: 'block', marginBottom: '8px', fontSize: '12.5px', fontWeight: 500 }}>
              Plataformas de Venda Vinculadas:
            </label>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              {plataformas.map((plat) => {
                const marcado = plataformasIds.includes(plat.id);
                return (
                  <label
                    key={plat.id}
                    style={{
                      color: colors.textPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      backgroundColor: marcado ? 'rgba(59,130,246,0.15)' : colors.bgApp,
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${marcado ? colors.accent : colors.border}`
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => togglePlataforma(plat.id)}
                    />
                    <PlatformIcon nome={plat.nome} icone={plat.icone} size={16} /> {plat.nome}
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '4px', fontWeight: 500 }}>
              Motivo do Reajuste (para o Histórico)
            </label>
            <input
              value={motivoAjuste}
              onChange={(e) => setMotivoAjuste(e.target.value)}
              placeholder="Ex: Reajuste do fornecedor, alteração de embalagem..."
              style={{ ...inputStyle, maxWidth: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={btnNeutralStyle}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              style={{ ...btnStyle, opacity: carregando ? 0.7 : 1 }}
            >
              {carregando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
