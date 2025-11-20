# Stripe 支付宝和微信支付对接指南

## 📋 概述

Stripe 支持通过 Payment Methods API 集成支付宝（Alipay）和微信支付（WeChat Pay）。这些支付方式特别适合面向中国用户的业务。

---

## 🌍 支持的地区和要求

### Alipay（支付宝）
- ✅ **支持地区**: 全球（需要 Stripe 账户支持国际支付）
- ✅ **货币**: 支持多种货币，包括 USD, EUR, CNY 等
- ✅ **用户体验**: 扫码支付或跳转到支付宝页面
- ⚠️ **要求**: 
  - Stripe 账户需要开通 Alipay 支付方式
  - 需要完成 Stripe 的业务验证

### WeChat Pay（微信支付）
- ✅ **支持地区**: 全球（需要 Stripe 账户支持国际支付）
- ✅ **货币**: 主要支持 CNY（人民币），部分地区支持其他货币
- ✅ **用户体验**: 扫码支付
- ⚠️ **要求**:
  - Stripe 账户需要开通 WeChat Pay 支付方式
  - 需要完成 Stripe 的业务验证
  - 可能需要额外的合规审核

---

## 🔧 开通步骤

### 1. 在 Stripe Dashboard 中开通

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com)
2. 进入 **Settings** → **Payment methods**
3. 找到 **Alipay** 和 **WeChat Pay**
4. 点击 **Enable** 开通

### 2. 完成业务验证

Stripe 可能要求您提供：
- 业务类型和描述
- 预计交易量
- 目标市场
- 合规文件（如营业执照）

### 3. 测试模式

在测试模式下，您可以使用 Stripe 提供的测试账号进行测试。

---

## 💻 技术实现

### 方案 1: 使用 Stripe Checkout（推荐）⭐

**优点**：
- ✅ 最简单，Stripe 托管支付页面
- ✅ 自动处理支付宝和微信支付的跳转
- ✅ 内置安全性和合规性
- ✅ 支持多种支付方式切换

**实现步骤**：

#### 后端代码修改

在 `backend/src/routes/payments.js` 中添加：

```javascript
// Stripe Checkout Session（支持支付宝和微信支付）
router.post('/stripe/create-checkout-session', async (req, res) => {
  try {
    const config = getStripeConfig();
    if (!config.secretKey) {
      return res.status(500).json({ error: 'Stripe 密钥未配置' });
    }

    const stripe = new Stripe(config.secretKey);
    const { order_id } = req.body;

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order_id);

    // 创建 Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: [
        'card',           // 信用卡
        'alipay',         // 支付宝
        'wechat_pay'      // 微信支付
      ],
      line_items: orderItems.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.product_name,
          },
          unit_amount: Math.round(item.price * 100), // 转换为分
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/order-confirm?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout?canceled=true`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
      },
    });

    res.json({ 
      session_id: session.id,
      url: session.url 
    });
  } catch (error) {
    console.error('创建 Checkout Session 错误:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### 前端代码修改

在支付页面添加 Stripe Checkout 按钮：

```typescript
// 使用 Stripe Checkout
const handleStripeCheckout = async () => {
  try {
    const response = await fetch('/api/payments/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    });

    const { url } = await response.json();
    
    // 跳转到 Stripe Checkout 页面
    window.location.href = url;
  } catch (error) {
    console.error('支付失败:', error);
  }
};
```

---

### 方案 2: 使用 Payment Intents API（高级）

**优点**：
- ✅ 完全自定义支付流程
- ✅ 在您的网站上完成支付
- ✅ 更好的品牌体验

**缺点**：
- ❌ 实现复杂
- ❌ 需要处理更多边缘情况

**实现步骤**：

#### 后端代码

```javascript
// 创建支付意图（支持支付宝和微信支付）
router.post('/stripe/create-payment-intent-with-methods', async (req, res) => {
  try {
    const config = getStripeConfig();
    const stripe = new Stripe(config.secretKey);
    
    const { order_id, payment_method_type } = req.body;
    // payment_method_type: 'card' | 'alipay' | 'wechat_pay'

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(order.total_amount * 100),
      currency: 'usd',
      payment_method_types: [payment_method_type],
      metadata: {
        order_id,
        order_number: order.order_number,
      },
    });

    res.json({ 
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });
  } catch (error) {
    console.error('创建支付意图错误:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### 前端代码（使用 Stripe.js）

```typescript
import { loadStripe } from '@stripe/stripe-js';

// 支付宝支付
const handleAlipayPayment = async () => {
  const stripe = await loadStripe(publishableKey);
  
  // 创建支付意图
  const { client_secret } = await fetch('/api/payments/stripe/create-payment-intent-with-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      order_id: orderId,
      payment_method_type: 'alipay'
    }),
  }).then(r => r.json());

  // 确认支付（会跳转到支付宝）
  const { error } = await stripe.confirmAlipayPayment(client_secret, {
    return_url: `${window.location.origin}/order-confirm`,
  });

  if (error) {
    console.error('支付失败:', error);
  }
};

