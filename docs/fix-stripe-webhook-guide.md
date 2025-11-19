# Stripe Webhook 修复指南

## 🐛 问题描述

Stripe Webhook 返回 405 错误（Method Not Allowed），导致支付成功后订单状态无法自动更新。

**错误原因**：
- `express.json()` 中间件会解析所有请求体
- Stripe Webhook 需要原始的 raw body 来验证签名
- 中间件顺序错误导致 Webhook 验证失败

---

## ✅ 解决方案

已修复代码并推送到 GitHub。需要在服务器上更新代码并重启服务。

---

## 🚀 服务器更新步骤

### 步骤 1: 拉取最新代码

```bash
cd /var/www/goods-store
sudo git pull origin main
```

### 步骤 2: 重启服务

```bash
sudo systemctl restart goods-store
```

### 步骤 3: 验证服务状态

```bash
# 查看服务状态
sudo systemctl status goods-store

# 查看日志
sudo journalctl -u goods-store -n 50
```

---

## 🧪 测试 Webhook

### 方法 1: 使用 Stripe CLI（推荐）

```bash
# 安装 Stripe CLI（如果还没安装）
# 参考：https://stripe.com/docs/stripe-cli

# 登录 Stripe
stripe login

# 转发 Webhook 到本地服务器
stripe listen --forward-to https://shop.senma.io/api/payments/stripe/webhook

# 触发测试事件
stripe trigger payment_intent.succeeded
```

### 方法 2: 在 Stripe Dashboard 测试

1. 登录 Stripe Dashboard
2. 进入 **Developers** → **Webhooks**
3. 找到您的 Webhook 端点
4. 点击 **Send test webhook**
5. 选择 `payment_intent.succeeded` 事件
6. 点击 **Send test webhook**

### 方法 3: 实际支付测试

1. 访问商城前端
2. 添加商品到购物车
3. 选择 Stripe 支付
4. 使用测试卡号：`4242 4242 4242 4242`
5. 过期日期：任意未来日期
6. CVC：任意 3 位数字
7. 完成支付
8. 检查订单状态是否自动更新为"已支付"

---

## 📋 验证清单

### 1. 检查 Webhook 端点配置

在 Stripe Dashboard 中确认 Webhook URL：
```
https://shop.senma.io/api/payments/stripe/webhook
```

### 2. 检查 Webhook 签名密钥

```bash
# 在服务器上检查环境变量
cd /var/www/goods-store/backend
cat .env | grep STRIPE_WEBHOOK_SECRET
```

或在管理后台检查：
- 登录管理后台
- 进入"支付管理"
- 查看 Stripe 配置中的 Webhook Secret

### 3. 检查服务器日志

```bash
# 实时查看日志
sudo journalctl -u goods-store -f

# 然后触发一个测试 Webhook
# 应该看到类似这样的日志：
# ✅ Stripe Webhook: 订单 xxx 支付成功
# ✅ Stripe Webhook: 订单 xxx 自动发货成功
```

### 4. 检查订单状态

支付成功后，订单应该：
- ✅ `payment_status` = `paid`
- ✅ `order_status` = `processing` 或 `completed`
- ✅ 如果是自动发货商品，应该已经发货

---

## 🔍 常见问题

### 问题 1: Webhook 仍然返回 405

**可能原因**：
- 代码没有更新
- 服务没有重启

**解决方案**：
```bash
cd /var/www/goods-store
sudo git pull origin main
sudo systemctl restart goods-store
sudo systemctl status goods-store
```

### 问题 2: Webhook 返回 400 (签名验证失败)

**可能原因**：
- Webhook Secret 配置错误
- Stripe Dashboard 中的 Webhook Secret 与服务器配置不匹配

**解决方案**：
1. 在 Stripe Dashboard 中查看 Webhook 的 Signing Secret
2. 更新服务器配置：
   ```bash
   cd /var/www/goods-store/backend
   sudo nano .env
   # 更新 STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   sudo systemctl restart goods-store
   ```

### 问题 3: 订单状态没有更新

**可能原因**：
- Webhook 没有正确处理
- 数据库更新失败

**解决方案**：
```bash
# 查看详细日志
sudo journalctl -u goods-store -n 100 | grep -i "webhook\|stripe"

# 检查数据库
cd /var/www/goods-store/backend/data
sqlite3 database.db
SELECT * FROM orders WHERE id = 'order_id';
.quit
```

---

## 📊 Webhook 工作流程

```
1. 用户完成 Stripe 支付
   ↓
2. Stripe 发送 payment_intent.succeeded 事件到 Webhook
   ↓
3. 服务器验证 Webhook 签名
   ↓
4. 更新订单状态为"已支付"
   ↓
5. 发送支付成功通知（邮件/Feishu/Telegram）
   ↓
6. 自动发货（如果是自动发货商品）
   ↓
7. 返回 200 响应给 Stripe
```

---

## 🎯 修复内容

### 修改的文件

1. **backend/src/server.js**
   - 在 `express.json()` 之前为 Webhook 路由配置 `express.raw()`
   - 确保 Stripe 能接收原始 body 进行签名验证

2. **backend/src/routes/payments.js**
   - 移除重复的 `express.raw()` 中间件
   - 添加注释说明中间件配置位置

---

## ✅ 更新完成后

1. **测试 Webhook**：使用 Stripe CLI 或 Dashboard 发送测试事件
2. **实际支付测试**：使用测试卡完成一次完整的支付流程
3. **检查日志**：确认没有错误信息
4. **验证订单**：确认订单状态正确更新

---

**需要帮助？** 查看日志并提供错误信息！

