from typing import Dict, Any

def calcular_metricas_plataforma(
    preco_venda: float,
    custo_unitario: float,
    custo_embalagem_un: float,
    custo_etiqueta_un: float,
    plataforma: Any
) -> Dict[str, Any]:
    
    # Soma da % (Comissão + Frete)
    taxa_percentual_total = preco_venda * (plataforma.taxa_plataforma + plataforma.taxa_extra)
    
    # Custo Total Real
    custo_total = (
        custo_unitario + 
        plataforma.taxa_fixa + 
        custo_embalagem_un + 
        custo_etiqueta_un + 
        taxa_percentual_total
    )
    
    lucro = preco_venda - custo_total
    margem_final = (lucro / preco_venda) if preco_venda > 0 else 0
    roas_minimo = preco_venda / custo_unitario if custo_unitario > 0 else 0

    return {
        "plataforma_id": plataforma.id,
        "plataforma_nome": plataforma.nome,
        "icone": plataforma.icone,
        "lucro_liquido": lucro,
        "margem_final": margem_final,
        "taxa_plataforma_real": taxa_percentual_total,
        "taxa_fixa": plataforma.taxa_fixa,
        "custo_embalagem": custo_embalagem_un,
        "custo_etiqueta": custo_etiqueta_un,
        "custo_total": custo_total,
        "roas_minimo": roas_minimo
    }

def calcular_preco_por_margem(
    custo_unitario: float,
    custo_embalagem_un: float,
    custo_etiqueta_un: float,
    plataforma: Any,
    margem_desejada_pct: float
) -> Dict[str, Any]:
    margem_decimal = margem_desejada_pct / 100.0
    taxa_pct_plataforma = plataforma.taxa_plataforma + plataforma.taxa_extra
    
    # Custos Fixos Totais
    custos_fixos = custo_unitario + custo_embalagem_un + custo_etiqueta_un + plataforma.taxa_fixa
    
    # Denominador = 1 - Taxas% - Margem%
    denominador = 1.0 - taxa_pct_plataforma - margem_decimal
    
    if denominador <= 0:
        return {
            "plataforma_id": plataforma.id,
            "plataforma_nome": plataforma.nome,
            "icone": plataforma.icone,
            "inviavel": True,
            "mensagem": "Margem inviável: As taxas da plataforma + margem superam 100% do valor.",
            "preco_sugerido": 0.0,
            "lucro_liquido": 0.0,
            "margem_final": 0.0,
            "taxa_plataforma_real": 0.0,
            "taxa_fixa": plataforma.taxa_fixa,
            "custo_embalagem": custo_embalagem_un,
            "custo_etiqueta": custo_etiqueta_un,
            "custo_total": 0.0,
            "roas_minimo": 0.0
        }
    
    preco_sugerido = custos_fixos / denominador
    
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