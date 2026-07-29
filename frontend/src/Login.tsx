import { useState, useEffect } from 'react';
import { api } from './services/api';
import { colors, btnStyle, inputStyle } from './theme';

interface LoginProps {
  onLoginSuccess: (token: string, usuario: any) => void;
}

export function Login({ onLoginSuccess }: LoginProps) {
  const [modo, setModo] = useState<'login' | 'registro' | 'esqueci'>('login');
  
  // Estados do Formulário
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  
  // Estados de Esqueci Senha
  const [stepEsqueci, setStepEsqueci] = useState<1 | 2>(1);
  const [tokenReset, setTokenReset] = useState('');
  const [novaSenha, setNovaSenha] = useState('');

  // Feedbacks
  const [carregando, setCarregando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');

  const limparMensagens = () => {
    setMensagemSucesso('');
    setMensagemErro('');
  };

  // Efeito para detectar retorno da autenticação do Google via Supabase
  useEffect(() => {
    import('./services/supabase').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data: { session } }: any) => {
        if (session?.user) {
          const user = session.user;
          api.post('/auth/google', {
            email: user.email,
            nome: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário Google',
            supabase_uid: user.id
          }).then(res => {
            onLoginSuccess(res.data.access_token, res.data.usuario);
          }).catch(err => {
            setMensagemErro(err.response?.data?.detail || 'Erro ao sincronizar login do Google.');
          });
        }
      });
    });
  }, []);

  const handleGoogleLogin = async () => {
    limparMensagens();
    try {
      setCarregando(true);
      const { loginComGoogle } = await import('./services/supabase');
      await loginComGoogle();
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao conectar com o Google.');
      setCarregando(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    limparMensagens();
    if (!email || !senha) {
      setMensagemErro('Preencha todos os campos.');
      return;
    }

    try {
      setCarregando(true);
      const res = await api.post('/auth/login', { email, senha });
      setMensagemSucesso('Login efetuado com sucesso!');
      onLoginSuccess(res.data.access_token, res.data.usuario);
    } catch (err: any) {
      setMensagemErro(err.response?.data?.detail || 'Erro ao realizar login. Verifique suas credenciais.');
    } finally {
      setCarregando(false);
    }
  };

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    limparMensagens();
    if (!nome || !email || !senha) {
      setMensagemErro('Preencha todos os campos obrigatórios.');
      return;
    }
    if (senha !== confirmarSenha) {
      setMensagemErro('As senhas não coincidem.');
      return;
    }

    try {
      setCarregando(true);
      await api.post('/auth/registro', { nome, email, senha });
      setMensagemSucesso('Conta criada com sucesso! Você já pode fazer login.');
      setModo('login');
      setSenha('');
      setConfirmarSenha('');
    } catch (err: any) {
      setMensagemErro(err.response?.data?.detail || 'Erro ao criar conta.');
    } finally {
      setCarregando(false);
    }
  };

  const handleSolicitarTokenEsqueci = async (e: React.FormEvent) => {
    e.preventDefault();
    limparMensagens();
    if (!email) {
      setMensagemErro('Informe seu e-mail.');
      return;
    }

    try {
      setCarregando(true);
      const res = await api.post('/auth/esqueci-senha', { email });
      setMensagemSucesso(res.data.mensagem);
      if (res.data.reset_token) {
        setTokenReset(res.data.reset_token);
      }
      setStepEsqueci(2);
    } catch (err: any) {
      setMensagemErro(err.response?.data?.detail || 'Erro ao solicitar recuperação.');
    } finally {
      setCarregando(false);
    }
  };

  const handleRedefinirSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    limparMensagens();
    if (!tokenReset || !novaSenha) {
      setMensagemErro('Informe o token de recuperação e a nova senha.');
      return;
    }

    try {
      setCarregando(true);
      const res = await api.post('/auth/redefinir-senha', {
        email,
        token: tokenReset,
        nova_senha: novaSenha
      });
      setMensagemSucesso(res.data.mensagem);
      setModo('login');
      setStepEsqueci(1);
      setSenha('');
      setNovaSenha('');
      setTokenReset('');
    } catch (err: any) {
      setMensagemErro(err.response?.data?.detail || 'Erro ao redefinir senha.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgApp,
        fontFamily: "'Inter', sans-serif",
        padding: '20px',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: colors.bgCard,
          borderRadius: '16px',
          border: `1px solid ${colors.border}`,
          padding: '36px 32px',
          boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* Logotipo / Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="/logo.png"
            alt="Skold Stock Logo"
            style={{ maxWidth: '180px', maxHeight: '180px', objectFit: 'contain', marginBottom: '0px' }}
          />
          <h2
            className="brand-title"
            style={{
              color: colors.textPrimary,
              margin: '0 0 6px 0',
              fontSize: '25px',
              fontWeight: 700,
              fontFamily: "'Rostex-Regular', 'Inter', sans-serif"
            }}
          >
            Skold Stock
          </h2>
          <p style={{ color: colors.textSecondary, margin: 0, fontSize: '13.5px' }}>
            {modo === 'login' && 'Acesse sua conta para gerenciar estoque e margens'}
            {modo === 'registro' && 'Crie uma nova conta de acesso'}
            {modo === 'esqueci' && 'Recuperação de acesso à conta'}
          </p>
        </div>


        {/* Banners de Mensagem */}
        {mensagemErro && (
          <div
            style={{
              backgroundColor: colors.dangerBg,
              border: `1px solid ${colors.dangerBorder}`,
              color: colors.dangerText,
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            ⚠️ {mensagemErro}
          </div>
        )}

        {mensagemSucesso && (
          <div
            style={{
              backgroundColor: colors.successBg,
              border: `1px solid ${colors.successBorder}`,
              color: colors.successText,
              padding: '12px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '20px',
            }}
          >
            ✅ {mensagemSucesso}
          </div>
        )}

        {/* FORMA 1: LOGIN */}
        {modo === 'login' && (
          <form onSubmit={handleLogin}>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={carregando}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '8px',
                border: `1px solid ${colors.borderStrong}`,
                backgroundColor: colors.bgApp,
                color: colors.textPrimary,
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                marginBottom: '20px',
                transition: '0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Entrar com o Google
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: '10px' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} />
              <span style={{ color: colors.textMuted, fontSize: '12px', textTransform: 'uppercase' }}>ou e-mail</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: colors.border }} />
            </div>

            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 500 }}>
              E-mail
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />

            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 500 }}>
              Senha
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={inputStyle}
              required
            />

            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <span
                onClick={() => { limparMensagens(); setModo('esqueci'); setStepEsqueci(1); }}
                style={{ color: colors.accent, fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
              >
                Esqueci minha senha
              </span>
            </div>

            <button
              type="submit"
              disabled={carregando}
              style={{ ...btnStyle, width: '100%', padding: '12px', fontSize: '14.5px', opacity: carregando ? 0.7 : 1 }}
            >
              {carregando ? 'Entrando...' : 'Entrar no Sistema'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '18px', borderTop: `1px solid ${colors.border}` }}>
              <span style={{ color: colors.textSecondary, fontSize: '13.5px' }}>
                Não tem uma conta?{' '}
              </span>
              <span
                onClick={() => { limparMensagens(); setModo('registro'); }}
                style={{ color: colors.accent, fontSize: '13.5px', cursor: 'pointer', fontWeight: 600 }}
              >
                Cadastrar-se
              </span>
            </div>
          </form>
        )}

        {/* FORMA 2: REGISTRO */}
        {modo === 'registro' && (
          <form onSubmit={handleRegistro}>
            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 500 }}>
              Nome Completo
            </label>
            <input
              type="text"
              placeholder="Seu nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={inputStyle}
              required
            />

            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 500 }}>
              E-mail
            </label>
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
            />

            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 500 }}>
              Senha
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              style={inputStyle}
              required
            />

            <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 500 }}>
              Confirmar Senha
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              style={inputStyle}
              required
            />

            <button
              type="submit"
              disabled={carregando}
              style={{ ...btnStyle, width: '100%', padding: '12px', fontSize: '14.5px', marginTop: '8px', opacity: carregando ? 0.7 : 1 }}
            >
              {carregando ? 'Cadastrando...' : 'Criar Minha Conta'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <span
                onClick={() => { limparMensagens(); setModo('login'); }}
                style={{ color: colors.accent, fontSize: '13.5px', cursor: 'pointer', fontWeight: 500 }}
              >
                ← Voltar para o Login
              </span>
            </div>
          </form>
        )}

        {/* FORMA 3: ESQUECI MINHA SENHA */}
        {modo === 'esqueci' && (
          <div>
            {stepEsqueci === 1 ? (
              <form onSubmit={handleSolicitarTokenEsqueci}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 500 }}>
                  E-mail cadastrado
                </label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  required
                />

                <button
                  type="submit"
                  disabled={carregando}
                  style={{ ...btnStyle, width: '100%', padding: '12px', fontSize: '14.5px', marginTop: '8px', opacity: carregando ? 0.7 : 1 }}
                >
                  {carregando ? 'Gerando código...' : 'Solicitar Código de Recuperação'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRedefinirSenha}>
                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 500 }}>
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  required
                />

                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 500 }}>
                  Código de Recuperação (Token)
                </label>
                <input
                  type="text"
                  placeholder="Ex: A1B2C3"
                  value={tokenReset}
                  onChange={(e) => setTokenReset(e.target.value.toUpperCase())}
                  style={{ ...inputStyle, letterSpacing: '2px', fontWeight: 'bold' }}
                  required
                />

                <label style={{ display: 'block', color: colors.textSecondary, fontSize: '12.5px', marginBottom: '6px', fontWeight: 500 }}>
                  Nova Senha
                </label>
                <input
                  type="password"
                  placeholder="Sua nova senha"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  style={inputStyle}
                  required
                />

                <button
                  type="submit"
                  disabled={carregando}
                  style={{ ...btnStyle, width: '100%', padding: '12px', fontSize: '14.5px', marginTop: '8px', opacity: carregando ? 0.7 : 1 }}
                >
                  {carregando ? 'Redefinindo...' : 'Redefinir Senha'}
                </button>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <span
                onClick={() => { limparMensagens(); setModo('login'); }}
                style={{ color: colors.accent, fontSize: '13.5px', cursor: 'pointer', fontWeight: 500 }}
              >
                ← Cancelar e voltar ao Login
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
