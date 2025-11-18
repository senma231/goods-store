# 支付API密钥配置指南

## 概述

虚拟商品交易商城已完成开发，支付系统代码框架已就绪。本文档指导您如何配置真实的支付API密钥。

## 支付系统架构

系统支持4种支付方式：
1. **Stripe** - 信用卡支付
2. **USDT** - 加密货币支付（TRC20/ERC20/BEP20）
3. **微信支付** - 扫码支付
4. **支付宝** - 扫码支付

## 配置步骤

### 1. Stripe支付配置

#### 1.1 获取API密钥
1. 注册Stripe账户：https://stripe.com
2. 进入Dashboard → Developers → API keys
3. 获取以下密钥：
   - **Publishable key** (pk_test_xxx) - 前端使用
   - **Secret key** (sk_test_xxx) - 后端使用

#### 1.2 配置Supabase环境变量
在Supabase Dashboard中配置Edge Function的环境变量：

```bash
# 进入Supabase Dashboard → Project Settings → Edge Functions → Manage secrets
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

#### 1.3 更新前端代码
编辑 `src/pages/CheckoutPage.tsx`，添加Stripe Elements：

```typescript
// 1. 安装Stripe依赖
// pnpm add @stripe/stripe-js @stripe/react-stripe-js

// 2. 在CheckoutPage.tsx顶部导入
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// 3. 初始化Stripe
const stripePromise = loadStripe('pk_test_your_publishable_key');

// 4. 包装结账表单
<Elements stripe={stripePromise}>
  <CheckoutForm />
</Elements>
```

#### 1.4 更新Edge Function
编辑 `supabase/functions/process-payment/index.ts`：

```typescript
// 在Stripe支付分支中添加真实集成
case 'stripe':
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    
    // 创建Payment Intent
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${stripeSecretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            amount: (order.total_amount * 100).toString(), // 转换为分
            currency: 'usd',
            metadata: {
                order_id: orderId
            }
        })
    });
    
    const intent = await stripeResponse.json();
    
    paymentResult = {
        transaction_id: intent.id,
        client_secret: intent.client_secret,
        status: 'pending'
    };
    break;
```

#### 1.5 前端处理支付
在前端使用Stripe Elements完成支付：

```typescript
const stripe = useStripe();
const elements = useElements();

const handleStripePayment = async (clientSecret: string) => {
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
            card: elements.getElement(CardElement),
        }
    });
    
    if (error) {
        console.error('支付失败:', error);
    } else if (paymentIntent.status === 'succeeded') {
        // 支付成功，更新订单状态
        console.log('支付成功');
    }
};
```

---

### 2. USDT支付配置

#### 2.1 选择区块链浏览器API

**TRC20 (推荐)**：
- API提供商：Troncan
- 注册地址：https://tronscan.org
- 文档：https://docs.tronscan.org

**ERC20**：
- API提供商：Etherscan
- 注册地址：https://etherscan.io/apis
- 获取免费API Key

**BEP20**：
- API提供商：BscScan
- 注册地址：https://bscscan.com/apis
- 获取免费API Key

#### 2.2 配置环境变量

```bash
# TRC20 USDT
TRONCAN_API_KEY=your_troncan_api_key

# ERC20 USDT
ETHERSCAN_API_KEY=your_etherscan_api_key

# BEP20 USDT
BSCSCAN_API_KEY=your_bscscan_api_key
```

#### 2.3 更新USDT支付检查函数

编辑 `supabase/functions/check-usdt-payment/index.ts`：

```typescript
// TRC20支付检查示例
async function checkTRC20Payment(address: string, expectedAmount: number) {
    const apiKey = Deno.env.get('TRONCAN_API_KEY');
    
    // 查询地址的USDT余额变化
    const response = await fetch(
        `https://apilist.tronscan.org/api/account?address=${address}`,
        {
            headers: {
                'TRON-PRO-API-KEY': apiKey
            }
        }
    );
    
    const data = await response.json();
    
    // 检查USDT转账交易
    const usdtTransfers = data.trc20token_balances?.find(
        (token: any) => token.tokenId === 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // USDT合约地址
    );
    
    // 验证转账金额和时间
    // ...实现具体的验证逻辑
    
    return isPaymentReceived;
}

// 在主函数中调用
for (const payment of payments) {
    const isReceived = await checkTRC20Payment(
        payment.payment_address,
        payment.amount
    );
    
    if (isReceived) {
        // 更新支付状态为已完成
        // 触发自动发货
    }
}
```

#### 2.4 ERC20和BEP20集成示例

```typescript
// ERC20 (Etherscan)
async function checkERC20Payment(address: string, expectedAmount: number) {
    const apiKey = Deno.env.get('ETHERSCAN_API_KEY');
    const usdtContract = '0xdac17f958d2ee523a2206206994597c13d831ec7';
    
    const response = await fetch(
        `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${usdtContract}&address=${address}&apikey=${apiKey}`
    );
    
    const data = await response.json();
    // 处理交易数据...
}

