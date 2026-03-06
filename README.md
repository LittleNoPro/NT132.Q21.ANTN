# 🍃 MongoDB Replica Set Demo — Docker + FastAPI

## 📖 Tổng quan dự án

Dự án này dựng một **MongoDB Replica Set 3 node** hoàn chỉnh bằng Docker, kèm theo ứng dụng **FastAPI** để minh họa cách một ứng dụng thực tế tương tác với cluster. Mục tiêu chính là demo hai tính năng cốt lõi của MongoDB Cluster: **High Availability** (tự động phục hồi khi node chết) và **Data Replication** (dữ liệu được đồng bộ tự động giữa các node).

---

## 🏗️ Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────┐
│                  Docker Network: mongo-cluster               │
│                                                              │
│   ┌────────────┐     ┌────────────┐     ┌────────────┐       │
│   │   mongo1   │     │   mongo2   │     │   mongo3   │       │
│   │  PRIMARY   │◄───►│ SECONDARY  │◄───►│ SECONDARY  │       │
│   │  :27017    │     │  :27018    │     │  :27019    │       │
│   │ priority:3 │     │ priority:2 │     │ priority:1 │       │
│   └─────┬──────┘     └────────────┘     └────────────┘       │
│         │  Replica Set "rs0" — keyFile auth                  │
│         │                                                    │
│   ┌─────▼──────────────┐   ┌──────────────────────────┐      │
│   │   FastAPI App      │   │      Mongo Express       │      │
│   │      :8000         │   │         :8081            │      │
│   │  (CRUD + status)   │   │      (Web UI)            │      │
│   └────────────────────┘   └──────────────────────────┘      │
└──────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Các thành phần và vai trò

### 1. MongoDB Node 1, 2, 3 — Replica Set `rs0`

Ba container MongoDB tạo thành một **Replica Set** tên `rs0`. Đây là cơ chế nhân bản dữ liệu của MongoDB:

- **Primary** (mongo1, priority cao nhất): Node duy nhất nhận lệnh **ghi** (INSERT, UPDATE, DELETE). Mọi thay đổi được ghi vào **oplog** (operation log).
- **Secondary** (mongo2, mongo3): Liên tục đọc oplog từ Primary và **tự đồng bộ dữ liệu**. Có thể phục vụ lệnh **đọc** nếu cấu hình `readPreference`.

Cơ chế xác thực nội bộ giữa các node dùng **keyFile** — tất cả node dùng cùng một chuỗi bí mật `c29tZVJlcGxpY2FLZXlGb3JSUzAyMDI2` nên mới xác thực được với nhau.

### 2. `mongo-init` — Container khởi tạo

Chạy **một lần duy nhất** sau khi 3 node đã sẵn sàng, thực hiện 2 việc:

1. **`rs.initiate(...)`** — Khai báo cấu hình Replica Set: ai là thành viên, priority của từng node.
2. **`db.createUser(...)`** — Tạo user `appuser` trên database `appdb` cho ứng dụng FastAPI sử dụng.

### 3. FastAPI App — Ứng dụng demo

Kết nối tới cluster qua connection string có `replicaSet=rs0`, Motor (async MongoDB driver) sẽ tự động:
- Phát hiện node nào đang là Primary để ghi.
- Tự reconnect khi Primary thay đổi (failover).

### 4. Mongo Express — Giao diện Web

Dashboard trực quan để xem database, collection, document mà không cần dùng terminal.

---

## 🔁 Luồng hoạt động chi tiết

```
[Khởi động]
     │
     ├─► mongo1, mongo2, mongo3 khởi động độc lập
     │        (chưa biết nhau, chưa có Replica Set)
     │
     ├─► mongo-init chờ 30s rồi ping mongo1
     │
     ├─► rs.initiate() → 3 node "nhận ra nhau"
     │        → Bầu cử: mongo1 thắng (priority=3 cao nhất)
     │        → mongo1 = PRIMARY
     │        → mongo2, mongo3 = SECONDARY
     │
     └─► Replica Set sẵn sàng!

[Ghi dữ liệu]
  FastAPI ──► PRIMARY (mongo1) ──► ghi vào disk
                   │
                   └──► oplog ──► SECONDARY tự đồng bộ

[Failover]
  docker stop mongo1
        │
        ├─► mongo2 và mongo3 không nhận được heartbeat
        ├─► Sau ~10-30s: bầu cử mới → mongo2 lên PRIMARY
        └─► FastAPI tự reconnect → hệ thống tiếp tục hoạt động
```

