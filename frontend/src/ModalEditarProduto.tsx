import { useState, useEffect, useMemo } from 'react';
import { api } from './services/api';
import { PlatformIcon } from './PlatformIcon';
import { colors, inputStyle, btnStyle, btnNeutralStyle, formatarMoeda } from './theme';
import { X, AlertTriangle, Check, Loader2, History } from 'lucide-react';

interface ModalEditarProdutoProps {
  produto: any;
  embalagens: any[];
  plataformas: any[];
  onClose: () => void;
  onSuccess: (mensagem: string) => void;
}

const numero = (v: string) => {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: colors.textSecondary,
  fontSize: '12.5px',
  marginBottom: '6px',
  fontWeight: 500,
};

const campo: React.CSSProperties = { ...inputStyle, maxWidth: '100%', marginBottom: 0 };

/** Campo numérico com prefixo/sufixo (R$, un) dentro da caixa */
function CampoNumero({
  label, value, onChange, prefixo, sufixo, step, inputMode,
}: {
  label: string; value: string; onChange: (v: string) => void;
  prefixo?: string; sufixo?: string; step?: string; inputMode: 'decimal' | 'numeric';
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        {prefixo && <span className="campo-adorno" style={{ left: '12px' }}>{prefixo}</span>}
        <input
          type="number"
          step={step}
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="tabular"
          style={{ ...campo, paddingLeft: prefixo ? '38px' : '12px', paddingRight: sufixo ? '36px' : '12px' }}
        />
        {sufixo && <span className="campo-adorno" style={{ right: '12px' }}>{sufixo}</span>}
      </div>
    </div>
  );
}

