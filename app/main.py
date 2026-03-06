"""
FastAPI app demo kết nối MongoDB Replica Set
Chạy: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional, List
from datetime import datetime
import os

# ─── Cấu hình ─────────────────────────────────────────────────────────────────
MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://appuser:apppass123@localhost:27017,localhost:27018,localhost:27019"
    "/appdb?replicaSet=rs0&authSource=appdb"
)

app = FastAPI(
    title="MongoDB Replica Set Demo",
    description="Demo FastAPI + MongoDB Cluster (Replica Set rs0)",
    version="1.0.0",
)

# ─── Kết nối MongoDB ──────────────────────────────────────────────────────────
client: Optional[AsyncIOMotorClient] = None
db = None


@app.on_event("startup")
async def startup():
    global client, db
    client = AsyncIOMotorClient(MONGO_URI)
    db = client["appdb"]
    print("✅ Đã kết nối MongoDB Replica Set!")


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ─── Models ───────────────────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    name: str = Field(..., example="Laptop Dell XPS 15")
    category: str = Field(..., example="Electronics")
    price: float = Field(..., gt=0, example=25000000)
    stock: int = Field(..., ge=0, example=50)


class ProductResponse(ProductCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


def serialize(doc: dict) -> dict:
    """Chuyển ObjectId → string"""
    doc["id"] = str(doc.pop("_id"))
    return doc


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    """Kiểm tra kết nối và trạng thái Replica Set"""
    try:
        # Lấy thông tin replica set
        status = await client.admin.command("replSetGetStatus")
        members = [
            {
                "name": m["name"],
                "state": m["stateStr"],
                "health": "✅ OK" if m["health"] == 1 else "❌ DOWN",
            }
            for m in status["members"]
        ]
        return {
            "message": "MongoDB Replica Set đang hoạt động!",
            "replica_set": status["set"],
            "members": members,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/products", response_model=dict, tags=["Products"])
async def create_product(product: ProductCreate):
    """Tạo sản phẩm mới — ghi vào Primary"""
    doc = product.model_dump()
    doc["created_at"] = datetime.utcnow()
    result = await db.products.insert_one(doc)
    return {
        "message": "✅ Tạo sản phẩm thành công",
        "id": str(result.inserted_id),
    }


@app.get("/products", response_model=List[dict], tags=["Products"])
async def get_products(limit: int = 10, skip: int = 0):
    """Lấy danh sách sản phẩm — đọc từ Secondary (Read Preference)"""
    cursor = db.products.find().skip(skip).limit(limit)
    products = []
    async for doc in cursor:
        products.append(serialize(doc))
    return products


@app.get("/products/{product_id}", response_model=dict, tags=["Products"])
async def get_product(product_id: str):
    """Lấy chi tiết 1 sản phẩm"""
    try:
        doc = await db.products.find_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return serialize(doc)


@app.put("/products/{product_id}", response_model=dict, tags=["Products"])
async def update_product(product_id: str, product: ProductCreate):
    """Cập nhật sản phẩm"""
    try:
        result = await db.products.update_one(
            {"_id": ObjectId(product_id)},
            {"$set": product.model_dump()},
        )
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return {"message": "✅ Cập nhật thành công"}


@app.delete("/products/{product_id}", tags=["Products"])
async def delete_product(product_id: str):
    """Xóa sản phẩm"""
    try:
        result = await db.products.delete_one({"_id": ObjectId(product_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy sản phẩm")
    return {"message": "✅ Đã xóa sản phẩm"}


@app.post("/products/seed/{count}", tags=["Demo"])
async def seed_products(count: int = 20):
    """Tạo dữ liệu mẫu để demo"""
    import random

    categories = ["Electronics", "Fashion", "Food", "Sports", "Books"]
    names = ["Laptop", "Phone", "Tablet", "Watch", "Headphone", "Camera", "TV"]
    brands = ["Samsung", "Apple", "Dell", "Sony", "LG", "Xiaomi"]

    docs = [
        {
            "name": f"{random.choice(brands)} {random.choice(names)} {i+1}",
            "category": random.choice(categories),
            "price": round(random.uniform(100000, 50000000), -3),
            "stock": random.randint(0, 200),
            "created_at": datetime.utcnow(),
        }
        for i in range(count)
    ]

    result = await db.products.insert_many(docs)
    return {
        "message": f"✅ Đã tạo {len(result.inserted_ids)} sản phẩm mẫu",
        "count": len(result.inserted_ids),
    }


@app.get("/cluster/status", tags=["Cluster"])
async def cluster_status():
    """Thông tin chi tiết về Replica Set"""
    status = await client.admin.command("replSetGetStatus")
    return {
        "replica_set_name": status["set"],
        "date": status["date"],
        "members": [
            {
                "id": m["_id"],
                "name": m["name"],
                "state": m["stateStr"],
                "health": m["health"],
                "uptime_seconds": m.get("uptime", 0),
                "last_heartbeat": m.get("lastHeartbeat"),
                "ping_ms": m.get("pingMs"),
            }
            for m in status["members"]
        ],
    }


@app.get("/cluster/failover-test", tags=["Cluster"])
async def failover_info():
    """Hướng dẫn test failover"""
    return {
        "instructions": [
            "1️⃣  Xem Primary hiện tại: GET /cluster/status",
            "2️⃣  Dừng container Primary: docker stop mongo1",
            "3️⃣  Gọi lại API ngay: GET /cluster/status (Secondary tự bầu Primary)",
            "4️⃣  Khởi động lại: docker start mongo1",
            "5️⃣  mongo1 sẽ gia nhập lại cluster với vai trò Secondary",
        ],
        "expected_failover_time": "~10-30 giây",
        "connection_string_tip": "Motor driver tự reconnect — app không cần restart!",
    }
