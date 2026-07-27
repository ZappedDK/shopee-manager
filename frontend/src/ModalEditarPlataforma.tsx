import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { colors, cardTitleStyle, cardDescStyle, inputStyle, btnSuccessStyle, btnNeutralStyle, btnDangerStyle } from './theme';

interface ModalEditarPlataformaProps {
  plataforma: any;
  onClose: () => void;
  onSuccess: (mensagem: string) => void;
}

export function ModalEditarPlataforma({ plataforma, onClose, onSuccess }: ModalEditarPlataformaProps) {
  const [nome, setNome] = useState(plataforma.nome || '');
  const [icone, setIcone] = useState(plataforma.icone || '');
  const [taxaExtra, setTaxaExtra] = useState(plataforma.taxa_extra ? String(plataforma.taxa_extra * 100) : '0');

  const [faixas, setFaixas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (plataforma.faixas && Array.isArray(plataforma.faixas) && plataforma.faixas.length > 0) {
      setFaixas(
        plataforma.faixas.map((f: any) => ({
          de_valor: String(f.de_valor ?? 0),
          ate_valor: f.ate_valor != null ? String(f.ate_valor) : '',
          taxa_percentual: String(f.taxa_percentual > 1 ? f.taxa_percentual : f.taxa_percentual * 100),
          taxa_fixa: String(f.taxa_fixa ?? 0),
        }))
      );
    } else {
      setFaixas([
        {
          de_valor: '0',
          ate_valor: '',
          taxa_percentual: String((plataforma.taxa_plataforma || 0) * 100),
          taxa_fixa: String(plataforma.taxa_fixa || 0),
        },
      ]);
    }
  }, [plataforma]);

  const adicionarFaixa = () => {
    setFaixas(prev => {
      const ultima = prev[prev.length - 1];
      const deVal = ultima && ultima.ate_valor ? String(Number(ultima.ate_valor) + 0.01) : '0';
      return [...prev, { de_valor: deVal, ate_valor: '', taxa_percentual: '', taxa_fixa: '' }];
    });
  };

  const removerFaixa = (index: number) => {
    if (faixas.length <= 1) return;
    setFaixas(prev => prev.filter((_, i) => i !== index));
  };

  const atualizarFaixa = (index: number, campo: string, valor: string) => {
    setFaixas(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [campo]: valor };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nome.trim()) {
      setErro('Por favor, informe o nome da plataforma.');
      return;
    }

    try {
      setCarregando(true);
      const faixasPayload = faixas.map(f => ({
        de_valor: parseFloat(String(f.de_valor).replace(',', '.')) || 0,
        ate_valor: f.ate_valor !== '' && f.ate_valor !== null ? parseFloat(String(f.ate_valor).replace(',', '.')) : null,
        taxa_percentual: parseFloat(String(f.taxa_percentual).replace(',', '.')) || 0,
        taxa_fixa: parseFloat(String(f.taxa_fixa).replace(',', '.')) || 0,
      }));

      const payload = {
        nome,
        icone,
        taxa_plataforma: faixasPayload.length > 0 ? faixasPayload[0].taxa_percentual / 100 : 0,
        taxa_fixa: faixasPayload.length > 0 ? faixasPayload[0].taxa_fixa : 0,
        taxa_extra: (parseFloat(String(taxaExtra).replace(',', '.')) || 0) / 100,
        faixas: faixasPayload,
      };

      await api.put(`/plataformas/${plataforma.id}`, payload);
      onSuccess('✅ Plataforma e faixas de taxas atualizadas com sucesso!');
      onClose();
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao salvar plataforma.');
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
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: colors.bgCard,
          border: `1px solid ${colors.borderStrong}`,
          borderRadius: '16px',
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ ...cardTitleStyle, fontSize: '20px', marginBottom: '4px' }}>
              Editar {icone} {nome}
            </h3>
            <p style={{ ...cardDescStyle, margin: 0 }}>Configure o nome, emoji e as faixas de taxas progressivas.</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: colors.textMuted,
              fontSize: '22px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {erro && (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: colors.danger,
              padding: '12px 16px',
              borderRadius: '8px',
              border: `1px solid ${colors.danger}`,
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            ❌ {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ flex: 2, minWidth: '180px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.textSecondary, marginBottom: '6px' }}>
                Nome da Plataforma
              </label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: 0, width: '100%' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.textSecondary, marginBottom: '6px' }}>
                Emoji
              </label>
              <input
                value={icone}
                onChange={e => setIcone(e.target.value)}
                required
                style={{ ...inputStyle, marginBottom: 0, width: '100%' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: colors.textSecondary, marginBottom: '6px' }}>
                Taxa Extra (%)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 6 (Frete Grátis)"
                value={taxaExtra}
                onChange={e => setTaxaExtra(e.target.value)}
                style={{ ...inputStyle, marginBottom: 0, width: '100%' }}
              />
            </div>
          </div>

          <div
            style={{
              backgroundColor: colors.bgCardAlt,
              padding: '18px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <label style={{ color: colors.accent, fontWeight: 700, fontSize: '14px' }}>
                  📊 Faixas de Taxas Progressivas
                </label>
                <p style={{ fontSize: '12px', color: colors.textMuted, margin: '2px 0 0 0' }}>
                  Ex: No TikTok são 2 faixas, na Shopee 4 faixas. Deixe "Até R$" em branco na última linha para representar sem limite.
                </p>
              </div>
              <button
                type="button"
                onClick={adicionarFaixa}
                style={{
                  ...btnNeutralStyle,
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: colors.accent,
                  borderColor: colors.borderStrong,
                }}
              >
                + Adicionar Faixa
              </button>
            </div>

            {faixas.map((f, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  marginBottom: '10px',
                  backgroundColor: colors.bgCard,
                  padding: '10px',
                  borderRadius: '8px',
                  border: `1px solid ${colors.border}`,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: colors.textMuted, width: '50px' }}>
                  Faixa {idx + 1}:
                </span>

                <div style={{ flex: 1, minWidth: '100px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: colors.textMuted, marginBottom: '3px' }}>
                    De R$
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={f.de_valor}
                    onChange={e => atualizarFaixa(idx, 'de_valor', e.target.value)}
                    style={{ ...inputStyle, marginBottom: 0, padding: '6px 8px', fontSize: '12px' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '120px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: colors.textMuted, marginBottom: '3px' }}>
                    Até R$ (Vazio = Sem Limite)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Sem Limite"
                    value={f.ate_valor}
                    onChange={e => atualizarFaixa(idx, 'ate_valor', e.target.value)}
                    style={{ ...inputStyle, marginBottom: 0, padding: '6px 8px', fontSize: '12px' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '90px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: colors.textMuted, marginBottom: '3px' }}>
                    Comissão %
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 20"
                    value={f.taxa_percentual}
                    onChange={e => atualizarFaixa(idx, 'taxa_percentual', e.target.value)}
                    style={{ ...inputStyle, marginBottom: 0, padding: '6px 8px', fontSize: '12px' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: '90px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: colors.textMuted, marginBottom: '3px' }}>
                    Taxa Fixa R$
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ex: 4.00"
                    value={f.taxa_fixa}
                    onChange={e => atualizarFaixa(idx, 'taxa_fixa', e.target.value)}
                    style={{ ...inputStyle, marginBottom: 0, padding: '6px 8px', fontSize: '12px' }}
                  />
                </div>

                {faixas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removerFaixa(idx)}
                    style={{ ...btnDangerStyle, padding: '6px 10px', fontSize: '12px', marginTop: '16px' }}
                    title="Remover faixa"
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={onClose} style={btnNeutralStyle}>
              Cancelar
            </button>
            <button type="submit" disabled={carregando} style={btnSuccessStyle}>
              {carregando ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
