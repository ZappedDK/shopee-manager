import { useState } from 'react';

// Extensões testadas em ordem — o componente tenta cada uma até achar o arquivo.
const EXTENSOES = ['png', 'svg', 'webp', 'jpg', 'jpeg'];

/**
 * Transforma o nome da plataforma no "slug" usado para achar o arquivo de logo.
 * Ex: "Mercado Livre" -> "mercadolivre", "Shopee" -> "shopee", "TikTok Shop" -> "tiktokshop"
 * Minúsculas, sem acento, sem espaço/pontuação.
 */
function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9]/g, '');       // remove espaços/símbolos
}

interface PlatformIconProps {
  nome: string;
  icone?: string; // emoji de fallback, cadastrado na plataforma
  size?: number;
}

/**
 * Mostra a logo real da plataforma se existir um arquivo em
 * /public/logos/{slug}.(png|svg|webp|jpg|jpeg).
 * Se não encontrar nenhum arquivo, mostra o emoji cadastrado (icone) como antes.
 */
export function PlatformIcon({ nome, icone, size = 20 }: PlatformIconProps) {
  const [tentativa, setTentativa] = useState(0);
  const slug = slugify(nome);

  if (!slug || tentativa >= EXTENSOES.length) {
    return <span style={{ fontSize: size, lineHeight: 1 }}>{icone || '🏪'}</span>;
  }

  const src = `/logos/${slug}.${EXTENSOES[tentativa]}`;

  return (
    <img
      key={src}
      src={src}
      alt={nome}
      onError={() => setTentativa(t => t + 1)}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: 4,
        verticalAlign: 'middle',
      }}
    />
  );
}
