# Đồ án NT132.Q21.ANTN: MongoDB Cluster

## Giới thiệu

Đây là đồ án môn học **NT132.Q21.ANTN** với chủ đề xây dựng và vận hành **MongoDB Cluster**. Đồ án tập trung triển khai mô hình cơ sở dữ liệu phân tán bằng MongoDB, kết hợp các thành phần **Replica Set**, **Sharding**, **Config Server** và **Mongos Router**.

Mục tiêu chính là mô phỏng một hệ thống MongoDB có khả năng mở rộng dữ liệu theo chiều ngang, đảm bảo tính sẵn sàng cao và cho phép ứng dụng truy cập dữ liệu thông qua một router thống nhất.

## Nội dung thư mục `FINAL`

Thư mục `FINAL` chứa phần triển khai hoàn chỉnh của đồ án:

- `FINAL/README.md`: hướng dẫn thiết lập MongoDB sharded cluster trên nhiều node.
- `FINAL/script.md`: ghi chú/script triển khai cuối cùng.
- `FINAL/mowndark`: ứng dụng demo chạy bằng Docker Compose, gồm frontend, backend, Ollama vector search và MongoDB sharded cluster.
- `FINAL/mowndark-local`: phiên bản chạy local, kết nối tới `mongos` router có sẵn.

## Kiến trúc hệ thống

Hệ thống MongoDB Cluster được xây dựng theo mô hình sharding:

- **Shard 1**: Replica Set `shard1rs`.
- **Shard 2**: Replica Set `shard2rs`.
- **Shard 3**: Replica Set `shard3rs`.
- **Config Server Replica Set**: lưu metadata của toàn bộ sharded cluster.
- **Mongos Router**: router trung gian tiếp nhận truy vấn từ ứng dụng và điều phối tới các shard phù hợp.
- **Ứng dụng demo Mowndark**: minh họa việc kết nối, ghi, đọc và tìm kiếm dữ liệu trên MongoDB cluster.

```text
Client / Application
        |
        v
   Mongos Router
        |
        +---------------- Config Server Replica Set
        |
        +--------+--------+--------+
                 |        |        |
              Shard 1  Shard 2  Shard 3
              RS       RS       RS
```

## Vai trò các thành phần

### Replica Set

Mỗi shard được triển khai dưới dạng một replica set gồm nhiều `mongod` instance. Replica set giúp dữ liệu được nhân bản giữa các node, tăng tính sẵn sàng và hỗ trợ tự động bầu chọn primary khi node chính gặp sự cố.

### Sharding

Sharding chia dữ liệu thành nhiều phần và phân tán trên các shard khác nhau. Cơ chế này giúp hệ thống xử lý dữ liệu lớn tốt hơn, giảm tải cho từng node riêng lẻ và hỗ trợ mở rộng theo chiều ngang.

### Config Server

Config server lưu thông tin metadata của cluster như danh sách shard, chunk, phân vùng dữ liệu và trạng thái cân bằng dữ liệu. Đây là thành phần bắt buộc trong MongoDB sharded cluster.

### Mongos Router

`mongos` là điểm truy cập chính của ứng dụng. Ứng dụng không cần kết nối trực tiếp tới từng shard mà chỉ cần kết nối tới `mongos`; router sẽ tự xác định shard cần truy vấn dựa trên metadata từ config server.

## Workflow triển khai

Quy trình triển khai MongoDB Cluster trong đồ án gồm các bước chính:

1. **Chuẩn bị keyfile dùng chung**
   - Tạo keyfile để các node MongoDB xác thực nội bộ với nhau.
   - Sao chép keyfile sang các máy/node trong cluster.

2. **Khởi tạo các shard replica set**
   - Tạo thư mục dữ liệu và log cho từng node.
   - Tạo file cấu hình cho từng `mongod`.
   - Khởi động các `mongod` với vai trò `shardsvr`.
   - Chạy `rs.initiate()` để tạo replica set cho từng shard.

3. **Khởi tạo config server replica set**
   - Tạo các node config server.
   - Cấu hình `clusterRole: configsvr`.
   - Chạy `rs.initiate()` với tùy chọn `configsvr: true`.

4. **Khởi động mongos router**
   - Cấu hình `mongos` trỏ tới config server replica set.
   - Khởi động router tại cổng `27017`.

5. **Thêm shard vào cluster**
   - Kết nối vào `mongos` bằng `mongosh`.
   - Thêm các shard bằng lệnh `sh.addShard(...)`.