// 微信支付
const handleWeChatPayment = async () => {
  const stripe = await loadStripe(publishableKey);
  
  const { client_secret } = await fetch('/api/payments/stripe/create-payment-intent-with-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      order_id: orderId,
      payment_method_type: 'wechat_pay'
    }),
  }).then(r => r.json());

  // 确认支付（会显示二维码）
  const { error } = await stripe.confirmWechatPayPayment(client_secret, {
    payment_method_options: {
      wechat_pay: {
        client: 'web', // 'web' 或 'mobile'
      },
    },
  });

  if (error) {
    console.error('支付失败:', error);
  }
};
```

---

## 🎨 用户体验流程

### Alipay（支付宝）流程
1. 用户选择支付宝支付
2. 跳转到支付宝页面或扫码
3. 用户在支付宝中完成支付
4. 跳转回您的网站
5. Webhook 通知支付结果

### WeChat Pay（微信支付）流程
1. 用户选择微信支付
2. 显示二维码
3. 用户使用微信扫码支付
4. 支付完成后页面自动更新
5. Webhook 通知支付结果

---

## ⚠️ 重要注意事项

### 1. 货币支持
- Alipay: 支持多种货币，但建议使用 USD 或 CNY
- WeChat Pay: 主要支持 CNY，部分地区支持 USD

### 2. Webhook 处理
支付宝和微信支付都是异步支付，**必须**正确处理 Webhook：

```javascript
// 已有的 Webhook 处理代码会自动支持
// 确保监听这些事件：
// - payment_intent.succeeded
// - payment_intent.payment_failed
```

### 3. 测试
- 测试模式下可以使用 Stripe 提供的测试账号
- 生产环境需要真实的支付宝/微信账号

### 4. 合规要求
- 需要在网站上显示支付方式图标
- 需要遵守支付宝和微信支付的使用条款
- 可能需要额外的业务验证

---

## 📊 费用

Stripe 对支付宝和微信支付的费率：
- **Alipay**: 通常为 3.4% + $0.30 每笔（具体费率取决于您的 Stripe 账户）
- **WeChat Pay**: 通常为 3.4% + $0.30 每笔

**注意**: 费率可能因地区和交易量而异，请查看您的 Stripe Dashboard 获取准确费率。

---

## 🚀 推荐实现方案

对于您的虚拟商城，我推荐：

### 短期方案（快速上线）
使用 **Stripe Checkout**（方案 1）：
- ✅ 实现简单，1-2小时即可完成
- ✅ Stripe 托管，安全可靠
- ✅ 自动支持多种支付方式

### 长期方案（更好体验）
使用 **Payment Intents API**（方案 2）：
- ✅ 完全自定义界面
- ✅ 用户无需跳转（微信支付）
- ✅ 更好的品牌体验

---

## 📝 下一步

1. **开通支付方式**: 在 Stripe Dashboard 中开通 Alipay 和 WeChat Pay
2. **选择实现方案**: 建议先使用 Stripe Checkout 快速上线
3. **测试**: 在测试模式下完整测试支付流程
4. **上线**: 切换到生产模式

需要我帮您实现具体的代码吗？

---

## 🆚 支付方式对比

### Stripe 支付宝/微信 vs 直接对接

| 特性 | Stripe 集成 | 直接对接支付宝/微信 |
|------|------------|-------------------|
| **开发难度** | ⭐⭐ 简单 | ⭐⭐⭐⭐⭐ 复杂 |
| **开发时间** | 1-2 天 | 2-4 周 |
| **维护成本** | 低（Stripe 维护） | 高（需要自己维护） |
| **手续费** | 3.4% + $0.30 | 0.6% - 1.0% |
| **结算周期** | T+2 到 Stripe 账户 | T+1 到银行账户 |
| **支持货币** | 多种货币 | 主要是 CNY |
| **合规要求** | Stripe 处理 | 需要自己处理 |
| **适用场景** | 国际业务、小额交易 | 国内业务、大额交易 |

### 建议

- **如果您的业务主要面向国际用户**: 使用 Stripe 集成 ✅
- **如果您的业务主要面向中国用户且交易量大**: 考虑直接对接 ⚠️
- **如果您刚开始**: 先用 Stripe，后期再考虑直接对接 ⭐

---

## 🔗 相关资源

- [Stripe Alipay 文档](https://stripe.com/docs/payments/alipay)
- [Stripe WeChat Pay 文档](https://stripe.com/docs/payments/wechat-pay)
- [Stripe Checkout 文档](https://stripe.com/docs/payments/checkout)
- [Stripe Payment Intents API](https://stripe.com/docs/payments/payment-intents)

---

## ❓ 常见问题

### Q1: Stripe 支付宝和直接对接支付宝有什么区别？
**A**:
- **Stripe 支付宝**: 通过 Stripe 作为中间商，手续费较高（3.4%），但开发简单
- **直接对接**: 直接对接支付宝官方 API，手续费低（0.6%），但开发复杂，需要企业资质

### Q2: 我需要在中国注册公司才能使用吗？
**A**:
- **Stripe 集成**: 不需要，只需要 Stripe 账户
- **直接对接**: 需要中国企业资质和银行账户

### Q3: 测试环境如何测试？
**A**:
- Stripe 提供测试模式，可以使用测试账号
- 不需要真实的支付宝/微信账号

### Q4: 支付成功后如何通知我的系统？
**A**:
- 通过 Stripe Webhook（已在您的系统中实现）
- 监听 `payment_intent.succeeded` 事件

### Q5: 用户支付时会跳转到哪里？
**A**:
- **Stripe Checkout**: 跳转到 Stripe 托管的支付页面
- **Payment Intents API**:
  - 支付宝：跳转到支付宝页面
  - 微信支付：在您的网站上显示二维码

---

## 💡 实施建议

### 阶段 1: 快速上线（1-2 天）
1. 在 Stripe Dashboard 开通 Alipay 和 WeChat Pay
2. 实现 Stripe Checkout 方案
3. 测试支付流程
4. 上线

### 阶段 2: 优化体验（1 周）
1. 添加支付方式选择界面
2. 优化支付成功/失败页面
3. 添加支付状态实时更新
4. 完善错误处理

### 阶段 3: 高级功能（可选）
1. 切换到 Payment Intents API
2. 自定义支付界面
3. 添加支付分析
4. 优化转化率

---

## 🎯 总结

**Stripe 支付宝和微信支付集成的优势**：
- ✅ 开发简单，快速上线
- ✅ Stripe 处理合规和安全
- ✅ 支持多种货币和支付方式
- ✅ 统一的支付体验

**适合的场景**：
- ✅ 国际业务
- ✅ 小额交易
- ✅ 快速验证市场
- ✅ 技术团队较小

**不适合的场景**：
- ❌ 纯国内业务且交易量大（手续费高）
- ❌ 需要极低的手续费
- ❌ 需要 T+0 结算

如果您决定实现，我可以帮您：
1. 实现 Stripe Checkout 方案（推荐）
2. 实现 Payment Intents API 方案（高级）
3. 添加支付方式选择界面
4. 优化支付流程

