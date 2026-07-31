import json
from typing import Dict, Any

def obter_taxas_shopee(preco_venda: float, taxa_extra: float = 0.0):
    """
    Retorna (taxa_percentual, taxa_fixa) para a Shopee com base nas faixas:
    - Até R$ 79,99: taxa 20% + R$ 4,00 fixo
    - De R$ 80,00 a R$ 99,99: taxa 14% + R$ 16,00 fixo
    - De R$ 100,00 a R$ 199,99: taxa 14% + R$ 20,00 fixo
    - De R$ 200,00 em diante: taxa 14% + R$ 26,00 fixo
    """
    if preco_venda <= 79.99:
        taxa_pct = 0.20 + taxa_extra
        taxa_fixa = 4.00
    elif preco_venda <= 99.99:
        taxa_pct = 0.14 + taxa_extra
        taxa_fixa = 16.00
    elif preco_venda <= 199.99:
        taxa_pct = 0.14 + taxa_extra
        taxa_fixa = 20.00
    else:
        taxa_pct = 0.14 + taxa_extra
        taxa_fixa = 26.00

    return taxa_pct, taxa_fixa

def obter_taxas_tiktok(preco_venda: float, taxa_extra: float = 0.0):
    """
    Retorna (taxa_percentual, taxa_fixa) para o TikTok Shop com base nas faixas:
    - Até R$ 50,00: taxa 10% + R$ 4,00 fixo
    - Acima de R$ 50,00: taxa 6% + R$ 6,00 fixo
    """
    if preco_venda <= 50.00:
        taxa_pct = 0.10 + taxa_extra
        taxa_fixa = 4.00
    else:
        taxa_pct = 0.06 + taxa_extra
        taxa_fixa = 6.00

    return taxa_pct, taxa_fixa

def obter_taxas_mercadolivre(preco_venda: float, taxa_extra: float = 0.0, taxa_base: float = 0.14):
    """
    Retorna (taxa_percentual, taxa_fixa) para o Mercado Livre (Clássico ou Premium):
    - Abaixo de R$ 12,50: Custo fixo = 50% do valor da unidade (R$ 8 => R$ 4)
    - De R$ 12,50 a R$ 78,99: Custo fixo R$ 6,00
    - A partir de R$ 79,00: Sem custo fixo (R$ 0,00)
    """
    if preco_venda < 12.50:
        taxa_fixa = preco_venda * 0.50
    elif preco_venda < 79.00:
        taxa_fixa = 6.00
    else:
        taxa_fixa = 0.00

    return taxa_base + taxa_extra, taxa_fixa

def obter_taxas_da_plataforma(preco_venda: float, plataforma: Any):
    """
    Obtém a % de comissão e a taxa fixa com base no preço de venda.
    Se a plataforma possuir faixas_json cadastradas, utiliza as faixas customizadas.
    Caso contrário, verifica fallback para Shopee/TikTok/Mercado Livre ou campos fixos.
    """
    taxa_extra = getattr(plataforma, "taxa_extra", 0.0) or 0.0
    faixas_json = getattr(plataforma, "faixas_json", None)

    if faixas_json:
        try:
            faixas = json.loads(faixas_json) if isinstance(faixas_json, str) else faixas_json
            if faixas and len(faixas) > 0:
                faixas_ordenadas = sorted(faixas, key=lambda f: float(f.get("de_valor", 0.0)))
                for f in faixas_ordenadas:
                    ate = f.get("ate_valor")
                    if ate is None or ate == 0 or preco_venda <= float(ate):
                        tp = float(f.get("taxa_percentual", 0.0))
                        if tp > 1.0: tp = tp / 100.0
                        tf = float(f.get("taxa_fixa", 0.0))
                        return tp + taxa_extra, tf

                ultima = faixas_ordenadas[-1]
                tp = float(ultima.get("taxa_percentual", 0.0))
                if tp > 1.0: tp = tp / 100.0
                tf = float(ultima.get("taxa_fixa", 0.0))
                return tp + taxa_extra, tf
        except Exception as e:
            print(f"Erro ao parsear faixas_json da plataforma: {e}")

    nome_lower = (getattr(plataforma, "nome", "") or "").lower()
    if "shopee" in nome_lower:
        return obter_taxas_shopee(preco_venda, taxa_extra)
    elif "tiktok" in nome_lower or "tik tok" in nome_lower:
        return obter_taxas_tiktok(preco_venda, taxa_extra)
    elif "mercado livre" in nome_lower or "mercadolivre" in nome_lower or "ml" in nome_lower:
        taxa_base = float(getattr(plataforma, "taxa_plataforma", 0.0) or 0.0)
        if taxa_base == 0.0:
            taxa_base = 0.19 if "premium" in nome_lower else 0.14
        return obter_taxas_mercadolivre(preco_venda, taxa_extra, taxa_base)

    tp = (getattr(plataforma, "taxa_plataforma", 0.0) or 0.0) + taxa_extra
    tf = getattr(plataforma, "taxa_fixa", 0.0) or 0.0
    return tp, tf

