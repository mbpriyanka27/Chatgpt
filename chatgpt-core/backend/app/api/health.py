from fastapi import APIRouter
from datetime import datetime, timezone
from app.core.config import settings
from app.models.health import HealthCheckResponse

router = APIRouter()


@router.get("/health", response_model=HealthCheckResponse, summary="System Health Check")
async def health_check():
    return HealthCheckResponse(
        status="healthy",
        project=settings.PROJECT_NAME,
        version=settings.VERSION,
        timestamp=datetime.now(timezone.utc)
    )