6. **Tạo tài khoản quản trị**
   - Tạo user admin trên database `admin`.
   - Kết nối lại cluster với cơ chế xác thực.

7. **Kết nối ứng dụng demo**
   - Ứng dụng kết nối tới `mongos` router.
   - Tất cả thao tác đọc/ghi được định tuyến qua MongoDB Cluster.

## Luồng hoạt động

### Luồng ghi dữ liệu

```text
Application
    |
    v
Mongos Router
    |
    v
Xác định shard phù hợp
    |
    v
Primary node của shard nhận ghi
    |
    v
Secondary nodes đồng bộ dữ liệu qua replica set
```

Khi ứng dụng ghi dữ liệu, `mongos` sẽ dựa trên metadata và shard key để chuyển request đến shard phù hợp. Trong shard đó, primary node xử lý thao tác ghi, sau đó dữ liệu được đồng bộ sang các secondary node.

### Luồng đọc dữ liệu

```text
Application
    |
    v
Mongos Router
    |
    v
Truy vấn metadata từ Config Server
    |
    v
Định tuyến truy vấn tới một hoặc nhiều shard
    |
    v
Trả kết quả về ứng dụng
```

Với truy vấn đọc, `mongos` xác định dữ liệu nằm ở shard nào. Nếu truy vấn liên quan nhiều shard, `mongos` tổng hợp kết quả từ các shard rồi trả về cho ứng dụng.

### Luồng cân bằng dữ liệu

MongoDB sử dụng balancer để phân phối dữ liệu giữa các shard. Khi một shard chứa quá nhiều dữ liệu, cluster có thể di chuyển các chunk sang shard khác để cân bằng tải.

## Ứng dụng demo Mowndark

Ứng dụng demo trong thư mục `FINAL/mowndark` gồm:

- **Frontend**: giao diện người dùng bằng Next.js.
- **Backend**: API server bằng Flask.
- **MongoDB Cluster**: nơi lưu trữ dữ liệu chính.
- **Ollama vector search**: hỗ trợ tìm kiếm ngữ nghĩa/vector search.

Ứng dụng cho thấy cách một hệ thống thực tế có thể kết nối tới MongoDB Cluster thông qua `mongos` thay vì kết nối trực tiếp từng shard.

## Cách chạy

### Chạy bản Docker Compose

```bash
cd FINAL/mowndark
./run.sh
```

Các service chính:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`
- Mongos Router: `mongodb://127.0.0.1:27017`
- Ollama: `http://127.0.0.1:11434`

Dừng hệ thống:

```bash
./down.sh
```

### Chạy bản local

Bản local dùng khi đã có `mongos` router chạy sẵn.

```bash
cd FINAL/mowndark-local
./run.sh
```

Dừng hệ thống:

```bash
./down.sh
```

## Kịch bản demo

Một số kịch bản có thể dùng để trình bày đồ án:

1. **Kiểm tra trạng thái cluster**
   - Kết nối vào `mongos` bằng `mongosh`.
   - Kiểm tra danh sách shard bằng `sh.status()`.

2. **Thêm shard vào cluster**
   - Khởi tạo replica set mới.
   - Thêm shard bằng `sh.addShard(...)`.
   - Quan sát shard mới xuất hiện trong cluster.

3. **Kiểm tra replica set**
   - Dùng `rs.status()` để xem primary và secondary.
   - Dừng một node để quan sát cơ chế bầu chọn lại primary.

4. **Kiểm tra balancer**
   - Bật/tắt balancer bằng `sh.startBalancer()` và `sh.stopBalancer()`.
   - Quan sát quá trình phân phối dữ liệu giữa các shard.

5. **Kết nối ứng dụng demo**
   - Chạy Mowndark.
   - Thực hiện thao tác thêm, đọc và tìm kiếm dữ liệu.
   - Xác nhận dữ liệu được lưu qua MongoDB Cluster.

## Công nghệ sử dụng

- MongoDB
- MongoDB Replica Set
- MongoDB Sharding
- Mongos Router
- Docker / Docker Compose
- Next.js
- Flask
- Ollama

## Kết luận

Đồ án giúp nắm được cách MongoDB hoạt động trong môi trường phân tán, đặc biệt là cơ chế replica set, sharding, config server và `mongos` router. Thông qua ứng dụng demo, đồ án minh họa được cách một hệ thống thực tế sử dụng MongoDB Cluster để lưu trữ, mở rộng và truy vấn dữ liệu hiệu quả hơn.
