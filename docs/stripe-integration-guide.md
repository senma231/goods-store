# Stripe支付集成指南

## 当前状态

⚠️ **重要提示**：系统当前运行在**演示模式**下，无法处理真实交易。

### 演示模式说明

当Stripe API密钥未配置或无效时，系统会自动进入演示模式：
- 跳过真实Stripe API调用
- 生成模拟的Payment Intent ID（格式：`pi_demo_*`）
- 自动模拟支付成功
- 仅用于功能演示和UI测试

**演示模式限制**：
- ❌ 无法处理真实信用卡交易
- ❌ 无法收取实际款项
- ❌ 无法验证真实卡号
- ❌ 不适用于生产环境

## 配置真实Stripe集成

### 步骤1：获取Stripe API密钥

#### 测试环境（推荐用于开发）

1. 访问 Stripe Dashboard：https://dashboard.stripe.com/test/apikeys
2. 确保处于"测试模式"（Test mode）
3. 复制以下密钥：
   - **Secret key**：格式为 `sk_test_...`（后端使用）
   - **Publishable key**：格式为 `pk_test_...`（前端使用）

**测试卡号**：
- 成功支付：`4242 4242 4242 4242`
- CVV：任意3位数字
- 过期日期：任意未来日期

#### 生产环境（正式上线使用）

1. 访问 Stripe Dashboard：https://dashboard.stripe.com/apikeys
2. 切换到"生产模式"（Live mode）
3. 复制生产环境密钥（格式：`sk_live_...` 和 `pk_live_...`）

### 步骤2：配置Supabase Edge Functions

#### 方法A：通过Supabase Dashboard配置（推荐）

1. 登录 Supabase Dashboard：https://supabase.com/dashboard
2. 选择项目：`agfkftjokakyvbecgkdb`
3. 进入 **Settings** → **Edge Functions** → **Secrets**
4. 添加环境变量：
   ```
   STRIPE_SECRET_KEY=sk_test_你的密钥
   ```
5. 保存配置

#### 方法B：使用Supabase CLI配置

```bash
# 设置Stripe密钥
supabase secrets set STRIPE_SECRET_KEY=sk_test_你的密钥

# 验证密钥是否设置成功
supabase secrets list
```

### 步骤3：更新前端Stripe Publishable Key

编辑文件：`/workspace/virtual-goods-store/src/pages/CheckoutPage.tsx`

找到第21行，更新为您的Publishable Key：

```typescript
const stripePromise = loadStripe('pk_test_你的公钥');
```

### 步骤4：移除演示模式逻辑（可选）

如果您希望完全禁用演示模式fallback，强制使用真实Stripe API：

**修改 process-payment/index.ts**：
```typescript
// 删除或注释掉第60-96行的演示模式代码
const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
    throw new Error('Stripe API密钥未配置');
}
// 直接调用真实Stripe API...
```

**修改 confirm-stripe-payment/index.ts**：
```typescript
// 删除或注释掉第29-50行的演示模式检测
// 直接从Stripe API获取Payment Intent状态
```

### 步骤5：重新部署Edge Functions

```bash
cd /workspace
supabase functions deploy process-payment
supabase functions deploy confirm-stripe-payment
```

### 步骤6：测试真实支付流程

使用Stripe测试卡号进行完整测试：

1. 在网站上添加商品到购物车
2. 进入结算页面
3. 填写订单信息
4. 选择Stripe支付方式
5. 输入测试卡号：`4242 4242 4242 4242`
6. 过期日期：`12/25`，CVV：`123`
7. 提交订单
8. 验证：
   - 订单状态更新为"已支付"
   - 虚拟商品自动发货
   - Stripe Dashboard显示成功的Payment Intent

## Webhook配置（可选但推荐）

为了接收Stripe的支付确认通知，配置Webhook：

### 步骤1：获取Webhook URL

Edge Function URL：
```
https://agfkftjokakyvbecgkdb.supabase.co/functions/v1/confirm-stripe-payment
```

### 步骤2：在Stripe Dashboard配置

1. 访问：https://dashboard.stripe.com/test/webhooks
2. 点击"Add endpoint"
3. 输入Endpoint URL：上述Edge Function URL
4. 选择事件：`payment_intent.succeeded`
5. 保存

### 步骤3：获取Webhook签名密钥

1. 复制Webhook的signing secret（格式：`whsec_...`）
2. 在Supabase中添加环境变量：
   ```
   STRIPE_WEBHOOK_SECRET=whsec_你的密钥
   ```

## 验证真实集成

### 检查清单

- [ ] Stripe Secret Key已配置在Supabase环境变量
- [ ] 前端Publishable Key已更新
- [ ] Edge Functions已重新部署
- [ ] 使用测试卡号完成支付测试
- [ ] Stripe Dashboard显示成功的Payment Intent
- [ ] 订单状态正确更新
- [ ] 虚拟商品成功发货
- [ ] （可选）Webhook正常接收通知

### 测试命令

测试process-payment Edge Function：

```bash
curl -X POST https://agfkftjokakyvbecgkdb.supabase.co/functions/v1/process-payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "orderId": "测试订单ID",
    "amount": 2999,
    "currency": "USD",
    "paymentMethod": "stripe"
  }'
```

预期响应应包含真实的Payment Intent（格式：`pi_*`，而非`pi_demo_*`）。

## 常见问题

### Q1: 为什么系统进入演示模式？

**A**: 可能原因：
1. Stripe API密钥未配置
2. 密钥格式错误
3. 密钥已过期或被撤销
4. 网络问题导致无法连接Stripe API

**解决方法**：
- 检查Supabase环境变量配置
- 验证密钥格式正确（`sk_test_...` 或 `sk_live_...`）
- 在Stripe Dashboard检查密钥状态

### Q2: 如何知道当前使用的是演示模式还是真实模式？

**A**: 检查方法：
1. 浏览器控制台：成功支付后会显示"Stripe演示模式：模拟支付成功"
2. 订单的transaction_id：演示模式格式为`pi_demo_*`，真实模式为`pi_*`
3. Stripe Dashboard：真实模式会在Dashboard显示交易记录

### Q3: 测试环境和生产环境可以切换吗？

**A**: 可以，只需更换API密钥：
- 测试环境 → 生产环境：更换为`sk_live_...`和`pk_live_...`
- 生产环境 → 测试环境：更换为`sk_test_...`和`pk_test_...`

重新部署Edge Functions后立即生效。

## 支持

如遇到问题，请检查：
1. Supabase Edge Function日志：https://supabase.com/dashboard/project/agfkftjokakyvbecgkdb/logs
2. Stripe Dashboard事件日志：https://dashboard.stripe.com/test/events
3. 浏览器控制台错误信息

---

**最后更新**：2025-11-11
**当前版本**：演示模式（需配置真实Stripe密钥）
