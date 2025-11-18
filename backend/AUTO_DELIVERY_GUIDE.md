# 虚拟商品自动发货系统使用指南

## 📋 功能概述

本系统已实现完整的虚拟商品自动发货功能：

1. ✅ **虚拟商品库存管理** - 支持添加、查询、删除虚拟资产（激活码、卡密等）
2. ✅ **自动发货** - 支付成功后自动分配虚拟商品并创建发货记录
3. ✅ **Stripe Webhook 集成** - Stripe 支付成功后自动触发发货
4. ✅ **手动发货** - 支持管理员手动触发发货
5. ✅ **发货记录** - 完整的发货历史记录

---

## 🗄️ 数据库表结构

### virtual_assets（虚拟资产表）
存储虚拟商品的激活码、卡密等资产

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| product_id | TEXT | 商品ID |
| asset_type | TEXT | 资产类型：code/file/link/text |
| asset_value | TEXT | 资产值（激活码、下载链接等） |
| status | TEXT | 状态：available/sold/reserved |
| order_id | TEXT | 关联订单ID（已售出时） |
| sold_at | DATETIME | 售出时间 |

### deliveries（发货记录表）
记录每次发货的详细信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT | 主键 |
| order_id | TEXT | 订单ID |
| product_id | TEXT | 商品ID |
| virtual_asset_id | TEXT | 虚拟资产ID |
| delivery_email | TEXT | 发货邮箱 |
| content_data | TEXT | 发货内容（JSON） |
| status | TEXT | 状态：pending/sent/failed |
| sent_at | DATETIME | 发货时间 |

---

## 🚀 快速开始

### 1. 添加虚拟商品库存

#### 方法一：使用测试脚本（推荐用于测试）
```bash
cd backend
node add-test-assets.js
```

#### 方法二：使用 API（推荐用于生产环境）
```bash
# 批量添加激活码
curl -X POST http://localhost:8787/api/virtual-assets/batch \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "商品ID",
    "asset_type": "code",
    "asset_values": ["CODE1", "CODE2", "CODE3"]
  }'
```

### 2. 测试自动发货

#### 方法一：使用测试脚本
```bash
cd backend
node test-delivery.js
```

#### 方法二：完整支付流程测试
1. 前端创建订单
2. 使用 Stripe 测试卡号完成支付：`4242 4242 4242 4242`
3. 系统自动：
   - 更新订单状态为已支付
   - 分配虚拟资产
   - 创建发货记录
   - 更新订单状态为已完成

---

## 📡 API 接口

### 虚拟资产管理

#### 获取商品的虚拟资产列表
```
GET /api/virtual-assets/product/:productId?status=available
```

#### 批量添加虚拟资产
```
POST /api/virtual-assets/batch
Body: {
  "product_id": "商品ID",
  "asset_type": "code",
  "asset_values": ["CODE1", "CODE2"]
}
```

#### 添加单个虚拟资产
```
POST /api/virtual-assets
Body: {
  "product_id": "商品ID",
  "asset_type": "code",
  "asset_value": "ACTIVATION-CODE-123"
}
```

#### 删除虚拟资产
```
DELETE /api/virtual-assets/:id
```

#### 获取库存统计
```
GET /api/virtual-assets/stats/:productId
Response: {
  "stats": {
    "total": 100,
    "available": 85,
    "sold": 15,
    "reserved": 0
  }
}
```

---

## 🔄 自动发货流程

### 流程图
```
订单创建 → 支付成功 → Webhook/手动确认 → 自动发货 → 订单完成
                ↓
          更新支付状态
                ↓
          查找可用虚拟资产
                ↓
          标记资产为已售出
                ↓
          创建发货记录
                ↓
          更新订单状态为已完成
```

### 触发方式

1. **Stripe Webhook（推荐）**
   - Stripe 支付成功后自动触发
   - 需要配置 Webhook Secret

2. **手动确认支付**
   - 前端调用 `/api/payments/confirm-payment`
   - 适用于开发环境或 Webhook 不可用时

---

## ⚙️ Stripe Webhook 配置

### 1. 获取 Webhook Secret
1. 登录 Stripe Dashboard
2. 进入 Developers → Webhooks
3. 添加端点：`https://your-domain.com/api/payments/stripe/webhook`
4. 选择事件：`payment_intent.succeeded`
5. 复制 Webhook Secret

### 2. 配置到系统
在网站设置中添加：
- Key: `stripe_webhook_secret`
- Value: `whsec_xxxxx`

或在 `.env` 文件中：
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

## 🧪 测试

### 测试已有订单发货
```bash
node test-delivery.js
```

### 测试完整流程
1. 添加虚拟商品库存
2. 创建订单
3. 完成支付
4. 查看发货记录

---

## 📊 监控和日志

系统会在控制台输出详细日志：

```
✅ 订单 xxx 支付确认成功
开始处理订单发货: xxx
✅ 已分配虚拟资产: CODE-123 给订单 xxx
✅ 订单 xxx 发货完成，共发货 1 个商品
```

---

## ⚠️ 注意事项

1. **库存不足处理**
   - 如果虚拟资产库存不足，发货会跳过该商品
   - 建议设置库存预警

2. **重复发货防护**
   - 系统会检查订单是否已发货
   - 已发货的订单不会重复发货

3. **发货失败处理**
   - 发货失败会记录到 deliveries 表
   - status 为 'failed'
   - 可以手动重试

---

## 🔧 故障排查

### 问题：支付成功但未自动发货

**可能原因：**
1. Webhook 未配置或配置错误
2. 虚拟资产库存不足
3. 订单状态未更新为已支付

**解决方案：**
1. 检查 Webhook Secret 配置
2. 查看后端日志
3. 手动运行 `node test-delivery.js` 测试

### 问题：库存显示不准确

**解决方案：**
```sql
-- 查询库存统计
SELECT 
  p.name,
  COUNT(va.id) as total,
  SUM(CASE WHEN va.status = 'available' THEN 1 ELSE 0 END) as available
FROM products p
LEFT JOIN virtual_assets va ON p.id = va.product_id
GROUP BY p.id, p.name;
```

---

## 📝 下一步计划

- [ ] 前端虚拟资产管理界面
- [ ] 邮件发送虚拟商品
- [ ] 库存预警功能
- [ ] 批量导入虚拟资产
- [ ] 发货失败重试机制

