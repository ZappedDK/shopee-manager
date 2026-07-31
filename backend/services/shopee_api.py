import time
import hmac
import hashlib
import json
import urllib.request
from typing import Dict, Any, List, Optional

class ShopeeClient:
    """
    Cliente HTTP para integração com a Shopee Open Platform (API v2).
    Gerencia assinaturas HMAC-SHA256 e consulta de vendas/pedidos.
    """
    def __init__(self, partner_id: Optional[int] = None, partner_key: Optional[str] = None, shop_id: Optional[int] = None, ambiente: str = "PRODUCAO"):
        self.partner_id = partner_id
        self.partner_key = partner_key
        self.shop_id = shop_id
        self.ambiente = ambiente
        self.base_url = "https://partner.shopeemobile.com" if ambiente == "PRODUCAO" else "https://partner.test-stable.shopeemobile.com"

    def _gerar_assinatura(self, path: str, timestamp: int) -> str:
        """Gera a assinatura de segurança HMAC-SHA256 exigida pela Shopee."""
        if not self.partner_id or not self.partner_key:
            return ""
        base_string = f"{self.partner_id}{path}{timestamp}{self.partner_key}"
        return hmac.new(
            self.partner_key.encode('utf-8'),
            base_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    @staticmethod
    def validar_assinatura_webhook(url: str, request_body: bytes, signature_recebida: str, partner_key: str) -> bool:
        """
        Valida a assinatura enviada pelo Webhook da Shopee para evitar requisições forjadas.
        """
        if not signature_recebida or not partner_key:
            return False
        base_string = f"{url}|{request_body.decode('utf-8')}"
        calculada = hmac.new(
            partner_key.encode('utf-8'),
            base_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(calculada, signature_recebida)

    def obter_detalhes_pedido(self, order_sn: str, access_token: str) -> Dict[str, Any]:
        """Busca os detalhes do pedido diretamente na API da Shopee para ler os SKUs e quantidades."""
        if not self.partner_id or not self.partner_key or not self.shop_id:
            raise ValueError("Credenciais da Shopee incompletas (Partner ID, Partner Key ou Shop ID ausentes).")

        path = "/api/v2/order/get_order_detail"
        timestamp = int(time.time())
        sign = self._gerar_assinatura(path, timestamp)
        
        url = f"{self.base_url}{path}?partner_id={self.partner_id}&timestamp={timestamp}&sign={sign}&access_token={access_token}&shop_id={self.shop_id}"
        payload = json.dumps({
            "order_sn_list": [order_sn],
            "response_optional_fields": "item_list"
        }).encode('utf-8')
        
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read().decode('utf-8')
            return json.loads(data)

def extrair_itens_do_webhook(payload: dict) -> List[Dict[str, Any]]:
    """
    Extrai a lista de SKUs e quantidades de um payload de Webhook da Shopee.
    Trata diferentes formatos de notificação da Shopee Open Platform.
    """
    itens_extraidos = []

    # Formato Direct / Teste / Payload Estruturado
    dados = payload.get("data", payload)
    
    # Se o payload já trouxer itens diretamente
    item_list = dados.get("item_list") or dados.get("items") or payload.get("item_list") or []

    if item_list and isinstance(item_list, list):
        for item in item_list:
            sku = item.get("model_sku") or item.get("item_sku") or item.get("sku")
            qtd = int(item.get("model_quantity_purchased") or item.get("quantity") or item.get("qtd") or 1)
            if sku:
                itens_extraidos.append({
                    "sku": str(sku).strip(),
                    "quantidade": max(1, qtd),
                    "nome_item": item.get("item_name") or item.get("model_name") or f"Item {sku}"
                })

    # Fallback se vier SKU único direto no payload
    elif dados.get("sku") or payload.get("sku"):
        sku = str(dados.get("sku") or payload.get("sku")).strip()
        qtd = int(dados.get("quantidade") or payload.get("quantidade") or 1)
        itens_extraidos.append({
            "sku": sku,
            "quantidade": max(1, qtd),
            "nome_item": dados.get("nome_item") or f"Item {sku}"
        })

    return itens_extraidos