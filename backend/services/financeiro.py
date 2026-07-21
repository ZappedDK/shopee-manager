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