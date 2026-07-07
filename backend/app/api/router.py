from fastapi import APIRouter
from app.api.routes.health import router as health_router
from app.api.routes.auth import router as auth_router
from app.api.routes.documents import router as documents_router
from app.api.routes.search import router as search_router
from app.api.routes.assistant import router as assistant_router
from app.api.routes.admin import router as admin_router

api_router = APIRouter()

# System routes (no prefix) — health, readiness, liveness, metrics
api_router.include_router(health_router)

# Auth routes — versioned under /api/v1/auth
api_router.include_router(auth_router, prefix="/api/v1/auth")

# Document routes — versioned under /api/v1/documents
api_router.include_router(documents_router, prefix="/api/v1/documents")

# Search routes — versioned under /api/v1/search (Milestone 6)
api_router.include_router(search_router, prefix="/api/v1/search")

# Assistant routes — versioned under /api/v1/assistant (Milestone 7)
api_router.include_router(assistant_router, prefix="/api/v1/assistant")

# Admin routes — versioned under /api/v1/admin (Milestone 9, role-protected)
api_router.include_router(admin_router, prefix="/api/v1/admin")
