from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from controllers.init import AuthenticationRouter, SubscriptionRouter
import os

# Optional base path to namespace this service and avoid route collisions.
# Set the environment variable `API_BASE_PATH` (example: "gateway" or "api/v1").
BASE_PATH = os.getenv("API_BASE_PATH", "").strip()
if BASE_PATH and not BASE_PATH.startswith("/"):
    BASE_PATH = "/" + BASE_PATH

# Configure documentation and OpenAPI paths to live under the base path when set.
docs_url = f"{BASE_PATH}/docs" if BASE_PATH else "/docs"
openapi_url = f"{BASE_PATH}/openapi.json" if BASE_PATH else "/openapi.json"
redoc_url = f"{BASE_PATH}/redoc" if BASE_PATH else "/redoc"

app = FastAPI(docs_url=docs_url, openapi_url=openapi_url, redoc_url=redoc_url)

# Enable CORS
origins = ["http://localhost:5173"]  # if you want to allow request from all then use "*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under the optional base path
if BASE_PATH:
    app.include_router(AuthenticationRouter, prefix=BASE_PATH)
    app.include_router(SubscriptionRouter, prefix=BASE_PATH)
else:
    app.include_router(AuthenticationRouter)
    app.include_router(SubscriptionRouter)


@app.get("/")
def home():
    return "Started...."

# Also expose a namespaced root when BASE_PATH is configured (e.g. /gateway/)
if BASE_PATH:
    @app.get(f"{BASE_PATH}/")
    def namespaced_home():
        return "Started...."