import json
import functools
from typing import Dict, Any, Optional

@functools.lru_cache(maxsize=8192)
def _calcular_metricas_cached(
    preco_venda: float,
    custo_unitario: float,
    custo_embalagem_un: float,
    custo_etiqueta_un: float,
    plat_id: Optional[int],
    plat_nome: str,
    plat_icone: str,
    plat_taxa_plataforma: float,
    plat_taxa_fixa: float,
    plat_taxa_extra: float,
    plat_faixas_json: Optional[str]
) -> Dict[str, Any]:
    class DummyPlataforma:
        def __init__(self):
            self.id = plat_id
            self.nome = plat_nome
            self.icone = plat_icone
            self.taxa_plataforma = plat_taxa_plataforma
            self.taxa_fixa = plat_taxa_fixa
            self.taxa_extra = plat_taxa_extra
            self.faixas_json = plat_faixas_json

    plataforma = DummyPlataforma()
    taxa_pct, taxa_fixa = obter_taxas_da_plataforma(preco_venda, plataforma)
    taxa_percentual_total = preco_venda * taxa_pct
    
    # Custo Total Real
    custo_total = (
        custo_unitario + 
        taxa_fixa + 
        custo_embalagem_un + 
        custo_etiqueta_un + 
        taxa_percentual_total
    )
    
    lucro = preco_venda - custo_total
    margem_final = (lucro / preco_venda) if preco_venda > 0 else 0
    roas_minimo = preco_venda / custo_unitario if custo_unitario > 0 else 0

    return {
        "plataforma_id": plat_id,
        "plataforma_nome": plat_nome,
        "icone": plat_icone,
        "lucro_liquido": lucro,
        "margem_final": margem_final,
        "taxa_plataforma_real": taxa_percentual_total,
        "taxa_fixa": taxa_fixa,
        "taxa_percentual_aplicada": taxa_pct,
        "custo_embalagem": custo_embalagem_un,
        "custo_etiqueta": custo_etiqueta_un,
        "custo_total": custo_total,
        "roas_minimo": roas_minimo
    }

def limpar_cache_financeiro():
    """Limpa o cache LRU em memória das métricas financeiras."""
    _calcular_metricas_cached.cache_clear()

def calcular_metricas_plataforma(
    preco_venda: float,
    custo_unitario: float,
    custo_embalagem_un: float,
    custo_etiqueta_un: float,
    plataforma: Any
) -> Dict[str, Any]:
    return _calcular_metricas_cached(
        round(float(preco_venda or 0.0), 4),
        round(float(custo_unitario or 0.0), 4),
        round(float(custo_embalagem_un or 0.0), 4),
        round(float(custo_etiqueta_un or 0.0), 4),
        getattr(plataforma, "id", None),
        getattr(plataforma, "nome", "") or "",
        getattr(plataforma, "icone", "") or "",
        float(getattr(plataforma, "taxa_plataforma", 0.0) or 0.0),
        float(getattr(plataforma, "taxa_fixa", 0.0) or 0.0),
        float(getattr(plataforma, "taxa_extra", 0.0) or 0.0),
        str(getattr(plataforma, "faixas_json", "") or "")
    )

