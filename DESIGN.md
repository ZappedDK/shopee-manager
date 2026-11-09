# DESIGN.md — Skold Stock

Linguagem visual inspirada no **Mercury** (mercury.com): sóbria, financeira, confiável.
Modo da interface: **Operate**. É uma ferramenta de trabalho: a leitura rápida de números vem antes da expressão visual.

## Princípios
1. **Um único acento.** Índigo para ações, links e o item ativo. Verde e vermelho só aparecem com significado (lucro, prejuízo, estoque zerado). Nunca como decoração.
2. **Superfícies, não caixas coloridas.** Fundo off-white, cards brancos, borda de 1px e sombra quase imperceptível. Sem faixas coloridas na lateral dos cards.
3. **Pesos contidos.** Títulos em 500, números grandes em 500 com tracking negativo. Rótulos sem caixa alta.
4. **Números tabulares** em tabelas e valores, para alinhar em coluna.
5. **Movimento curto e com propósito.** Pressão (scale 0.97), entrada de página, modais e gaveta. Respeita "reduzir movimento".

## Tokens (index.css)
| Token | Claro | Escuro |
|---|---|---|
| `--bg-app` | #f7f7f9 | #0f0f13 |
| `--bg-card` | #ffffff | #17171c |
| `--border` | #e8e8ee | #25252d |
| `--text-primary` | #1c1c24 | #ececf1 |
| `--text-secondary` | #5d5d6f | #a3a3b2 |
| `--accent` | #5266eb | #5d6ff0 |
| `--positive` | #11805a | #3fcf93 |
| `--negative` | #cc3a3d | #f2767c |

- **Raios:** 6 / 8 (controles) / 12 (cards) / 16 (modais).
- **Fonte:** Inter (Google Fonts), com a fonte do sistema como reserva. A marca "Skold Stock" usa Rostex.
- **Curvas:** `--ease-out` cubic-bezier(0.23, 1, 0.32, 1) e `--ease-drawer` cubic-bezier(0.32, 0.72, 0, 1).

## Regras para código novo
- Usar `colors.*` e `tint()` de `theme.ts`. **Nunca** usar hex ou rgba fixos (eles quebram o tema escuro).
- Hover, foco e press ficam no CSS. Não usar `onMouseEnter`/`onMouseLeave` para estilo.
- Botões: `btnStyle` é o primário (sólido índigo). `btnPurpleStyle` e `btnNeutralStyle` são secundários (superfície com borda). `btnDangerStyle` é para excluir.
- Modais: overlay com `className="modal-overlay"` e painel com `className="modal-panel"`. No celular eles viram bottom sheet automaticamente.
- Tabelas sempre dentro de `<div className="table-scroll">`.
