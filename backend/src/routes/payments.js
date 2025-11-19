import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { getDb } from '../database/db.js';
import { deliverOrder } from '../services/delivery.js';
import { sendNotification } from '../services/notification.js';

const router = express.Router();

// 从数据库获取 Stripe 配置
function getStripeConfig() {
  const db = getDb();
  const secretKeySetting = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?').get('stripe_secret_key');
  const publishableKeySetting = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?').get('stripe_publishable_key');

  return {
    secretKey: secretKeySetting?.setting_value || process.env.STRIPE_SECRET_KEY,
    publishableKey: publishableKeySetting?.setting_value || process.env.STRIPE_PUBLISHABLE_KEY
  };
}

// 从数据库获取 USDT 配置
function getUSDTConfig(chain = null) {
  const db = getDb();

  // 获取默认链
  const chainSetting = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?').get('usdt_default_chain');
  const defaultChain = chainSetting?.setting_value || 'TRC20';

  // 确定要使用的链
  const targetChain = chain || defaultChain;

  // 根据链类型获取对应的钱包地址
  const settingKey = `usdt_wallet_address_${targetChain.toLowerCase()}`;
  const walletAddressSetting = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?').get(settingKey);

  // 如果没有配置特定链的地址，尝试使用通用地址（向后兼容）
  let walletAddress = walletAddressSetting?.setting_value;
  if (!walletAddress) {
    const generalSetting = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?').get('usdt_wallet_address');
    walletAddress = generalSetting?.setting_value || process.env.USDT_WALLET_ADDRESS;
  }

  return {
    walletAddress,
    defaultChain,
    chain: targetChain
  };
}

// 获取 Stripe 公钥（供前端使用）
router.get('/stripe/publishable-key', (req, res) => {
  try {
    const config = getStripeConfig();

    if (!config.publishableKey) {
      return res.status(500).json({ error: 'Stripe 公钥未配置' });
    }

    res.json({ publishable_key: config.publishableKey });
  } catch (error) {
    console.error('获取 Stripe 公钥错误:', error);
    res.status(500).json({ error: '获取配置失败' });
  }
});