export function ModalEditarProduto({ produto, embalagens, plataformas, onClose, onSuccess }: ModalEditarProdutoProps) {
  // Valores originais — base para mostrar o que mudou
  const original = useMemo(() => ({
    nome: produto.nome || '',
    preco: produto.preco_venda ? String(produto.preco_venda) : '',
    custo: produto.custo_produto ? String(produto.custo_produto) : '',
    estoque: produto.quantidade_estoque !== undefined ? String(produto.quantidade_estoque) : '0',
    cross: Boolean(produto.cross_docking),
    ativo: produto.ativo !== false,
    embalagemId: produto.embalagem_id ? String(produto.embalagem_id) : (produto.embalagem?.id ? String(produto.embalagem.id) : ''),
    plataformas: (
      Array.isArray(produto.analises_plataformas)
        ? produto.analises_plataformas.map((a: any) => a.plataforma_id)
        : Array.isArray(produto.plataformas) ? produto.plataformas.map((p: any) => p.id) : []
    ) as number[],
  }), [produto]);

  const [nome, setNome] = useState(original.nome);
  const [precoVenda, setPrecoVenda] = useState(original.preco);
  const [custoProduto, setCustoProduto] = useState(original.custo);
  const [quantidadeEstoque, setQuantidadeEstoque] = useState(original.estoque);
  const [crossDocking, setCrossDocking] = useState<boolean>(original.cross);
  const [ativo, setAtivo] = useState(original.ativo);
  const [embalagemId, setEmbalagemId] = useState(original.embalagemId);
  const [plataformasIds, setPlataformasIds] = useState<number[]>(original.plataformas);
  const [motivoAjuste, setMotivoAjuste] = useState('Reajuste de custo/preço/estoque');

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setNome(original.nome);
    setPrecoVenda(original.preco);
    setCustoProduto(original.custo);
    setQuantidadeEstoque(original.estoque);
    setCrossDocking(original.cross);
    setAtivo(original.ativo);
    setEmbalagemId(original.embalagemId);
    setPlataformasIds(original.plataformas);
  }, [original]);

  // Esc fecha (exceto enquanto salva)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !carregando) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [carregando, onClose]);

  const togglePlataforma = (id: number) => {
    setPlataformasIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };

  // --- Prévia ao vivo (antes das taxas de plataforma e da etiqueta) ---
  const embalagemSel = embalagens.find(e => String(e.id) === embalagemId);
  const custoEmb = embalagemSel && embalagemSel.qtd_unidades > 0 ? embalagemSel.custo_pacote / embalagemSel.qtd_unidades : 0;
  const preco = numero(precoVenda);
  const custo = numero(custoProduto);
  const qtd = Math.max(0, Math.trunc(numero(quantidadeEstoque)));
  const lucroBruto = preco - custo - custoEmb;
  const margemBruta = preco > 0 ? lucroBruto / preco : 0;

  // --- O que mudou ---
  const nomeEmb = (id: string) => {
    if (!id) return 'Sem embalagem';
    return embalagens.find(e => String(e.id) === id)?.nome || `#${id}`;
  };
  const alteracoes: { campo: string; de: string; para: string }[] = [];
  if (nome.trim() !== original.nome.trim()) alteracoes.push({ campo: 'Nome', de: original.nome, para: nome });
  if (numero(custoProduto) !== numero(original.custo)) alteracoes.push({ campo: 'Custo', de: formatarMoeda(numero(original.custo)), para: formatarMoeda(custo) });
  if (numero(precoVenda) !== numero(original.preco)) alteracoes.push({ campo: 'Preço', de: formatarMoeda(numero(original.preco)), para: formatarMoeda(preco) });
  if (quantidadeEstoque !== original.estoque) alteracoes.push({ campo: 'Estoque', de: `${original.estoque} un.`, para: `${quantidadeEstoque || 0} un.` });
  if (embalagemId !== original.embalagemId) alteracoes.push({ campo: 'Embalagem', de: nomeEmb(original.embalagemId), para: nomeEmb(embalagemId) });
  if (crossDocking !== original.cross) alteracoes.push({ campo: 'Cross-docking', de: original.cross ? 'Sim' : 'Não', para: crossDocking ? 'Sim' : 'Não' });
  if (ativo !== original.ativo) alteracoes.push({ campo: 'Status', de: original.ativo ? 'Ativo' : 'Pausado', para: ativo ? 'Ativo' : 'Pausado' });
  const mudouPlataformas =
    plataformasIds.length !== original.plataformas.length ||
    plataformasIds.some(id => !original.plataformas.includes(id));
  if (mudouPlataformas) alteracoes.push({ campo: 'Canais', de: `${original.plataformas.length}`, para: `${plataformasIds.length}` });

  const temAlteracao = alteracoes.length > 0;

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!nome.trim() || !precoVenda || !custoProduto || quantidadeEstoque === '') {
      setErro('Preencha nome, custo, preço e estoque.');
      return;
    }

    try {
      setCarregando(true);
      const payload = {
        nome,
        preco_venda: parseFloat(precoVenda.replace(',', '.')),
        custo_produto: parseFloat(custoProduto.replace(',', '.')),
        quantidade_estoque: Number(quantidadeEstoque),
        cross_docking: crossDocking,
        ativo,
        embalagem_id: embalagemId ? Number(embalagemId) : null,
        plataformas_ids: plataformasIds,
        motivo_ajuste: motivoAjuste
      };

      await api.put(`/produtos/${produto.sku}`, payload);
      onSuccess(`Produto ${produto.sku} atualizado com sucesso!`);
      onClose();
    } catch (err: any) {
      setErro(err.response?.data?.detail || 'Erro ao atualizar produto.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <form
        onSubmit={handleSalvar}
        className="modal-panel modal-panel--flush"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-produto-titulo"
        style={{
          width: '100%',
          maxWidth: '720px',
          maxHeight: '90dvh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}
      >
        {/* Cabeçalho fixo: o que estou editando + status */}
        <header className="modal-head">
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 id="editar-produto-titulo" style={{ margin: 0, fontSize: '18px', fontWeight: 600, letterSpacing: '-0.015em', color: colors.textPrimary }}>
              Editar produto
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', minWidth: 0 }}>
              <span className="sku-chip">{produto.sku}</span>
              <span style={{ fontSize: '13px', color: colors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {original.nome}
              </span>
            </div>
          </div>

          <div className="segmented" role="group" aria-label="Status do produto">
            <button type="button" aria-pressed={ativo} onClick={() => setAtivo(true)}>
              <span className="status-dot" style={{ background: 'var(--positive)' }} /> Ativo
            </button>
            <button type="button" aria-pressed={!ativo} onClick={() => setAtivo(false)}>
              <span className="status-dot" style={{ background: 'var(--text-muted)' }} /> Pausado
            </button>
          </div>

          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar" disabled={carregando}>
            <X size={18} />
          </button>
        </header>

        <div style={{ padding: '20px 24px 8px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {erro && (
            <div role="alert" className="banner-enter" style={{ padding: '10px 14px', backgroundColor: colors.dangerBg, color: colors.dangerText, border: `1px solid ${colors.dangerBorder}`, borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} />
              <span>{erro}</span>
            </div>
          )}

          {/* Identificação */}
          <section>
            <label style={labelStyle} htmlFor="ep-nome">Nome do produto</label>
            <input id="ep-nome" value={nome} onChange={(e) => setNome(e.target.value)} required style={campo} />
          </section>

          {/* Preço e estoque + prévia */}
          <section>
            <h4 className="secao-titulo">Preço e estoque</h4>
            <div className="grid-campos">
              <CampoNumero label="Custo da mercadoria" prefixo="R$" step="0.01" inputMode="decimal" value={custoProduto} onChange={setCustoProduto} />
              <CampoNumero label="Preço de venda base" prefixo="R$" step="0.01" inputMode="decimal" value={precoVenda} onChange={setPrecoVenda} />
              <CampoNumero label="Estoque atual" sufixo="un" step="1" inputMode="numeric" value={quantidadeEstoque} onChange={setQuantidadeEstoque} />
            </div>

            <div className="previa">
              <div>
                <span>Margem bruta</span>
                <strong style={{ color: margemBruta < 0 ? 'var(--negative)' : margemBruta < 0.15 ? 'var(--warning)' : 'var(--positive)' }}>
                  {preco > 0 ? `${(margemBruta * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—'}
                </strong>
              </div>
              <div>
                <span>Lucro bruto / un.</span>
                <strong style={{ color: lucroBruto < 0 ? 'var(--negative)' : colors.textPrimary }}>{formatarMoeda(lucroBruto)}</strong>
              </div>
              <div>
                <span>Valor em estoque</span>
                <strong>{formatarMoeda(qtd * custo)}</strong>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: colors.textMuted, margin: '8px 2px 0' }}>
              Prévia antes das taxas de cada plataforma e da etiqueta{custoEmb > 0 ? `; já desconta a embalagem (${formatarMoeda(custoEmb)}/un)` : ''}.
            </p>
          </section>

          {/* Logística */}
          <section>
            <h4 className="secao-titulo">Logística</h4>
            <div className="grid-campos" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))' }}>
              <div>
                <label style={labelStyle} htmlFor="ep-emb">Embalagem</label>
                <select id="ep-emb" value={embalagemId} onChange={(e) => setEmbalagemId(e.target.value)} style={{ ...campo, color: colors.textPrimary }}>
                  <option value="">Sem embalagem (caixa própria)</option>
                  {embalagens.map((emb) => (
                    <option key={emb.id} value={emb.id}>
                      {emb.nome} — {formatarMoeda(emb.custo_pacote / emb.qtd_unidades)}/un
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span style={labelStyle}>Cross-docking</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={crossDocking}
                  className="switch-row"
                  onClick={() => setCrossDocking(c => !c)}
                >
                  <span style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 500, color: colors.textPrimary }}>Venda sob demanda</span>
                    <span style={{ display: 'block', fontSize: '12px', color: colors.textMuted }}>Sem estoque físico próprio</span>
                  </span>
                  <span className="switch" aria-hidden="true"><span /></span>
                </button>
              </div>
            </div>
          </section>

          {/* Canais */}
          <section>
            <h4 className="secao-titulo">Canais de venda</h4>
            {plataformas.length === 0 ? (
              <p style={{ fontSize: '13px', color: colors.textMuted, margin: 0 }}>Nenhuma plataforma cadastrada.</p>
            ) : (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {plataformas.map((plat) => {
                  const marcado = plataformasIds.includes(plat.id);
                  return (
                    <button
                      key={plat.id}
                      type="button"
                      className="chip-toggle"
                      aria-pressed={marcado}
                      onClick={() => togglePlataforma(plat.id)}
                    >
                      <span className="chip-check" aria-hidden="true"><Check size={11} strokeWidth={3} /></span>
                      <PlatformIcon nome={plat.nome} icone={plat.icone} size={16} />
                      {plat.nome}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Registro no histórico — só quando há algo a registrar */}
          {temAlteracao && (
            <section className="banner-enter alteracoes">
              <h4 className="secao-titulo" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={14} /> {alteracoes.length === 1 ? '1 alteração' : `${alteracoes.length} alterações`}
              </h4>
              <ul>
                {alteracoes.map(a => (
                  <li key={a.campo}>
                    <span style={{ color: colors.textMuted, minWidth: '92px' }}>{a.campo}</span>
                    {a.campo === 'Nome' ? (
                      <span style={{ color: colors.textPrimary, overflowWrap: 'anywhere' }}>{a.para}</span>
                    ) : (
                      <span className="tabular">
                        <span style={{ color: colors.textMuted, textDecoration: 'line-through' }}>{a.de}</span>
                        <span style={{ color: colors.textMuted, margin: '0 6px' }}>→</span>
                        <span style={{ color: colors.textPrimary, fontWeight: 500 }}>{a.para}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <label style={{ ...labelStyle, marginTop: '12px' }} htmlFor="ep-motivo">Motivo (fica no Histórico)</label>
              <input
                id="ep-motivo"
                value={motivoAjuste}
                onChange={(e) => setMotivoAjuste(e.target.value)}
                placeholder="Ex.: reajuste do fornecedor, troca de embalagem..."
                style={campo}
              />
            </section>
          )}
        </div>

        {/* Rodapé fixo */}
        <footer className="modal-foot">
          <span style={{ fontSize: '12.5px', color: colors.textMuted }}>
            {temAlteracao ? 'Alterações não salvas' : 'Nenhuma alteração'}
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={onClose} style={btnNeutralStyle} disabled={carregando}>
              Cancelar
            </button>
            <button type="submit" disabled={carregando || !temAlteracao} style={{ ...btnStyle, minWidth: '148px' }}>
              {carregando ? <><Loader2 size={15} className="spin" /> Salvando…</> : 'Salvar alterações'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}
