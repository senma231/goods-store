import { v4 as uuidv4 } from 'uuid';
import getDb from '../database/db.js';
import { sendDeliveryEmail } from './email.js';
import { sendNotification } from './notification.js';

/**
 * 自动发货服务
 * 在订单支付成功后调用，自动分配虚拟商品并创建发货记录
 */
export async function deliverOrder(orderId) {
  const db = getDb();
  
  try {
    console.log(`开始处理订单发货: ${orderId}`);

    // 获取订单信息
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }

    // 检查订单状态
    if (order.payment_status !== 'paid') {
      throw new Error('订单未支付');
    }

    // 检查是否已经发货
    const existingDelivery = db.prepare('SELECT * FROM deliveries WHERE order_id = ?').get(orderId);
    if (existingDelivery) {
      console.log(`订单 ${orderId} 已经发货过了`);
      return { success: true, message: '订单已发货' };
    }

    // 获取订单商品
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    if (orderItems.length === 0) {
      throw new Error('订单没有商品');
    }

    const deliveries = [];

    // 为每个商品分配虚拟资产
    for (const item of orderItems) {
      for (let i = 0; i < item.quantity; i++) {
        // 查找可用的虚拟资产
        const asset = db.prepare(`
          SELECT * FROM virtual_assets 
          WHERE product_id = ? AND status = 'available'
          LIMIT 1
        `).get(item.product_id);

        if (!asset) {
          console.warn(`商品 ${item.product_name} 库存不足，跳过发货`);
          continue;
        }

        // 标记资产为已售出
        db.prepare(`
          UPDATE virtual_assets
          SET status = 'sold', order_id = ?, sold_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(orderId, asset.id);

        // 创建发货记录
        const deliveryId = uuidv4();
        db.prepare(`
          INSERT INTO deliveries (
            id, order_id, product_id, virtual_asset_id, delivery_email,
            delivery_method, content_type, content_data, status, sent_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).run(
          deliveryId,
          orderId,
          item.product_id,
          asset.id,
          order.contact_email,
          'email',
          asset.asset_type,
          JSON.stringify({
            product_name: item.product_name,
            asset_type: asset.asset_type,
            asset_value: asset.asset_value
          }),
          'sent'
        );

        deliveries.push({
          id: deliveryId,
          product_name: item.product_name,
          asset_type: asset.asset_type,
          asset_value: asset.asset_value
        });

        console.log(`✅ 已分配虚拟资产: ${asset.asset_value} 给订单 ${orderId}`);
      }
    }

    // 更新订单状态为已完成
    db.prepare(`
      UPDATE orders
      SET order_status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(orderId);

    console.log(`✅ 订单 ${orderId} 发货完成，共发货 ${deliveries.length} 个商品`);

    // 发送发货通知邮件
    try {
      const emailResult = await sendDeliveryEmail(order, deliveries);
      if (emailResult.success) {
        console.log(`✅ 发货通知邮件已发送到 ${order.contact_email}`);
      } else {
        console.warn(`⚠️ 发货通知邮件发送失败: ${emailResult.message || emailResult.error}`);
      }
    } catch (emailError) {
      console.error('发送邮件时出错:', emailError);
      // 邮件发送失败不影响发货流程
    }

    // 发送通知到配置的渠道（飞书、Telegram等）
    try {
      const notificationMessage = `📦 新订单发货通知\n\n订单号: ${order.order_number}\n客户邮箱: ${order.contact_email}\n订单金额: $${order.total_amount}\n发货数量: ${deliveries.length} 个商品\n发货时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

      const notificationResults = await sendNotification('order_delivered', notificationMessage);
      if (notificationResults.length > 0) {
        const successCount = notificationResults.filter(r => r.success).length;
        console.log(`✅ 发货通知已发送到 ${successCount}/${notificationResults.length} 个渠道`);
      }
    } catch (notificationError) {
      console.error('发送通知时出错:', notificationError);
      // 通知发送失败不影响发货流程
    }

    return {
      success: true,
      message: '发货成功',
      deliveries
    };

  } catch (error) {
    console.error(`订单 ${orderId} 发货失败:`, error);

    // 记录发货失败
    try {
      const deliveryId = uuidv4();
      const errorDetails = {
        error: error.message,
        timestamp: new Date().toISOString(),
        orderItems: orderItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity
        }))
      };

      db.prepare(`
        INSERT INTO deliveries (
          id, order_id, product_id, delivery_email,
          delivery_method, content_type, content_data, status, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        deliveryId,
        orderId,
        orderItems[0]?.product_id || '',
        order.contact_email,
        'email',
        'error',
        JSON.stringify(errorDetails),
        'failed',
        error.message
      );
    } catch (logError) {
      console.error('记录发货失败信息出错:', logError);
    }

    throw error;
  }
}

/**
 * 获取订单的发货记录
 */
export function getOrderDeliveries(orderId) {
  const db = getDb();
  return db.prepare('SELECT * FROM deliveries WHERE order_id = ?').all(orderId);
}

/**
 * 重试发货
 * 删除失败的发货记录，重新执行发货流程
 */
export async function retryDelivery(orderId) {
  const db = getDb();

  try {
    console.log(`开始重试订单发货: ${orderId}`);

    // 获取订单信息
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) {
      throw new Error('订单不存在');
    }

    // 检查订单支付状态
    if (order.payment_status !== 'paid') {
      throw new Error('订单未支付，无法发货');
    }

    // 删除失败的发货记录
    const failedDeliveries = db.prepare(`
      SELECT * FROM deliveries
      WHERE order_id = ? AND status = 'failed'
    `).all(orderId);

    if (failedDeliveries.length > 0) {
      db.prepare('DELETE FROM deliveries WHERE order_id = ? AND status = \'failed\'').run(orderId);
      console.log(`已删除 ${failedDeliveries.length} 条失败的发货记录`);
    }

    // 重新执行发货
    return await deliverOrder(orderId);

  } catch (error) {
    console.error(`重试发货失败: ${orderId}`, error);
    throw error;
  }
}

/**
 * 获取所有发货失败的订单
 */
export function getFailedDeliveries() {
  const db = getDb();

  try {
    const failedOrders = db.prepare(`
      SELECT DISTINCT
        o.id as order_id,
        o.order_number,
        o.contact_email,
        o.total_amount,
        o.payment_status,
        o.order_status,
        o.created_at,
        d.error_message,
        d.created_at as failed_at
      FROM orders o
      INNER JOIN deliveries d ON o.id = d.order_id
      WHERE d.status = 'failed'
      ORDER BY d.created_at DESC
    `).all();

    return failedOrders;
  } catch (error) {
    console.error('获取失败发货记录出错:', error);
    return [];
  }
}
