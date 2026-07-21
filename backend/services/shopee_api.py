import time
import hmac
import hashlib
import requests
from typing import Dict, Any

class ShopeeClient:
    """
    Cliente HTTP para integração com a Shopee Open Platform.
    Gerencia a assinatura HMAC-SHA256 exigida pela plataforma.
    """
    def __init__(self, partner_id: int, partner_key: str, shop_id: int):
        self.partner_id = partner_id
        self.partner_key = partner_key
        self.shop_id = shop_id
        self.base_url = "https://partner.shopeemobile.com" # URL de Produção

    def _gerar_assinatura(self, path: str, timestamp: int) -> str:
        """Gera o token de segurança exigido pela API da Shopee."""
        base_string = f"{self.partner_id}{path}{timestamp}{self.partner_key}"
        return hmac.new(
            self.partner_key.encode(),
            base_string.encode(),
            hashlib.sha256
        ).hexdigest()

    def obter_detalhes_pedido(self, order_sn: str, access_token: str) -> Dict[str, Any]:
        """Busca os detalhes de um pedido específico para abatermos o estoque."""
        path = "/api/v2/order/get_order_detail"
        timestamp = int(time.time())
        sign = self._gerar_assinatura(path, timestamp)
        
        url = f"{self.base_url}{path}?partner_id={self.partner_id}&timestamp={timestamp}&sign={sign}&access_token={access_token}&shop_id={self.shop_id}"
        
        # Payload com o número do pedido
        payload = {"order_sn_list": [order_sn]}
        
        response = requests.post(url, json=payload)
        response.raise_for_status() # Dispara erro se a Shopee retornar falha (ex: 401 Unauthorized)
        
        return response.json()