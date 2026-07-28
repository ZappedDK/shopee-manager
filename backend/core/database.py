import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Caminho absoluto para o diretório raiz do backend
BACKEND_DIR = Path(__file__).resolve().parent.parent

# Carrega variáveis de ambiente do arquivo .env se existir
load_dotenv(BACKEND_DIR / ".env")

# URL padrão apontando de forma absoluta para a pasta backend (usando barras normais para compatibilidade Windows)
db_path = (BACKEND_DIR / "estoque_shopee.db").as_posix()
DEFAULT_SQLITE_URL = f"sqlite:///{db_path}"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)

# Ajusta prefixo legado postgres:// para postgresql:// caso venha de provedores como Render/Heroku/Supabase
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Se for SQLite com caminho relativo tipo sqlite:///./estoque_shopee.db, garante o caminho absoluto na pasta backend
if DATABASE_URL.startswith("sqlite:///./"):
    db_name = DATABASE_URL.replace("sqlite:///./", "")
    DATABASE_URL = f"sqlite:///{ (BACKEND_DIR / db_name).as_posix() }"

# Configurações do engine de acordo com o banco
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Todas as tabelas herdam desta mesma Base central
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
