# Plano de melhorias (auditoria /improve — 09/11/2026, commit 82db6f2)

Itens encontrados na auditoria e ainda **não** aplicados. Estão em ordem de prioridade.

| # | Achado | Categoria | Impacto | Esforço | Evidência |
|---|--------|-----------|---------|---------|-----------|
| 1 | Chave JWT com valor padrão fixo no código | Segurança | Alto: quem tiver o repositório consegue gerar tokens válidos se `SECRET_KEY` não estiver no ambiente | P | `backend/core/auth.py:15` |
| 2 | `venv/` (1.356 arquivos), `__pycache__` e o banco `estoque_shopee.db` versionados no git | Segurança / DX | O banco pode conter usuários e hashes de senha. O clone fica pesado e cada máquina "suja" o `git status` | P | `git ls-files` (`controle_estoque_shopee/venv/`, `backend/estoque_shopee.db`) |
| 3 | CORS liberado para qualquer origem | Segurança | Qualquer site pode chamar a API com o token do usuário | P | `backend/main.py:117` |
| 4 | O service worker serve o `index.html` do cache primeiro | Correção | Depois de cada deploy, o usuário vê a versão antiga até recarregar a página duas vezes | P | `frontend/public/sw.js` (handler `fetch`) |
| 5 | `carregarInsumos` busca os mesmos 3 endpoints duas vezes | Performance | Requisições duplicadas a cada carga | P | `frontend/src/App.tsx` (função `carregarInsumos`) |
| 6 | `App.tsx` com ~1.900 linhas: estoque, cadastros, plataformas e almoxarifado no mesmo componente | Dívida técnica | Qualquer mudança arrisca quebrar outra tela | G | `frontend/src/App.tsx` |
| 7 | Sem testes e sem `npm run lint` no fluxo | DX | Regressões passam despercebidas | M | `frontend/package.json` |
| 8 | Arquivos do template Vite sem uso | Limpeza | Ruído | P | `frontend/src/App.css`, `frontend/src/assets/` |

## Como corrigir (resumo)

1. Remover o valor padrão de `SECRET_KEY` e falhar ao iniciar se a variável não existir. Gerar uma chave nova: a atual está publicada no histórico do git e deve ser considerada vazada.
2. Rodar `git rm -r --cached controle_estoque_shopee/venv backend/estoque_shopee.db` e também os `__pycache__`, depois commitar. O `.gitignore` já cobre esses caminhos. Se o banco tiver dados reais, trocar as senhas dos usuários.
3. Trocar `allow_origins=["*"]` pela URL do front (Vercel) e por `http://localhost:5173`.
4. Usar estratégia network-first para navegação (`request.mode === 'navigate'`), deixando o cache só como reserva offline.
5. Remover as 3 chamadas `apiGet` repetidas e manter apenas o `apiGetSWR`.
6. Extrair `TelaEstoque`, `TelaCadastros`, `TelaPlataformas` e `TelaAlmoxarifado` para arquivos próprios, uma tela por vez.

## Já corrigido nesta rodada (front-end)

- `?view=sem_venda` e `?view=integracoes` voltavam para o Dashboard ao recarregar a página (faltavam em `validViews`).
- Ícones com `className="spin"` não giravam (não havia CSS para a classe).
- O viewport bloqueava o zoom (`user-scalable=no`). Agora os campos têm 16px no celular, o que evita o zoom automático do iOS sem bloquear o zoom do usuário.
- `width: 100vw` gerava rolagem horizontal no Windows. Algumas telas também estouravam a largura no celular.
- O componente `MenuItem` era recriado a cada render e remontava os links do menu.
