# 快速更新命令

## 🚀 方法 1: 使用更新脚本（推荐）

```bash
# 进入项目目录
cd /var/www/goods-store

# 拉取最新代码（包含修复后的脚本）
sudo git pull origin main

# 运行更新脚本
sudo bash scripts/server-update.sh
```

---

## 🔧 方法 2: 手动更新（逐步执行）

如果脚本仍有问题，请按以下步骤手动更新：

### 第一步：查找数据库位置

```bash
cd /var/www/goods-store

# 查找数据库文件
find . -name "database.sqlite" -type f

# 可能的位置：
# ./backend/database.sqlite
# ./backend/data/database.sqlite
# ./database.sqlite
```

### 第二步：备份数据库

```bash
# 根据上一步找到的路径，替换下面的路径
sudo cp backend/database.sqlite backend/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)

# 或者如果在 backend/data/ 目录
# sudo cp backend/data/database.sqlite backend/data/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)
```

### 第三步：停止服务

```bash
sudo systemctl stop goods-store
```

### 第四步：拉取最新代码

```bash
cd /var/www/goods-store
sudo git pull origin main
```

### 第五步：运行数据库迁移

```bash
cd /var/www/goods-store/backend

# 运行迁移脚本
node src/database/migrations/add-product-delivery-fields.js

# 如果提示字段已存在，这是正常的，说明已经迁移过了
```

### 第六步：重新构建前端

```bash
cd /var/www/goods-store/virtual-goods-store

# 安装依赖
sudo pnpm install

# 构建前端
sudo pnpm run build
```

### 第七步：启动服务

```bash
sudo systemctl start goods-store
```

### 第八步：验证更新

```bash
# 查看服务状态
sudo systemctl status goods-store

# 查看日志
sudo journalctl -u goods-store -n 50

# 测试 API
curl http://localhost:8787/api/health
```

---

## 📋 一键复制命令（适合熟练用户）

```bash
# 完整的更新命令（一次性执行）
cd /var/www/goods-store && \
sudo systemctl stop goods-store && \
sudo git pull origin main && \
cd backend && node src/database/migrations/add-product-delivery-fields.js && cd .. && \
cd virtual-goods-store && sudo pnpm install && sudo pnpm run build && cd .. && \
sudo systemctl start goods-store && \
sleep 3 && \
sudo systemctl status goods-store
```

---

## ⚠️ 常见问题

### 问题 1: 找不到数据库文件

**解决方案**：
```bash
# 在项目根目录搜索
cd /var/www/goods-store
find . -name "*.sqlite" -type f

# 查看 .env 文件中的配置
cat backend/.env | grep DATABASE
```

### 问题 2: pnpm 命令不存在

**解决方案**：
```bash
# 安装 pnpm
sudo npm install -g pnpm

# 验证安装
pnpm --version
```

### 问题 3: 迁移脚本报错 "duplicate column"

**这是正常的！** 说明字段已经存在，可以忽略此错误。

### 问题 4: 服务启动失败

**解决方案**：
```bash
# 查看详细日志
sudo journalctl -u goods-store -n 100 --no-pager

# 手动测试启动
cd /var/www/goods-store/backend
node src/server.js

# 检查端口占用
sudo lsof -i :8787
```

---

## 🔍 验证更新是否成功

### 1. 检查后端

```bash
# 服务状态
sudo systemctl status goods-store

# 应该看到：Active: active (running)

# API 测试
curl http://localhost:8787/api/products | jq '.[0]' | head -20

# 应该能看到 delivery_method 字段
```

### 2. 检查数据库

```bash
cd /var/www/goods-store/backend

# 进入数据库（根据实际路径调整）
sqlite3 database.sqlite

# 或者
sqlite3 data/database.sqlite

# 查看 products 表结构
.schema products

# 应该看到以下新字段：
# delivery_method TEXT DEFAULT 'auto'
# stock_type TEXT DEFAULT 'limited'
# total_stock INTEGER DEFAULT 0
# available_stock INTEGER DEFAULT 0
# sold_count INTEGER DEFAULT 0

# 退出数据库
.quit
```

### 3. 检查前端

访问以下页面：
- 管理后台：http://your-domain.com/admin
- 商品管理 -> 新增/编辑商品
- 检查是否有"发货方式"选项

---

## 📞 需要帮助？

如果更新过程中遇到问题，请提供：

1. **数据库位置**：
   ```bash
   find /var/www/goods-store -name "*.sqlite" -type f
   ```

2. **服务日志**：
   ```bash
   sudo journalctl -u goods-store -n 100 --no-pager
   ```

3. **错误信息**：完整的错误输出

---

**更新完成后，您的商城将支持灵活的发货方式和智能的库存管理！**