def calcular_preco_por_margem(
    custo_unitario: float,
    custo_embalagem_un: float,
    custo_etiqueta_un: float,
    plataforma: Any,
    margem_desejada_pct: float
) -> Dict[str, Any]:
    margem_decimal = margem_desejada_pct / 100.0
    taxa_extra = getattr(plataforma, "taxa_extra", 0.0) or 0.0
    custos_base = custo_unitario + custo_embalagem_un + custo_etiqueta_un
    faixas_json = getattr(plataforma, "faixas_json", None)

    faixas = []
    if faixas_json:
        try:
            lista = json.loads(faixas_json) if isinstance(faixas_json, str) else faixas_json
            if lista and len(lista) > 0:
                for f in sorted(lista, key=lambda x: float(x.get("de_valor", 0.0))):
                    tp = float(f.get("taxa_percentual", 0.0))
                    if tp > 1.0: tp = tp / 100.0
                    faixas.append({
                        "max_p": float(f["ate_valor"]) if f.get("ate_valor") else float('inf'),
                        "taxa_pct": tp + taxa_extra,
                        "taxa_fixa": float(f.get("taxa_fixa", 0.0))
                    })
        except Exception as e:
            print(f"Erro ao carregar faixas para simulador: {e}")

    if not faixas:
        nome_lower = (getattr(plataforma, "nome", "") or "").lower()
        if "shopee" in nome_lower:
            faixas = [
                {"max_p": 79.99, "taxa_pct": 0.20 + taxa_extra, "taxa_fixa": 4.00},
                {"max_p": 99.99, "taxa_pct": 0.14 + taxa_extra, "taxa_fixa": 16.00},
                {"max_p": 199.99, "taxa_pct": 0.14 + taxa_extra, "taxa_fixa": 20.00},
                {"max_p": float('inf'), "taxa_pct": 0.14 + taxa_extra, "taxa_fixa": 26.00},
            ]
        elif "tiktok" in nome_lower or "tik tok" in nome_lower:
            faixas = [
                {"max_p": 50.00, "taxa_pct": 0.10 + taxa_extra, "taxa_fixa": 4.00},
                {"max_p": float('inf'), "taxa_pct": 0.06 + taxa_extra, "taxa_fixa": 6.00},
            ]
        elif "mercado livre" in nome_lower or "mercadolivre" in nome_lower or "ml" in nome_lower:
            taxa_base = float(getattr(plataforma, "taxa_plataforma", 0.0) or 0.0)
            if taxa_base == 0.0:
                taxa_base = 0.19 if "premium" in nome_lower else 0.14
            faixas = [
                {"max_p": 12.49, "taxa_pct": taxa_base + 0.50 + taxa_extra, "taxa_fixa": 0.00},
                {"max_p": 78.99, "taxa_pct": taxa_base + taxa_extra, "taxa_fixa": 6.00},
                {"max_p": float('inf'), "taxa_pct": taxa_base + taxa_extra, "taxa_fixa": 0.00},
            ]
        else:
            tp = (getattr(plataforma, "taxa_plataforma", 0.0) or 0.0) + taxa_extra
            tf = getattr(plataforma, "taxa_fixa", 0.0) or 0.0
            faixas = [{"max_p": float('inf'), "taxa_pct": tp, "taxa_fixa": tf}]

    preco_encontrado = None
    for faixa in faixas:
        denominador = 1.0 - faixa["taxa_pct"] - margem_decimal
        if denominador > 0:
            p_cand = (custos_base + faixa["taxa_fixa"]) / denominador
            if p_cand <= faixa["max_p"] or faixa["max_p"] == float('inf'):
                taxa_pct_real, taxa_fixa_real = obter_taxas_da_plataforma(p_cand, plataforma)
                if abs(taxa_fixa_real - faixa["taxa_fixa"]) < 0.01:
                    preco_encontrado = p_cand
                    break

    if preco_encontrado is None:
        ultima_faixa = faixas[-1]
        denominador = 1.0 - ultima_faixa["taxa_pct"] - margem_decimal
        if denominador > 0:
            preco_encontrado = (custos_base + ultima_faixa["taxa_fixa"]) / denominador

    if not preco_encontrado or (1.0 - faixas[-1]["taxa_pct"] - margem_decimal) <= 0:
        return {
            "plataforma_id": getattr(plataforma, "id", None),
            "plataforma_nome": getattr(plataforma, "nome", ""),
            "icone": getattr(plataforma, "icone", ""),
            "inviavel": True,
            "mensagem": "Margem inviável: As taxas da plataforma + margem superam 100% do valor.",
            "preco_sugerido": 0.0,
            "lucro_liquido": 0.0,
            "margem_final": 0.0,
            "taxa_plataforma_real": 0.0,
            "taxa_fixa": 0.0,
            "custo_embalagem": custo_embalagem_un,
            "custo_etiqueta": custo_etiqueta_un,
            "custo_total": 0.0,
            "roas_minimo": 0.0
        }

    preco_sugerido = preco_encontrado

    res = calcular_metricas_plataforma(
        preco_venda=preco_sugerido,
        custo_unitario=custo_unitario,
        custo_embalagem_un=custo_embalagem_un,
        custo_etiqueta_un=custo_etiqueta_un,
        plataforma=plataforma
    )

    res["inviavel"] = False
    res["preco_sugerido"] = preco_sugerido
    res["margem_desejada_pct"] = margem_desejada_pct
    return res