import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDb from '../database/db.js';
import { optionalAuth, authenticateToken, requireAdmin } from '../middleware/auth.js';
import { retryDelivery, getFailedDeliveries } from '../services/delivery.js';
import { sendNotification } from '../services/notification.js';

const router = express.Router();

// 生成订单号
function generateOrderNumber() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD${timestamp}${random}`;
}

// 生成查询令牌
function generateQueryToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// 创建订单
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { items, contact_email, contact_name, payment_method } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: '订单项不能为空' });
    }

    if (!contact_email) {
      return res.status(400).json({ error: '联系邮箱不能为空' });
    }

    const db = getDb();
    const userId = req.user?.id || null;
    const orderId = uuidv4();
    const orderNumber = generateOrderNumber();
    const queryToken = generateQueryToken();

    // 计算总金额
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!product) {
        return res.status(404).json({ error: `商品不存在: ${item.product_id}` });
      }

      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;

      orderItems.push({
        id: uuidv4(),
        order_id: orderId,
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: item.quantity,
        subtotal
      });
    }

    // 创建订单
    db.prepare(`
      INSERT INTO orders (id, order_number, user_id, contact_email, contact_name, total_amount, payment_method, order_query_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orderId, orderNumber, userId, contact_email, contact_name || null, totalAmount, payment_method || null, queryToken);

    // 创建订单项
    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, product_price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of orderItems) {
      insertOrderItem.run(item.id, item.order_id, item.product_id, item.product_name, item.product_price, item.quantity, item.subtotal);
    }

    // 获取完整订单信息
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const items_data = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

    // 发送新订单通知
    try {
      const productNames = items_data.map(item => `${item.product_name} x${item.quantity}`).join(', ');
      const notificationMessage = `📦 新订单通知\n\n订单号: ${orderNumber}\n联系人: ${contact_name || '未提供'}\n邮箱: ${contact_email}\n商品: ${productNames}\n总金额: ¥${totalAmount.toFixed(2)}\n支付方式: ${payment_method || '未选择'}\n\n请及时处理订单！`;

      await sendNotification('order_created', notificationMessage);
      console.log(`✅ 新订单通知已发送: ${orderNumber}`);
    } catch (notifError) {
      console.error('发送订单通知失败:', notifError);
      // 不影响订单创建，继续执行
    }

    res.status(201).json({
      order: {
        ...order,
        items: items_data
      }
    });
  } catch (error) {
    console.error('创建订单错误:', error);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// 查询订单（游客）- 支持两种路径
router.post('/query', async (req, res) => {
  try {
    const { order_number, contact_email, query_token } = req.body;

    if (!order_number) {
      return res.status(400).json({ error: '订单号不能为空' });
    }

    if (!contact_email && !query_token) {
      return res.status(400).json({ error: '请提供邮箱或查询码' });
    }

    const db = getDb();
    let order;

    if (query_token) {
      order = db.prepare('SELECT * FROM orders WHERE order_number = ? AND order_query_token = ?')
        .get(order_number, query_token);
    } else {
      order = db.prepare('SELECT * FROM orders WHERE order_number = ? AND contact_email = ?')
        .get(order_number, contact_email);
    }

    if (!order) {
      return res.status(404).json({ error: '订单不存在或信息不匹配' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    res.json({
      order: {
        ...order,
        items
      }
    });
  } catch (error) {
    console.error('查询订单错误:', error);
    res.status(500).json({ error: '查询订单失败' });
  }
});

// 游客订单查询（兼容前端调用）
router.post('/guest-query', async (req, res) => {
  try {
    const { order_number, contact_email, query_token } = req.body;

    if (!order_number) {
      return res.status(400).json({ error: '订单号不能为空' });
    }

    if (!contact_email && !query_token) {
      return res.status(400).json({ error: '请提供邮箱或查询码' });
    }

    const db = getDb();
    let order;

    if (query_token) {
      order = db.prepare('SELECT * FROM orders WHERE order_number = ? AND order_query_token = ?')
        .get(order_number, query_token);
    } else {
      order = db.prepare('SELECT * FROM orders WHERE order_number = ? AND contact_email = ?')
        .get(order_number, contact_email);
    }

    if (!order) {
      return res.status(404).json({ error: '订单不存在或信息不匹配' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

    // 获取发货信息（包含虚拟资产详情）
    const deliveries = db.prepare(`
      SELECT
        d.*,
        va.asset_type,
        va.asset_value,
        va.product_id
      FROM deliveries d
      LEFT JOIN virtual_assets va ON d.virtual_asset_id = va.id
      WHERE d.order_id = ?
      ORDER BY d.sent_at DESC
    `).all(order.id);

    // 格式化发货数据
    const formattedDeliveries = deliveries.map(delivery => ({
      id: delivery.id,
      order_id: delivery.order_id,
      virtual_asset_id: delivery.virtual_asset_id,
      sent_at: delivery.sent_at,
      status: delivery.status,
      virtual_assets: {
        asset_type: delivery.asset_type,
        asset_value: delivery.asset_value,
        product_id: delivery.product_id
      }
    }));

    res.json({
      order: {
        ...order,
        items,
        deliveries: formattedDeliveries
      }
    });
  } catch (error) {
    console.error('查询订单错误:', error);
    res.status(500).json({ error: '查询订单失败' });
  }
});

// 获取所有订单（管理员）或用户订单列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = getDb();

    let orders;
    // 如果是管理员，返回所有订单
    if (req.user.role === 'admin') {
      orders = db.prepare(`
        SELECT * FROM orders
        ORDER BY created_at DESC
      `).all();
    } else {
      // 普通用户只返回自己的订单
      orders = db.prepare(`
        SELECT * FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(req.user.id);
    }

    // 映射字段：order_status -> status（前端兼容性）
    const mappedOrders = orders.map(order => ({
      ...order,
      status: order.order_status
    }));

    res.json({ orders: mappedOrders });
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// 获取用户订单列表（保留兼容性）
router.get('/my-orders', authenticateToken, async (req, res) => {
  try {
    const db = getDb();

    // 如果是管理员，返回所有订单
    if (req.user.role === 'admin') {
      const orders = db.prepare(`
        SELECT * FROM orders
        ORDER BY created_at DESC
      `).all();

      return res.json({ orders });
    }

    // 普通用户只返回自己的订单
    const orders = db.prepare(`
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    res.json({ orders });
  } catch (error) {
    console.error('获取订单列表错误:', error);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// 获取订单详情
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 权限检查：管理员可以查看所有订单，普通用户只能查看自己的订单
    const isAdmin = req.user?.role === 'admin';
    const isOwner = req.user && order.user_id === req.user.id;
    const isGuest = !order.user_id; // 游客订单

    if (!isAdmin && !isOwner && !isGuest) {
      return res.status(403).json({ error: '无权访问此订单' });
    }

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);

    // 获取发货信息（包含虚拟资产详情）
    const deliveries = db.prepare(`
      SELECT
        d.*,
        va.asset_type,
        va.asset_value,
        va.product_id
      FROM deliveries d
      LEFT JOIN virtual_assets va ON d.virtual_asset_id = va.id
      WHERE d.order_id = ?
      ORDER BY d.sent_at DESC
    `).all(id);

    // 格式化发货数据
    const formattedDeliveries = deliveries.map(delivery => ({
      id: delivery.id,
      order_id: delivery.order_id,
      virtual_asset_id: delivery.virtual_asset_id,
      sent_at: delivery.sent_at,
      status: delivery.status,
      delivery_method: delivery.delivery_method,
      content_type: delivery.content_type,
      content_data: delivery.content_data,
      virtual_assets: delivery.virtual_asset_id ? {
        asset_type: delivery.asset_type,
        asset_value: delivery.asset_value,
        product_id: delivery.product_id
      } : null
    }));

    res.json({
      order: {
        ...order,
        status: order.order_status, // 字段映射
        items,
        deliveries: formattedDeliveries
      }
    });
  } catch (error) {
    console.error('获取订单详情错误:', error);
    res.status(500).json({ error: '获取订单详情失败' });
  }
});

// 手动发货 (管理员)
router.post('/:id/manual-delivery', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveries } = req.body; // [{ product_id, asset_type, asset_value }]

    if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
      return res.status(400).json({ error: '请提供发货内容' });
    }

    const db = getDb();

    // 获取订单信息
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 获取订单商品
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);

    const createdDeliveries = [];

    // 创建发货记录
    for (const delivery of deliveries) {
      const { product_id, asset_type, asset_value } = delivery;

      // 查找对应的订单项
      const orderItem = orderItems.find(item => item.product_id === product_id);
      if (!orderItem) {
        console.warn(`订单中没有商品 ${product_id}，跳过`);
        continue;
      }

      const deliveryId = uuidv4();
      db.prepare(`
        INSERT INTO deliveries (
          id, order_id, product_id, delivery_email,
          delivery_method, content_type, content_data, status, sent_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).run(
        deliveryId,
        id,
        product_id,
        order.contact_email,
        'manual',
        asset_type,
        JSON.stringify({
          product_name: orderItem.product_name,
          asset_type,
          asset_value
        }),
        'sent'
      );

      createdDeliveries.push({
        id: deliveryId,
        product_name: orderItem.product_name,
        asset_type,
        asset_value
      });

      console.log(`✅ 手动发货: ${asset_value} 给订单 ${id}`);
    }

    // 更新订单状态为已完成
    db.prepare(`
      UPDATE orders
      SET order_status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);

    console.log(`✅ 订单 ${id} 手动发货完成，共发货 ${createdDeliveries.length} 个商品`);

    res.json({
      success: true,
      message: '手动发货成功',
      deliveries: createdDeliveries
    });
  } catch (error) {
    console.error('手动发货错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '手动发货失败'
    });
  }
});