---

## 🚀 Hướng dẫn chạy

### Bước 1 — Khởi động cluster

```bash
cd replica-set/
docker compose up -d

# Theo dõi quá trình init
docker logs -f mongo-init
```

Kết quả mong đợi:
```
⏳ Chờ MongoDB khởi động (30s)...
🔧 Kiểm tra kết nối mongo1...
🔧 Khởi tạo Replica Set...
⏳ Chờ bầu Primary (~12s)...
✅ Tạo app user...
🎉 Replica Set rs0 đã sẵn sàng!
```

### Bước 2 — Kiểm tra Replica Set qua Shell

```bash
docker exec -it mongo1 mongosh \
  -u admin -p secret123 \
  --authenticationDatabase admin
```

```js
rs.status()       // Xem trạng thái toàn bộ cluster
rs.conf()         // Xem cấu hình (priority, host...)
db.isMaster()     // Node hiện tại có phải Primary không?
```

### Bước 3 — Chạy FastAPI

```bash
cd app/
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Mở trình duyệt: **http://localhost:8000/docs**

---

## 🧪 Kịch bản Demo

### Demo 1: Xem trạng thái cluster
```bash
curl http://localhost:8000/
curl http://localhost:8000/cluster/status
```

### Demo 2: Ghi & đọc dữ liệu
```bash
# Tạo 20 sản phẩm mẫu
curl -X POST http://localhost:8000/products/seed/20

# Đọc danh sách
curl http://localhost:8000/products
```

### Demo 3: Failover (quan trọng nhất!)
```bash
# Bước 1: Xem Primary hiện tại
curl http://localhost:8000/cluster/status

# Bước 2: "Giết" Primary
docker stop mongo1

# Bước 3: Sau 10-30s, gọi lại → Secondary đã lên Primary
curl http://localhost:8000/cluster/status

# Bước 4: Khôi phục mongo1 (sẽ join lại thành Secondary)
docker start mongo1
```

> FastAPI **không cần restart** — Motor driver tự xử lý reconnect!

---

## 🌐 Các endpoint & URL

| Service | URL |
|---------|-----|
| FastAPI Swagger UI | http://localhost:8000/docs |
| Mongo Express (Web UI) | http://localhost:8081 |
| MongoDB Node 1 (Primary) | localhost:27017 |
| MongoDB Node 2 (Secondary) | localhost:27018 |
| MongoDB Node 3 (Secondary) | localhost:27019 |

### FastAPI Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/` | Trạng thái cluster |
| GET | `/cluster/status` | Chi tiết từng node |
| POST | `/products/seed/{n}` | Tạo n sản phẩm mẫu |
| GET | `/products` | Danh sách sản phẩm |
| POST | `/products` | Tạo sản phẩm |
| GET | `/products/{id}` | Chi tiết sản phẩm |
| PUT | `/products/{id}` | Cập nhật sản phẩm |
| DELETE | `/products/{id}` | Xóa sản phẩm |

---

## 🔑 Connection Strings

**Admin (full quyền):**
```
mongodb://admin:secret123@localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0&authSource=admin
```

**App user (readWrite trên appdb):**
```
mongodb://appuser:apppass123@localhost:27017,localhost:27018,localhost:27019/appdb?replicaSet=rs0&authSource=appdb
```

---

## 🛑 Dừng hệ thống

```bash
# Dừng và giữ data
docker compose down

# Dừng và XÓA toàn bộ data (reset hoàn toàn)
docker compose down -v
```# NT132.Q21.ANTN
