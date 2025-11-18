import express from 'express';
import crypto from 'crypto';
import getDb from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { sendFeishuNotification, sendTelegramNotification, sendWecomNotification } from '../services/notification.js';

const router = express.Router();

// 获取所有通知渠道（管理员）
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const channels = db.prepare(`
      SELECT * FROM notification_channels
      ORDER BY created_at DESC
    `).all();

    // 解析 JSON 字段
    const parsedChannels = channels.map(channel => ({
      ...channel,
      is_enabled: Boolean(channel.is_enabled),
      config: JSON.parse(channel.config || '{}'),
      events: JSON.parse(channel.events || '[]')
    }));

    res.json({ channels: parsedChannels });
  } catch (error) {
    console.error('获取通知渠道失败:', error);
    res.status(500).json({ error: '获取通知渠道失败' });
  }
});

// 创建通知渠道（管理员）
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { name, channel_type, is_enabled, config, events, description } = req.body;

    console.log('创建通知渠道请求:', { name, channel_type, is_enabled, config, events, description });

    if (!name || !channel_type) {
      return res.status(400).json({ error: '名称和类型不能为空' });
    }

    // 生成 UUID
    const id = crypto.randomUUID().replace(/-/g, '');

    const configStr = JSON.stringify(config || {});
    const eventsStr = JSON.stringify(events || []);
    const isEnabledValue = is_enabled !== undefined ? (is_enabled ? 1 : 0) : 1;

    console.log('准备插入数据:', { id, name, channel_type, isEnabledValue, configStr, eventsStr, description });

    db.prepare(`
      INSERT INTO notification_channels (id, name, channel_type, is_enabled, config, events, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      channel_type,
      isEnabledValue,
      configStr,
      eventsStr,
      description || null
    );

    const channel = db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(id);

    console.log('通知渠道创建成功:', channel);

    res.status(201).json({
      channel: {
        ...channel,
        is_enabled: Boolean(channel.is_enabled),
        config: JSON.parse(channel.config),
        events: JSON.parse(channel.events)
      }
    });
  } catch (error) {
    console.error('创建通知渠道失败:', error);
    console.error('错误堆栈:', error.stack);
    res.status(500).json({ error: '创建通知渠道失败: ' + error.message });
  }
});

// 更新通知渠道（管理员）
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, channel_type, is_enabled, config, events, description } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (channel_type !== undefined) {
      updates.push('channel_type = ?');
      values.push(channel_type);
    }
    if (is_enabled !== undefined) {
      updates.push('is_enabled = ?');
      values.push(is_enabled ? 1 : 0);
    }
    if (config !== undefined) {
      updates.push('config = ?');
      values.push(JSON.stringify(config));
    }
    if (events !== undefined) {
      updates.push('events = ?');
      values.push(JSON.stringify(events));
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`
      UPDATE notification_channels
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    const channel = db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(id);

    if (!channel) {
      return res.status(404).json({ error: '通知渠道不存在' });
    }

    res.json({
      channel: {
        ...channel,
        is_enabled: Boolean(channel.is_enabled),
        config: JSON.parse(channel.config),
        events: JSON.parse(channel.events)
      }
    });
  } catch (error) {
    console.error('更新通知渠道失败:', error);
    res.status(500).json({ error: '更新通知渠道失败' });
  }
});

// 删除通知渠道（管理员）
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const result = db.prepare('DELETE FROM notification_channels WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '通知渠道不存在' });
    }

    res.json({ message: '通知渠道已删除' });
  } catch (error) {
    console.error('删除通知渠道失败:', error);
    res.status(500).json({ error: '删除通知渠道失败' });
  }
});

// 测试通知渠道（管理员）
router.post('/:id/test', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const channel = db.prepare('SELECT * FROM notification_channels WHERE id = ?').get(id);

    if (!channel) {
      return res.status(404).json({ error: '通知渠道不存在' });
    }

    const config = JSON.parse(channel.config || '{}');
    const testMessage = `🔔 测试通知\n\n这是来自虚拟商品商城的测试消息。\n渠道名称: ${channel.name}\n测试时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;

    let result;
    switch (channel.channel_type) {
      case 'feishu':
        if (!config.webhook_url) {
          return res.status(400).json({ error: 'Webhook URL 未配置' });
        }
        result = await sendFeishuNotification(config.webhook_url, testMessage);
        break;

      case 'telegram':
        if (!config.bot_token || !config.chat_id) {
          return res.status(400).json({ error: 'Bot Token 或 Chat ID 未配置' });
        }
        result = await sendTelegramNotification(config.bot_token, config.chat_id, testMessage);
        break;

      case 'wecom':
        if (!config.webhook_url) {
          return res.status(400).json({ error: 'Webhook URL 未配置' });
        }
        result = await sendWecomNotification(config.webhook_url, testMessage);
        break;

      default:
        return res.status(400).json({ error: '不支持的渠道类型' });
    }

    if (result.success) {
      res.json({
        success: true,
        message: '测试通知发送成功！请检查您的通知渠道。'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '测试通知发送失败',
        error: result.error
      });
    }
  } catch (error) {
    console.error('测试通知失败:', error);
    res.status(500).json({ error: '测试通知失败: ' + error.message });
  }
});

export default router;

