from pydantic import BaseModel
from datetime import datetime


class HealthCheckResponse(BaseModel):
    status: str
    project: str
    version: str
    timestamp: datetime