// BEP20 (BscScan)
async function checkBEP20Payment(address: string, expectedAmount: number) {
    const apiKey = Deno.env.get('BSCSCAN_API_KEY');
    const usdtContract = '0x55d398326f99059ff775485246999027b3197955';
    
    const response = await fetch(
        `https://api.bscscan.com/api?module=account&action=tokentx&contractaddress=${usdtContract}&address=${address}&apikey=${apiKey}`
    );
    
    const data = await response.json();
    // 处理交易数据...
}
```

---

### 3. 微信支付配置

#### 3.1 选择接入方式

**方式一：官方接入**（需企业资质）
- 注册微信支付商户：https://pay.weixin.qq.com
- 需要营业执照等企业资质

**方式二：第三方支付服务商**（推荐）
- XorPay: https://xorpay.com
- PayJS: https://payjs.cn
- 码支付: https://codepay.org

#### 3.2 第三方支付集成示例（以XorPay为例）

配置环境变量：
```bash
XORPAY_APP_ID=your_app_id
XORPAY_APP_SECRET=your_app_secret
```

更新Edge Function：
```typescript
case 'wechat':
    const xorpayAppId = Deno.env.get('XORPAY_APP_ID');
    const xorpaySecret = Deno.env.get('XORPAY_APP_SECRET');
    
    // 创建支付订单
    const wechatPayResponse = await fetch('https://api.xorpay.com/api/pay/wechat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            app_id: xorpayAppId,
            out_trade_no: order.order_number,
            total_fee: Math.round(order.total_amount * 100),
            body: '虚拟商品订单',
            sign: generateSign(order, xorpaySecret) // 生成签名
        })
    });
    
    const wechatData = await wechatPayResponse.json();
    
    paymentResult = {
        payment_url: wechatData.code_url, // 二维码URL
        status: 'pending',
        message: '请使用微信扫码支付'
    };
    break;
```

#### 3.3 前端显示二维码

```typescript
// 安装二维码库
// pnpm add qrcode.react

import QRCode from 'qrcode.react';

// 在结账页面显示
{paymentInfo.payment_url && (
    <div className="text-center">
        <QRCode value={paymentInfo.payment_url} size={256} />
        <p>请使用微信扫码支付</p>
    </div>
)}
```

---

### 4. 支付宝配置

#### 4.1 选择接入方式

**方式一：官方接入**（需企业资质）
- 注册支付宝商家：https://open.alipay.com
- 需要营业执照等企业资质

**方式二：第三方支付服务商**（推荐）
- 使用与微信支付相同的第三方服务商

#### 4.2 集成方式
类似微信支付的集成流程，替换API endpoint即可。

---

## 快速配置清单

### 最小可用配置（推荐从这里开始）

#### 步骤1：配置Stripe测试密钥
```bash
# 在Supabase Dashboard配置
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_key
```

#### 步骤2：重新部署process-payment函数
```bash
# 更新代码后重新部署
supabase functions deploy process-payment
```

#### 步骤3：前端添加Stripe Elements
```bash
cd virtual-goods-store
pnpm add @stripe/stripe-js @stripe/react-stripe-js
# 更新CheckoutPage.tsx
pnpm run build
# 重新部署前端
```

#### 步骤4：测试Stripe支付
使用Stripe测试卡号：
- 卡号：4242 4242 4242 4242
- 过期日期：任何未来日期
- CVC：任意3位数字
- 邮编：任意5位数字

### 完整生产配置

所有支付方式都配置完成后：
1. ✅ Stripe支付正常工作
2. ✅ USDT支付自动确认（Cron每5分钟检查）
3. ✅ 微信/支付宝二维码支付可用
4. ✅ 所有支付记录正确保存
5. ✅ 支付成功自动发货

---

## 测试指南

### Stripe支付测试

**测试卡号**：
- 成功支付：4242 4242 4242 4242
- 需要3D验证：4000 0025 0000 3155
- 卡被拒绝：4000 0000 0000 9995

### USDT支付测试

1. 使用测试网络（Testnet）
2. 获取测试USDT
3. 向配置的钱包地址转账
4. 等待Cron任务检查（最多5分钟）
5. 验证订单状态更新

### 微信/支付宝测试

使用第三方支付服务商提供的测试环境和测试账户。

---

## 常见问题

### Q1: 如何切换测试环境到生产环境？

**Stripe**:
- 将`pk_test_`替换为`pk_live_`
- 将`sk_test_`替换为`sk_live_`

**USDT**:
- 确保使用主网API endpoint
- 使用真实的钱包地址

### Q2: 支付失败如何处理？

系统会自动：
1. 记录失败原因到payments表
2. 保持订单状态为"待支付"
3. 用户可在订单页面重试支付

### Q3: 如何添加新的支付方式？

1. 在`process-payment`函数中添加新的case
2. 更新前端CheckoutPage添加新的支付选项
3. 配置对应的环境变量

---

## 安全建议

1. **永远不要在前端代码中硬编码API密钥**
2. **使用Supabase的环境变量管理密钥**
3. **定期更换API密钥**
4. **监控异常支付行为**
5. **启用Webhook验证签名**

---

## 支持与帮助

如果在配置过程中遇到问题：

1. **查看Edge Function日志**：
   - Supabase Dashboard → Edge Functions → Logs

2. **查看支付记录**：
   - 数据库中的`payments`表包含所有支付详情

3. **测试API连接**：
   - 使用Postman或curl测试API endpoint
   - 验证API密钥是否正确

---

## 附录：环境变量完整清单

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# 区块链API
TRONCAN_API_KEY=xxx
ETHERSCAN_API_KEY=xxx
BSCSCAN_API_KEY=xxx

# 微信支付（第三方）
XORPAY_APP_ID=xxx
XORPAY_APP_SECRET=xxx

# 支付宝（第三方）
ALIPAY_APP_ID=xxx
ALIPAY_APP_SECRET=xxx

# Supabase（已配置）
SUPABASE_URL=https://agfkftjokakyvbecgkdb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

**配置完成后，您的虚拟商品交易商城将拥有完整的生产级支付能力！**
