import { useState } from 'react';
import { api } from './services/api';
import { colors, cardStyle, cardTitleStyle, cardDescStyle, btnStyle, btnNeutralStyle } from './theme';

interface ImportarProdutosModalProps {
  onClose: () => void;
  onSuccess: (mensagem: string) => void;
}

export function ImportarProdutosModal({ onClose, onSuccess }: ImportarProdutosModalProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [modoDuplicados, setModoDuplicados] = useState<'atualizar' | 'pular'>('atualizar');
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<any | null>(null);
  const [erro, setErro] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setArquivo(e.target.files[0]);
      setErro('');
      setResultado(null);
    }
  };

  const handleBaixarModelo = () => {
    const baseURL = api.defaults.baseURL || 'http://localhost:8000';
    window.open(`${baseURL}/produtos/modelo-importacao`, '_blank');
  };

  const handleEnviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arquivo) {
      setErro('Por favor, selecione um arquivo de planilha (.xlsx ou .csv).');
      return;
    }

    try {
      setCarregando(true);
      setErro('');
      setResultado(null);

      const formData = new FormData();
      formData.append('file', arquivo);
      formData.append('modo_duplicados', modoDuplicados);

      const res = await api.post('/produtos/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResultado(res.data);
      if (res.data.criados > 0 || res.data.atualizados > 0) {
        onSuccess(`✅ Importação concluída! ${res.data.criados} criados, ${res.data.atualizados} atualizados.`);
      }
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao processar arquivo de planilha.');
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
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          border: `1px solid ${colors.borderStrong}`,
          padding: '32px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ ...cardTitleStyle, margin: 0, fontSize: '18px' }}>
            📊 Importação de Produtos em Massa
          </h3>
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
        <p style={cardDescStyle}>Cadastre ou atualize dezenas de produtos de uma só vez enviando uma planilha Excel ou CSV.</p>

        {/* Botão Baixar Modelo */}
        <div style={{ backgroundColor: colors.bgCardAlt, padding: '14px 18px', borderRadius: '10px', border: `1px solid ${colors.border}`, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong style={{ color: colors.textPrimary, fontSize: '13.5px', display: 'block' }}>Precisa do modelo padrão?</strong>
            <span style={{ color: colors.textSecondary, fontSize: '12px' }}>Baixe o modelo pré-formatado com as colunas necessárias.</span>
          </div>
          <button
            type="button"
            onClick={handleBaixarModelo}
            style={{ ...btnNeutralStyle, fontSize: '13px', padding: '8px 14px' }}
          >
            📥 Baixar Modelo (.CSV)
          </button>
        </div>

        {erro && (
          <div style={{ padding: '10px 14px', backgroundColor: colors.dangerBg, color: colors.dangerText, border: `1px solid ${colors.dangerBorder}`, borderRadius: '8px', marginBottom: '18px', fontSize: '13px' }}>
            ⚠️ {erro}
          </div>
        )}

        <form onSubmit={handleEnviar}>
          {/* Campo Upload de Arquivo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '6px', fontWeight: 500 }}>
              Selecione o arquivo da planilha (.xlsx ou .csv):
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.txt"
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: colors.bgApp,
                border: `1px dashed ${colors.borderStrong}`,
                borderRadius: '8px',
                color: colors.textPrimary,
                cursor: 'pointer',
                fontSize: '13.5px'
              }}
            />
          </div>

          {/* Comportamento de Duplicados */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '13px', marginBottom: '8px', fontWeight: 500 }}>
              Se o SKU já existir no sistema:
            </label>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textPrimary, fontSize: '13.5px', cursor: 'pointer', backgroundColor: modoDuplicados === 'atualizar' ? 'rgba(59,130,246,0.15)' : colors.bgApp, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${modoDuplicados === 'atualizar' ? colors.accent : colors.border}`, flex: 1, minWidth: '180px' }}>
                <input
                  type="radio"
                  name="duplicados"
                  value="atualizar"
                  checked={modoDuplicados === 'atualizar'}
                  onChange={() => setModoDuplicados('atualizar')}
                />
                <div>
                  <strong>🔄 Atualizar dados</strong>
                  <div style={{ fontSize: '11.5px', color: colors.textMuted }}>Sobrescreve nome, custo, preço e estoque.</div>
                </div>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textPrimary, fontSize: '13.5px', cursor: 'pointer', backgroundColor: modoDuplicados === 'pular' ? 'rgba(59,130,246,0.15)' : colors.bgApp, padding: '10px 14px', borderRadius: '8px', border: `1px solid ${modoDuplicados === 'pular' ? colors.accent : colors.border}`, flex: 1, minWidth: '180px' }}>
                <input
                  type="radio"
                  name="duplicados"
                  value="pular"
                  checked={modoDuplicados === 'pular'}
                  onChange={() => setModoDuplicados('pular')}
                />
                <div>
                  <strong>⏭️ Pular duplicados</strong>
                  <div style={{ fontSize: '11.5px', color: colors.textMuted }}>Mantém os produtos atuais intactos.</div>
                </div>
              </label>
            </div>
          </div>

          {/* Resultado da Carga */}
          {resultado && (
            <div style={{ padding: '16px', backgroundColor: colors.bgCardAlt, borderRadius: '10px', border: `1px solid ${colors.border}`, marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 10px 0', color: colors.successText, fontSize: '15px' }}>🎉 Processamento Concluído!</h4>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13.5px', marginBottom: '10px' }}>
                <span>📦 Total: <strong>{resultado.total_processados}</strong></span>
                <span>✨ Criados: <strong style={{ color: colors.successText }}>{resultado.criados}</strong></span>
                <span>🔄 Atualizados: <strong style={{ color: colors.accent }}>{resultado.atualizados}</strong></span>
                {resultado.pulados > 0 && <span>⏭️ Pulados: <strong>{resultado.pulados}</strong></span>}
              </div>

              {resultado.erros && resultado.erros.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
                  <strong style={{ color: colors.dangerText, fontSize: '13px' }}>Avisos / Linhas não importadas ({resultado.erros.length}):</strong>
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', color: colors.textMuted, fontSize: '12px' }}>
                    {resultado.erros.map((errItem: string, idx: number) => (
                      <li key={idx}>{errItem}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={btnNeutralStyle}
            >
              {resultado ? 'Fechar' : 'Cancelar'}
            </button>

            <button
              type="submit"
              disabled={carregando || !arquivo}
              style={{ ...btnStyle, opacity: (carregando || !arquivo) ? 0.6 : 1 }}
            >
              {carregando ? 'Processando Planilha...' : '🚀 Processar e Importar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
