from pydantic_settings import BaseSettings
from functools import lru_cache
# class for environment variables
class Settings(BaseSettings):
    DATABASE_URL: str
    APP_ENV: str = "development"
    DEBUG: bool = True
    # configuration for pydantic settings
    class Config:
        env_file = ".env"
        extra = "ignore"
# function to get settings with caching
@lru_cache()
def get_settings():
    return Settings()