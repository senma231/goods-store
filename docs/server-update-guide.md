# 服务器更新部署指南

## 📋 本次更新内容

### 🎯 新增功能

1. **商品发货方式选择**
   - 自动发货：支付成功后自动从库存管理分配虚拟资产
   - 手动发货：需要管理员手动发货

2. **库存类型优化**
   - 有限库存：关联库存管理中的真实库存数量
   - 无限库存：前端显示为"9999+"

3. **库存显示优化**
   - 无限库存显示为绿色"9999+"
   - 有限库存低于10时显示为红色警告

### 🗄️ 数据库变更

- 添加 `delivery_method` 字段（auto/manual）
- 添加完整的库存管理字段
- 提供数据库迁移脚本

---

## 🚀 服务器更新步骤

### 步骤 1: 备份数据库（重要！）

```bash
# 进入项目目录
cd /var/www/goods-store

# 备份数据库
sudo cp backend/database.sqlite backend/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)

# 验证备份
ls -lh backend/database.sqlite*
```

### 步骤 2: 停止服务

```bash
# 停止后端服务
sudo systemctl stop goods-store

# 确认服务已停止
sudo systemctl status goods-store
```

### 步骤 3: 拉取最新代码

```bash
# 进入项目目录
cd /var/www/goods-store

# 拉取最新代码
sudo git fetch origin
sudo git pull origin main

# 查看更新内容
git log -3 --oneline
```

### 步骤 4: 运行数据库迁移

```bash
# 进入后端目录
cd /var/www/goods-store/backend

# 运行迁移脚本
node src/database/migrations/add-product-delivery-fields.js

# 应该看到类似输出：
# 开始迁移：添加商品发货方式和库存类型字段...
# ✅ 添加 delivery_method 字段
# ✅ 添加 stock_type 字段
# ✅ 添加 total_stock 字段
# ✅ 添加 available_stock 字段
# ✅ 添加 sold_count 字段
# ✅ 添加 is_featured 字段
# ✅ 添加 gallery_urls 字段
# ✅ 添加 video_url 字段
# ✅ 添加 meta_title 字段
# ✅ 添加 meta_description 字段
# ✅ 添加 view_count 字段
# ✅ 迁移现有库存数据
# ✅ 迁移完成！
```

### 步骤 5: 重新构建前端

```bash
# 进入前端目录
cd /var/www/goods-store/virtual-goods-store

# 安装依赖（如果有新依赖）
sudo pnpm install

# 构建前端
sudo pnpm run build

# 应该看到类似输出：
# vite v5.x.x building for production...
# ✓ xxxx modules transformed.
# dist/index.html                   x.xx kB
# dist/assets/index-xxxxx.js        xxx.xx kB
# ✓ built in xxxs
```

### 步骤 6: 启动服务

```bash
# 启动后端服务
sudo systemctl start goods-store

# 查看服务状态
sudo systemctl status goods-store

# 应该看到：
# ● goods-store.service - Virtual Goods Store Backend
#    Loaded: loaded (/etc/systemd/system/goods-store.service; enabled)
#    Active: active (running) since ...
```

### 步骤 7: 验证更新

```bash
# 查看实时日志
sudo journalctl -u goods-store -f

# 应该看到：
# [INFO] 服务器运行在端口 8787
# [INFO] 数据库连接成功

# 测试 API
curl http://localhost:8787/api/health

# 应该返回：
# {"status":"ok","timestamp":"..."}
```

---

## ✅ 验证清单

### 1. 后端验证

```bash
# 检查服务状态
sudo systemctl status goods-store

# 检查日志是否有错误
sudo journalctl -u goods-store -n 50 --no-pager

# 测试 API
curl http://localhost:8787/api/products | jq '.' | head -20
```

### 2. 前端验证

访问以下页面确认功能正常：

- [ ] 首页：http://your-domain.com
- [ ] 商品详情页：检查库存显示是否为"9999+"
- [ ] 管理后台：http://your-domain.com/admin
- [ ] 商品管理：检查是否有"发货方式"选项
- [ ] 商品管理：检查库存类型说明

### 3. 数据库验证

```bash
# 进入数据库
cd /var/www/goods-store/backend
sqlite3 database.sqlite

# 检查新字段
.schema products

# 应该看到 delivery_method, stock_type 等新字段

# 退出数据库
.quit
```

---

## 🔧 常见问题

### 问题 1: 迁移脚本报错

**错误**：`Error: SQLITE_ERROR: duplicate column name`

**原因**：字段已经存在

**解决**：这是正常的，说明字段已经添加过了，可以忽略

---

### 问题 2: 前端构建失败

**错误**：`pnpm: command not found`

**解决**：
```bash
# 安装 pnpm
sudo npm install -g pnpm

# 重新构建
cd /var/www/goods-store/virtual-goods-store
sudo pnpm install
sudo pnpm run build
```

---

### 问题 3: 服务启动失败

**错误**：`code=exited, status=1/FAILURE`

**解决**：
```bash
# 查看详细错误日志
sudo journalctl -u goods-store -n 100 --no-pager

# 检查端口占用
sudo lsof -i :8787

# 手动测试启动
cd /var/www/goods-store/backend
node src/server.js
```

---

## 🔄 回滚步骤（如果需要）

如果更新后出现问题，可以回滚：

```bash
# 停止服务
sudo systemctl stop goods-store

# 恢复数据库备份
cd /var/www/goods-store
sudo cp backend/database.sqlite.backup.YYYYMMDD_HHMMSS backend/database.sqlite

# 回滚代码
sudo git reset --hard HEAD~3

# 重新构建前端
cd virtual-goods-store
sudo pnpm run build

# 启动服务
sudo systemctl start goods-store
```

---

## 📞 需要帮助？

如果遇到问题，请提供以下信息：

1. 错误日志：`sudo journalctl -u goods-store -n 100 --no-pager`
2. 服务状态：`sudo systemctl status goods-store`
3. 数据库状态：`ls -lh /var/www/goods-store/backend/database.sqlite*`

---

**更新完成后，您的商城将支持灵活的发货方式和智能的库存管理！**

