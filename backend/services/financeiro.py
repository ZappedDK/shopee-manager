from typing import Dict

def calcular_metricas_shopee(
    preco_venda: float,
    custo_unitario: float,
    custo_pacote_embalagem: float,
    qtd_embalagens_pacote: int,
    custo_pacote_etiqueta: float,
    qtd_etiquetas_pacote: int,
    taxa_plataforma_percentual: float = 0.14, # 14%
    taxa_frete_gratis_percentual: float = 0.06, # 6%
    taxa_fixa: float = 4.00 # R$ 4,00
) -> Dict[str, float]:
    """
    Motor financeiro para calcular as métricas exatas de lucro e ROAS
    baseado na precificação e taxas da Shopee.
    """
    # Validação de segurança (Evita erro matemático de divisão por zero)
    if preco_venda <= 0 or qtd_embalagens_pacote <= 0 or qtd_etiquetas_pacote <= 0:
        raise ValueError("O Preço de venda e as quantidades devem ser maiores que zero.")

    # Rateio dos custos de insumos por unidade
    custo_embalagem_un = custo_pacote_embalagem / qtd_embalagens_pacote
    custo_etiqueta_un = custo_pacote_etiqueta / qtd_etiquetas_pacote

    # Calculando as comissões da plataforma
    custo_taxas_percentuais = preco_venda * (taxa_plataforma_percentual + taxa_frete_gratis_percentual)

    # Custo Total Real da Venda
    custo_total = (
        custo_unitario + 
        taxa_fixa + 
        custo_embalagem_un + 
        custo_etiqueta_un + 
        custo_taxas_percentuais
    )

    # Indicadores de Performance
    lucro_liquido = preco_venda - custo_total
    margem_final = 1 - (custo_total / preco_venda)
    roas_minimo = preco_venda / custo_unitario if custo_unitario > 0 else 0
    preco_partida = preco_venda * 2

    # Retorna o relatório completo formatado com 2 casas decimais
    return {
        "custo_total": round(custo_total, 2),
        "lucro_liquido": round(lucro_liquido, 2),
        "margem_final_percentual": round(margem_final * 100, 2),
        "roas_minimo": round(roas_minimo, 2),
        "preco_partida": round(preco_partida, 2),
        "custo_embalagem_un": round(custo_embalagem_un, 2),
        "custo_etiqueta_un": round(custo_etiqueta_un, 2)
    }