// 重试发货 (管理员)
router.post('/:id/retry-delivery', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`管理员请求重试发货: ${id}`);

    const result = await retryDelivery(id);

    res.json({
      success: true,
      message: '重试发货成功',
      deliveries: result.deliveries
    });
  } catch (error) {
    console.error('重试发货错误:', error);
    res.status(500).json({
      success: false,
      error: error.message || '重试发货失败'
    });
  }
});

// 获取发货失败的订单列表 (管理员)
router.get('/failed-deliveries', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const failedOrders = getFailedDeliveries();

    res.json({
      success: true,
      orders: failedOrders
    });
  } catch (error) {
    console.error('获取失败发货列表错误:', error);
    res.status(500).json({ error: '获取失败发货列表失败' });
  }
});

// 取消订单 (管理员)
router.post('/:id/cancel', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // 获取订单信息
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 检查订单状态
    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: '已支付的订单无法取消，请使用退款功能' });
    }

    if (order.order_status === 'cancelled') {
      return res.status(400).json({ error: '订单已经被取消' });
    }

    // 更新订单状态为已取消
    db.prepare(`
      UPDATE orders
      SET order_status = 'cancelled', updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    console.log(`订单已取消: ${id}`);

    res.json({
      success: true,
      message: '订单已取消'
    });
  } catch (error) {
    console.error('取消订单错误:', error);
    res.status(500).json({ error: error.message || '取消订单失败' });
  }
});

// 退款订单 (管理员)
router.post('/:id/refund', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // 获取订单信息
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 检查支付状态
    if (order.payment_status !== 'paid') {
      return res.status(400).json({ error: '只有已支付的订单才能退款' });
    }

    if (order.order_status === 'refunded') {
      return res.status(400).json({ error: '订单已经退款' });
    }

    // 获取支付记录
    const payment = db.prepare('SELECT * FROM payments WHERE order_id = ?').get(id);

    if (!payment) {
      return res.status(404).json({ error: '未找到支付记录' });
    }

    // 根据支付方式处理退款
    if (payment.payment_method === 'stripe' && payment.stripe_payment_intent_id) {
      // Stripe 退款
      try {
        // 获取 Stripe 配置
        const secretKeySetting = db.prepare('SELECT setting_value FROM site_settings WHERE setting_key = ?').get('stripe_secret_key');
        const secretKey = secretKeySetting?.setting_value || process.env.STRIPE_SECRET_KEY;

        if (!secretKey) {
          return res.status(500).json({ error: 'Stripe 密钥未配置' });
        }

        // 动态导入 Stripe
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(secretKey);

        // 创建退款
        const refund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
          reason: 'requested_by_customer'
        });

        console.log(`✅ Stripe 退款成功: ${refund.id}`);

        // 更新支付记录
        db.prepare(`
          UPDATE payments
          SET status = 'refunded', updated_at = datetime('now')
          WHERE id = ?
        `).run(payment.id);

      } catch (stripeError) {
        console.error('Stripe 退款失败:', stripeError);
        return res.status(500).json({
          error: `Stripe 退款失败: ${stripeError.message}`
        });
      }
    } else if (payment.payment_method === 'usdt') {
      // USDT 退款 - 需要手动处理
      console.log(`⚠️ USDT 订单退款需要手动处理: ${id}`);
      // USDT 退款需要管理员手动转账到用户钱包
      // 这里只更新数据库状态
    } else {
      console.log(`⚠️ 未知支付方式退款: ${payment.payment_method}`);
    }

    // 更新订单状态为已退款
    db.prepare(`
      UPDATE orders
      SET order_status = 'refunded',
          payment_status = 'refunded',
          updated_at = datetime('now')
      WHERE id = ?
    `).run(id);

    console.log(`订单已退款: ${id}`);

    res.json({
      success: true,
      message: payment.payment_method === 'usdt'
        ? '退款请求已记录，请手动处理 USDT 退款'
        : '退款成功'
    });
  } catch (error) {
    console.error('退款错误:', error);
    res.status(500).json({ error: error.message || '退款失败' });
  }
});

// 更新订单备注 (管理员)
router.patch('/:id/notes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const db = getDb();

    // 检查订单是否存在
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 更新备注
    db.prepare(`
      UPDATE orders
      SET notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(notes || null, id);

    console.log(`订单备注已更新: ${id}`);

    res.json({
      success: true,
      message: '备注已更新'
    });
  } catch (error) {
    console.error('更新订单备注错误:', error);
    res.status(500).json({ error: '更新备注失败' });
  }
});

// 删除订单 (管理员)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    // 检查订单是否存在
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.status(404).json({ error: '订单不存在' });
    }

    // 检查订单状态
    if (order.payment_status === 'paid' && order.order_status !== 'refunded') {
      return res.status(400).json({ error: '已支付且未退款的订单无法删除' });
    }

    // 删除订单相关数据（使用事务）
    const deleteOrder = db.transaction(() => {
      // 删除发货记录
      db.prepare('DELETE FROM deliveries WHERE order_id = ?').run(id);

      // 删除订单项
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);

      // 删除支付记录
      db.prepare('DELETE FROM payments WHERE order_id = ?').run(id);

      // 删除订单
      db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    });

    deleteOrder();

    console.log(`订单已删除: ${id}`);

    res.json({
      success: true,
      message: '订单已删除'
    });
  } catch (error) {
    console.error('删除订单错误:', error);
    res.status(500).json({ error: '删除订单失败' });
  }
});

export default router;