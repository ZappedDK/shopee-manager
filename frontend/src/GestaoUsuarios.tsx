import { useState, useEffect } from 'react';
import { api } from './services/api';
import { colors, cardStyle, cardTitleStyle, btnStyle } from './theme';
import { SkeletonList } from './Skeleton';
import {
  Users, CheckCircle2, AlertTriangle, RefreshCw, Mail,
  Pause, Play, Save, Trash2, ShieldCheck, Lock
} from 'lucide-react';

interface Usuario {
  id: number;
  nome: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  abas_permitidas: string;
  ativo: boolean;
  supabase_uid?: string;
}

const TODAS_ABAS = [
  { id: 'dashboard', nome: 'Visão Geral' },
  { id: 'estoque', nome: 'Controle de Estoque' },
  { id: 'calculadora', nome: 'Simular / Precificar' },
  { id: 'historico', nome: 'Histórico de Ajustes' },
  { id: 'shopee', nome: 'Integração Shopee' },
  { id: 'tiktok', nome: 'Integração TikTok Shop' },
  { id: 'plataformas', nome: 'Taxas por Plataforma' },
  { id: 'insumos', nome: 'Insumos & Embalagens' },
  { id: 'usuarios', nome: 'Gestão de Usuários' },
];

export function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [salvandoId, setSalvandoId] = useState<number | null>(null);

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setCarregando(true);
      const res = await api.get('/usuarios');
      setUsuarios(res.data || []);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.response?.data?.detail || 'Erro ao carregar lista de usuários.' });
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvarUsuario = async (user: Usuario) => {
    try {
      setSalvandoId(user.id);
      await api.patch(`/usuarios/${user.id}`, {
        role: user.role,
        abas_permitidas: user.abas_permitidas,
        ativo: user.ativo
      });
      setMensagem({ tipo: 'sucesso', texto: `Permissões de ${user.nome} atualizadas com sucesso!` });
      setTimeout(() => setMensagem(null), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.response?.data?.detail || 'Erro ao atualizar usuário.' });
    } finally {
      setSalvandoId(null);
    }
  };

  const handleExcluirUsuario = async (user: Usuario) => {
    if (!window.confirm(`Tem certeza que deseja excluir a conta de ${user.nome} (${user.email})?`)) return;
    try {
      await api.delete(`/usuarios/${user.id}`);
      setUsuarios(usuarios.filter(u => u.id !== user.id));
      setMensagem({ tipo: 'sucesso', texto: `Usuário ${user.nome} removido do sistema.` });
      setTimeout(() => setMensagem(null), 4000);
    } catch (err: any) {
      setMensagem({ tipo: 'erro', texto: err.response?.data?.detail || 'Erro ao excluir usuário.' });
    }
  };

  const toggleAba = (user: Usuario, abaId: string) => {
    const abasAtuais = user.abas_permitidas.split(',').map((a: string) => a.trim()).filter(Boolean);
    let novasAbas: string[];
    if (abasAtuais.includes(abaId)) {
      novasAbas = abasAtuais.filter((a: string) => a !== abaId);
    } else {
      novasAbas = [...abasAtuais, abaId];
    }
    const novasAbasStr = novasAbas.join(',');
    setUsuarios(usuarios.map(u => u.id === user.id ? { ...u, abas_permitidas: novasAbasStr } : u));
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: colors.textPrimary, margin: '0 0 6px 0', fontSize: '22px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Users size={22} color={colors.accent} /> Gestão de Usuários & Permissões
        </h2>
        <p style={{ color: colors.textSecondary, margin: 0, fontSize: '14px' }}>
          Gerencie quem tem acesso ao sistema, defina papéis (Admin, Editor, Visualizador) e controle o acesso aba por aba.
        </p>
      </div>

      {mensagem && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            backgroundColor: mensagem.tipo === 'sucesso' ? colors.successBg : colors.dangerBg,
            color: mensagem.tipo === 'sucesso' ? colors.successText : colors.dangerText,
            border: `1px solid ${mensagem.tipo === 'sucesso' ? colors.successBorder : colors.dangerBorder}`,
            fontSize: '13.5px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{mensagem.texto}</span>
        </div>
      )}

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ ...cardTitleStyle, margin: 0 }}>Usuários Cadastrados ({usuarios.length})</h3>
          <button onClick={carregarUsuarios} style={{ ...btnStyle, padding: '6px 14px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={12} /> Atualizar Lista
          </button>
        </div>

        {carregando ? (
          <SkeletonList count={3} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {usuarios.map(user => {
              const abasUsuario = user.abas_permitidas.split(',').map((a: string) => a.trim());
              return (
                <div
                  key={user.id}
                  style={{
                    backgroundColor: colors.bgApp,
                    border: `1px solid ${colors.borderStrong}`,
                    borderRadius: '10px',
                    padding: '20px',
                    opacity: user.ativo ? 1 : 0.65,
                    transition: '0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ color: colors.textPrimary, fontSize: '16px' }}>{user.nome}</strong>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: user.role === 'admin' ? 'rgba(59, 130, 246, 0.2)' : user.role === 'editor' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                            color: user.role === 'admin' ? colors.accent : user.role === 'editor' ? colors.successText : colors.textMuted,
                            border: `1px solid ${user.role === 'admin' ? colors.accent : colors.border}`
                          }}
                        >
                          {user.role.toUpperCase()}
                        </span>
                        {!user.ativo && (
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', backgroundColor: colors.dangerBg, color: colors.dangerText }}>
                            INATIVO
                          </span>
                        )}
                      </div>
                      <p style={{ margin: '4px 0 0 0', color: colors.textSecondary, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={13} /> {user.email} {user.supabase_uid ? '• (Google Auth)' : ''}
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <select
                        value={user.role}
                        onChange={e => setUsuarios(usuarios.map(u => u.id === user.id ? { ...u, role: e.target.value as any } : u))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          backgroundColor: colors.bgCard,
                          color: colors.textPrimary,
                          border: `1px solid ${colors.borderStrong}`,
                          fontSize: '12.5px',
                          fontWeight: 600
                        }}
                      >
                        <option value="admin">Administrador</option>
                        <option value="editor">Editor (Leitura + Escrita)</option>
                        <option value="viewer">Visualizador (Apenas Leitura)</option>
                      </select>

                      <button
                        onClick={() => setUsuarios(usuarios.map(u => u.id === user.id ? { ...u, ativo: !u.ativo } : u))}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          backgroundColor: user.ativo ? colors.dangerBg : colors.successBg,
                          color: user.ativo ? colors.dangerText : colors.successText,
                          border: `1px solid ${user.ativo ? colors.dangerBorder : colors.successBorder}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {user.ativo ? <><Pause size={13} /> Pausar Conta</> : <><Play size={13} /> Ativar Conta</>}
                      </button>

                      <button
                        onClick={() => handleSalvarUsuario(user)}
                        disabled={salvandoId === user.id}
                        style={{
                          ...btnStyle,
                          padding: '6px 14px',
                          fontSize: '12.5px',
                          opacity: salvandoId === user.id ? 0.6 : 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Save size={13} /> {salvandoId === user.id ? 'Salvando...' : 'Salvar Alterações'}
                      </button>

                      <button
                        onClick={() => handleExcluirUsuario(user)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '12.5px',
                          backgroundColor: 'transparent',
                          color: colors.dangerText,
                          border: `1px solid ${colors.dangerBorder}`,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Excluir Usuário"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}` }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary, fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                      <ShieldCheck size={14} /> Abas Liberadas para Acesso:
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {TODAS_ABAS.map(aba => {
                        const estaLiberada = abasUsuario.includes(aba.id);
                        return (
                          <button
                            key={aba.id}
                            type="button"
                            onClick={() => toggleAba(user, aba.id)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              border: `1px solid ${estaLiberada ? colors.accent : colors.border}`,
                              backgroundColor: estaLiberada ? 'rgba(59, 130, 246, 0.2)' : colors.bgCard,
                              color: estaLiberada ? colors.accent : colors.textMuted,
                              transition: '0.15s',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            {estaLiberada ? <CheckCircle2 size={13} /> : <Lock size={12} />} {aba.nome}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
