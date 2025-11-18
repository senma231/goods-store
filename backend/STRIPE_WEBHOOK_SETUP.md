# Stripe Webhook 配置指南

## 📋 概述

Stripe Webhook 需要一个**公网可访问的 URL**。但在开发环境中，我们有两种解决方案：

---

## 🛠️ 开发环境配置（本地测试）

### 方法一：使用 Stripe CLI（推荐）⭐

Stripe CLI 可以将 Stripe 的 Webhook 事件转发到您的本地服务器。

#### 1. 安装 Stripe CLI

**Windows:**
```bash
# 使用 Scoop
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe

# 或下载安装包
# https://github.com/stripe/stripe-cli/releases/latest
```

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# 下载并安装
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

#### 2. 登录 Stripe

```bash
stripe login
```

这会打开浏览器，让您授权 CLI 访问您的 Stripe 账户。

#### 3. 启动 Webhook 转发

```bash
stripe listen --forward-to localhost:8787/api/payments/stripe/webhook
```

**输出示例：**
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

**重要：** 复制这个 `whsec_xxxxxxxxxxxxx`，这是您的 Webhook Secret！

#### 4. 配置 Webhook Secret

在网站设置中添加（通过管理后台或数据库）：

**方式一：通过数据库**
```sql
INSERT INTO site_settings (setting_key, setting_value)
VALUES ('stripe_webhook_secret', 'whsec_xxxxxxxxxxxxx')
ON CONFLICT(setting_key) DO UPDATE SET setting_value = 'whsec_xxxxxxxxxxxxx';
```

**方式二：通过环境变量**
在 `backend/.env` 文件中添加：
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

#### 5. 测试 Webhook

在另一个终端中触发测试事件：
```bash
stripe trigger payment_intent.succeeded
```

您应该在后端控制台看到：
```
✅ Stripe Webhook: 订单 xxx 支付成功
✅ Stripe Webhook: 订单 xxx 自动发货成功
```

---

### 方法二：使用 ngrok 或类似工具

如果您想测试真实的 Stripe Webhook（不使用 CLI），可以使用 ngrok 将本地服务器暴露到公网。

#### 1. 安装 ngrok

```bash
# Windows (使用 Chocolatey)
choco install ngrok

# macOS
brew install ngrok

# 或下载：https://ngrok.com/download
```

#### 2. 启动 ngrok

```bash
ngrok http 8787
```

**输出示例：**
```
Forwarding  https://abc123.ngrok.io -> http://localhost:8787
```

#### 3. 在 Stripe Dashboard 配置 Webhook

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com)
2. 进入 **Developers → Webhooks**
3. 点击 **Add endpoint**
4. 输入端点 URL：`https://abc123.ngrok.io/api/payments/stripe/webhook`
5. 选择事件：`payment_intent.succeeded`
6. 点击 **Add endpoint**
7. 复制 **Signing secret**（格式：`whsec_xxxxx`）

#### 4. 配置 Webhook Secret

同方法一的步骤 4。

---

## 🚀 生产环境配置

### 前提条件

- ✅ 已部署的服务器（有公网 IP 或域名）
- ✅ HTTPS 证书（Stripe 要求 HTTPS）

### 配置步骤

#### 1. 确保后端可公网访问

您的后端 API 应该部署在：
- `https://api.yourdomain.com/api/payments/stripe/webhook`
- 或 `https://yourdomain.com/api/payments/stripe/webhook`

#### 2. 在 Stripe Dashboard 添加 Webhook

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com)
2. 进入 **Developers → Webhooks**
3. 点击 **Add endpoint**
4. 输入端点 URL：`https://yourdomain.com/api/payments/stripe/webhook`
5. 选择事件：
   - `payment_intent.succeeded` ✅
   - `payment_intent.payment_failed`（可选）
   - `charge.refunded`（可选）
6. 点击 **Add endpoint**
7. 复制 **Signing secret**

#### 3. 配置到生产环境

**方式一：环境变量（推荐）**
```bash
export STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**方式二：数据库**
```sql
INSERT INTO site_settings (setting_key, setting_value)
VALUES ('stripe_webhook_secret', 'whsec_xxxxxxxxxxxxx');
```

#### 4. 测试 Webhook

在 Stripe Dashboard 的 Webhook 页面：
1. 点击您刚创建的 Webhook
2. 点击 **Send test webhook**
3. 选择 `payment_intent.succeeded`
4. 点击 **Send test webhook**

检查您的服务器日志，应该看到 Webhook 被成功处理。

---

## 🔍 验证 Webhook 是否工作

### 检查清单

- [ ] Webhook Secret 已正确配置
- [ ] 后端服务器正在运行
- [ ] Webhook 端点可访问（开发环境：通过 Stripe CLI 或 ngrok；生产环境：通过 HTTPS）
- [ ] 数据库中有虚拟商品库存
- [ ] 订单状态正确（pending → paid → completed）

### 测试步骤

1. **创建测试订单**
2. **使用 Stripe 测试卡支付**：`4242 4242 4242 4242`
3. **检查后端日志**：
   ```
   ✅ Stripe Webhook: 订单 xxx 支付成功
   开始处理订单发货: xxx
   ✅ 已分配虚拟资产: CODE-123 给订单 xxx
   ✅ 订单 xxx 发货完成，共发货 1 个商品
   ```
4. **查询订单**：订单状态应该是 `completed`
5. **查看发货记录**：
   ```sql
   SELECT * FROM deliveries WHERE order_id = '订单ID';
   ```

---

## ⚠️ 常见问题

### Q1: Webhook 没有触发？

**检查：**
1. Webhook Secret 是否正确配置
2. 后端服务器是否运行
3. Stripe CLI 是否在运行（开发环境）
4. ngrok 是否在运行（如果使用）
5. 防火墙是否阻止了请求

**解决：**
```bash
# 查看 Stripe CLI 日志
stripe listen --forward-to localhost:8787/api/payments/stripe/webhook --log-level debug
```

### Q2: Webhook 返回 401 或 403 错误？

**原因：** Webhook Secret 不匹配

**解决：**
1. 确认 Webhook Secret 正确
2. 重启后端服务器
3. 检查环境变量或数据库配置

### Q3: 开发环境下每次都要运行 Stripe CLI？

**是的**，但您也可以：
1. 使用手动确认 API（`/api/payments/confirm-payment`）
2. 或者使用 ngrok（但 URL 每次重启会变）

---

## 📝 推荐配置

### 开发环境
```bash
# Terminal 1: 启动后端
cd backend
npm start

# Terminal 2: 启动前端
cd virtual-goods-store
pnpm dev

# Terminal 3: 启动 Stripe CLI
stripe listen --forward-to localhost:8787/api/payments/stripe/webhook
```

### 生产环境
- 使用真实域名 + HTTPS
- 在 Stripe Dashboard 配置 Webhook
- 使用环境变量存储 Webhook Secret
- 启用日志监控

---

## 🎯 总结

| 环境 | 需要域名？ | 推荐方案 |
|------|-----------|---------|
| 开发 | ❌ 不需要 | Stripe CLI |
| 测试 | ⚠️ 可选 | ngrok |
| 生产 | ✅ 需要 | 真实域名 + HTTPS |

**最简单的开发流程：**
1. 安装 Stripe CLI
2. 运行 `stripe listen --forward-to localhost:8787/api/payments/stripe/webhook`
3. 复制 Webhook Secret 到配置
4. 开始测试！

