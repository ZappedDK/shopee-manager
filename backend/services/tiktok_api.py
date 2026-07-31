import time
import hmac
import hashlib
import json
import urllib.request
from typing import Dict, Any, List, Optional

class TikTokShopClient:
    """
    Cliente HTTP para integração com a TikTok Shop Open Platform (API v2).
    Gerencia a assinatura HMAC-SHA256 e o recebimento de webhooks/pedidos.
    """
    def __init__(self, app_key: Optional[str] = None, app_secret: Optional[str] = None, shop_cipher: Optional[str] = None, ambiente: str = "PRODUCAO"):
        self.app_key = app_key
        self.app_secret = app_secret
        self.shop_cipher = shop_cipher
        self.ambiente = ambiente
        self.base_url = "https://open-api.tiktokglobalshop.com" if ambiente == "PRODUCAO" else "https://open-api-sandbox.tiktokglobalshop.com"

    def _gerar_assinatura_req(self, path: str, params: Dict[str, Any], body_str: str, timestamp: int) -> str:
        """Gera a assinatura HMAC-SHA256 conforme especificação da TikTok Shop API."""
        if not self.app_secret:
            return ""
        
        # Ordena parâmetros exceto sign e access_token
        params_filtrados = {k: v for k, v in params.items() if k not in ["sign", "access_token"]}
        params_ordenados = "".join([f"{k}{params_filtrados[k]}" for k in sorted(params_filtrados.keys())])
        
        input_string = f"{self.app_secret}{path}{params_ordenados}{body_str}{self.app_secret}"
        return hmac.new(
            self.app_secret.encode('utf-8'),
            input_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    @staticmethod
    def validar_assinatura_webhook(request_body: bytes, signature_header: str, app_secret: str) -> bool:
        """
        Valida o evento recebido do Webhook do TikTok Shop.
        """
        if not signature_header or not app_secret:
            return False
        calculada = hmac.new(
            app_secret.encode('utf-8'),
            request_body,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(calculada, signature_header)

def extrair_itens_do_webhook_tiktok(payload: dict) -> List[Dict[str, Any]]:
    """
    Extrai a lista de SKUs e quantidades de um payload de Webhook do TikTok Shop.
    Notificação típica do TikTok: type=1 (ORDER_STATUS_UPDATE / ORDER_CREATE).
    """
    itens_extraidos = []
    dados = payload.get("data", payload)

    # Formato de notificação do TikTok Shop v2
    order_line_list = (
        dados.get("order_line_list") or 
        dados.get("item_list") or 
        dados.get("items") or 
        payload.get("order_line_list") or []
    )

    if order_line_list and isinstance(order_line_list, list):
        for item in order_line_list:
            sku = (
                item.get("seller_sku") or 
                item.get("sku_id") or 
                item.get("product_sku") or 
                item.get("sku")
            )
            qtd = int(
                item.get("quantity") or 
                item.get("qty") or 
                item.get("item_count") or 1
            )
            if sku:
                itens_extraidos.append({
                    "sku": str(sku).strip(),
                    "quantidade": max(1, qtd),
                    "nome_item": item.get("product_name") or item.get("item_name") or f"Item {sku}"
                })

    # Fallback se vier SKU único direto no payload de simulação
    elif dados.get("sku") or payload.get("sku"):
        sku = str(dados.get("sku") or payload.get("sku")).strip()
        qtd = int(dados.get("quantidade") or payload.get("quantidade") or 1)
        itens_extraidos.append({
            "sku": sku,
            "quantidade": max(1, qtd),
            "nome_item": dados.get("nome_item") or f"Item {sku}"
        })

    return itens_extraidos