// Stripe 创建支付意图
router.post('/stripe/create-payment-intent', async (req, res) => {
  try {
    const config = getStripeConfig();

    if (!config.secretKey) {
      return res.status(500).json({ error: 'Stripe 密钥未配置，请在系统设置中配置 stripe_secret_key' });
    }

    const stripe = new Stripe(config.secretKey);

    const { order_id, amount } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ error: '订单ID和金额不能为空' });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 创建 Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // 金额已经是分
      currency: 'usd',
      metadata: {
        order_id,
        order_number: order.order_number
      }
    });

    // 创建支付记录
    const paymentId = uuidv4();
    db.prepare(`
      INSERT INTO payments (id, order_id, payment_method, amount, currency, stripe_payment_intent_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(paymentId, order_id, 'stripe', amount / 100, 'USD', paymentIntent.id, 'pending');

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_id: paymentId
    });
  } catch (error) {
    console.error('创建 Stripe 支付错误:', error);
    res.status(500).json({ error: error.message || '创建支付失败' });
  }
});

// 确认支付成功（前端调用）
router.post('/confirm-payment', async (req, res) => {
  try {
    const { order_id, payment_method } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: '订单ID不能为空' });
    }

    const db = getDb();

    // 查询订单
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 检查订单是否已经支付（防止重复处理）
    const alreadyPaid = order.payment_status === 'paid';

    // 查询支付记录
    const payment = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order_id);

    if (!payment) {
      return res.status(404).json({ error: '支付记录不存在' });
    }

    // 更新支付状态
    db.prepare(`
      UPDATE payments
      SET status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(payment.id);

    // 更新订单状态
    db.prepare(`
      UPDATE orders
      SET payment_status = 'paid', order_status = 'processing', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(order_id);

    console.log(`✅ 订单 ${order_id} 支付确认成功${alreadyPaid ? '（已支付，跳过通知）' : ''}`);

    // 发送支付成功通知（仅在首次支付时发送，避免重复）
    if (!alreadyPaid) {
      try {
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order_id);
        const productNames = orderItems.map(item => `${item.product_name} x${item.quantity}`).join(', ');

        // 获取支付方式的中文名称
        const paymentMethodNames = {
          'stripe': 'Stripe',
          'usdt': 'USDT',
          'alipay': '支付宝',
          'wechat': '微信支付'
        };
        const paymentMethodText = paymentMethodNames[payment.payment_method] || payment.payment_method || '未知';

        const notificationMessage = `💰 订单支付成功\n\n订单号: ${order.order_number}\n联系人: ${order.contact_name || '未提供'}\n邮箱: ${order.contact_email}\n商品: ${productNames}\n支付金额: ¥${order.total_amount.toFixed(2)}\n支付方式: ${paymentMethodText}\n\n系统将自动发货！`;

        await sendNotification('payment_success', notificationMessage);
        console.log(`✅ 支付成功通知已发送: ${order.order_number}`);
      } catch (notifError) {
        console.error('发送支付通知失败:', notifError);
      }
    }

    // 自动发货（仅在首次支付时发货，避免重复）
    if (!alreadyPaid) {
      try {
        const deliveryResult = await deliverOrder(order_id);
        console.log(`✅ 订单 ${order_id} 自动发货成功:`, deliveryResult);
      } catch (deliveryError) {
        console.error(`订单 ${order_id} 自动发货失败:`, deliveryError);
        // 发货失败不影响支付确认
      }
    }

    res.json({
      success: true,
      message: '支付确认成功'
    });
  } catch (error) {
    console.error('确认支付错误:', error);
    res.status(500).json({ error: '确认支付失败' });
  }
});

// Stripe Webhook
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const config = getStripeConfig();
    const db = getDb();
    const webhookSecretSetting = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?').get('stripe_webhook_secret');
    const webhookSecret = webhookSecretSetting?.setting_value || process.env.STRIPE_WEBHOOK_SECRET;

    if (!config.secretKey || !webhookSecret) {
      return res.status(500).send('Stripe Webhook 未配置');
    }

    const stripe = new Stripe(config.secretKey);
    const sig = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      // 更新支付状态
      db.prepare(`
        UPDATE payments
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP
        WHERE stripe_payment_intent_id = ?
      `).run(paymentIntent.id);

      // 更新订单状态
      const payment = db.prepare('SELECT * FROM payments WHERE stripe_payment_intent_id = ?').get(paymentIntent.id);
      if (payment) {
        db.prepare(`
          UPDATE orders
          SET payment_status = 'paid', order_status = 'processing', updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(payment.order_id);

        console.log(`✅ Stripe Webhook: 订单 ${payment.order_id} 支付成功`);

        // 发送支付成功通知
        try {
          const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(payment.order_id);
          const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(payment.order_id);
          const productNames = orderItems.map(item => `${item.product_name} x${item.quantity}`).join(', ');

          const notificationMessage = `💰 订单支付成功\n\n订单号: ${order.order_number}\n联系人: ${order.contact_name || '未提供'}\n邮箱: ${order.contact_email}\n商品: ${productNames}\n支付金额: ¥${order.total_amount.toFixed(2)}\n支付方式: Stripe\n\n系统将自动发货！`;

          await sendNotification('payment_success', notificationMessage);
          console.log(`✅ 支付成功通知已发送: ${order.order_number}`);
        } catch (notifError) {
          console.error('发送支付通知失败:', notifError);
        }

        // 自动发货
        try {
          const deliveryResult = await deliverOrder(payment.order_id);
          console.log(`✅ Stripe Webhook: 订单 ${payment.order_id} 自动发货成功:`, deliveryResult);
        } catch (deliveryError) {
          console.error(`Stripe Webhook: 订单 ${payment.order_id} 自动发货失败:`, deliveryError);
          // 发货失败不影响 webhook 响应
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe Webhook 错误:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// USDT 创建支付地址
router.post('/usdt/create-payment', async (req, res) => {
  try {
    const { order_id, amount, chain } = req.body;

    if (!order_id || !amount) {
      return res.status(400).json({ error: '订单ID和金额不能为空' });
    }

    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 获取指定链的配置
    const config = getUSDTConfig(chain);
    const paymentChain = config.chain;

    if (!config.walletAddress) {
      return res.status(500).json({
        error: `${paymentChain} 钱包地址未配置，请在系统设置中配置 usdt_wallet_address_${paymentChain.toLowerCase()}`
      });
    }

    // 使用配置的钱包地址
    const paymentAddress = config.walletAddress;

    // 创建支付记录
    const paymentId = uuidv4();
    db.prepare(`
      INSERT INTO payments (id, order_id, payment_method, amount, currency, payment_address, payment_chain, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(paymentId, order_id, 'usdt', amount, 'USDT', paymentAddress, paymentChain, 'pending');

    res.json({
      payment_id: paymentId,
      payment_address: paymentAddress,
      amount,
      chain: paymentChain,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30分钟过期
    });
  } catch (error) {
    console.error('创建 USDT 支付错误:', error);
    res.status(500).json({ error: error.message || '创建支付失败' });
  }
});

// 检查支付状态
router.get('/:payment_id/status', async (req, res) => {
  try {
    const { payment_id } = req.params;
    const db = getDb();
    
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(payment_id);
    
    if (!payment) {
      return res.status(404).json({ error: '支付记录不存在' });
    }
    
    res.json({ payment });
  } catch (error) {
    console.error('查询支付状态错误:', error);
    res.status(500).json({ error: '查询支付状态失败' });
  }
});

export default router;

