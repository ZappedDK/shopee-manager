import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from core.database import get_db
from models.domain import Usuario

import bcrypt

SECRET_KEY = os.getenv("SECRET_KEY", "shopee_manager_super_secret_jwt_key_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer()

def gerar_hash_senha(senha: str) -> str:
    senha_bytes = senha.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(senha_bytes, salt).decode('utf-8')

def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    try:
        senha_bytes = senha_plana.encode('utf-8')[:72]
        hash_bytes = senha_hash.encode('utf-8')
        return bcrypt.checkpw(senha_bytes, hash_bytes)
    except Exception:
        return False


def criar_token_acesso(dados: dict, expires_delta: Optional[timedelta] = None) -> str:
    para_codificar = dados.copy()
    expira = datetime.utcnow() + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    para_codificar.update({"exp": expira})
    token = jwt.encode(para_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return token

def gerar_token_recuperacao() -> str:
    # Gera um código seguro alfa-numérico de 6 dígitos em maiúsculas
    return secrets.token_hex(3).upper()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Usuario:
    token = credentials.credentials
    credenciais_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas ou sessão expirada.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[int] = payload.get("sub")
        if user_id is None:
            raise credenciais_exception
    except jwt.PyJWTError:
        raise credenciais_exception

    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if usuario is None:
        raise credenciais_exception
    return usuario
