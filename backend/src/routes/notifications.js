import express from 'express';
import { getDb } from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 获取所有通知（公开）
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const now = new Date().toISOString();

    const notifications = db.prepare(`
      SELECT * FROM notifications
      WHERE is_active = 1
        AND (start_time IS NULL OR start_time <= ?)
        AND (end_time IS NULL OR end_time >= ?)
      ORDER BY priority DESC, created_at DESC
    `).all(now, now);

    res.json({ notifications });
  } catch (error) {
    console.error('获取通知失败:', error);
    res.status(500).json({ error: '获取通知失败' });
  }
});

// 获取所有通知（管理员）
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const notifications = db.prepare(`
      SELECT * FROM notifications
      ORDER BY priority DESC, created_at DESC
    `).all();

    res.json({ notifications });
  } catch (error) {
    console.error('获取通知失败:', error);
    res.status(500).json({ error: '获取通知失败' });
  }
});

// 创建通知（管理员）
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { title, content, type, priority, start_time, end_time } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '标题和内容不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO notifications (title, content, type, priority, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, content, type || 'info', priority || 0, start_time || null, end_time || null);

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ notification });
  } catch (error) {
    console.error('创建通知失败:', error);
    res.status(500).json({ error: '创建通知失败' });
  }
});

// 更新通知（管理员）
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { title, content, type, is_active, priority, start_time, end_time } = req.body;

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (type !== undefined) {
      updates.push('type = ?');
      values.push(type);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }
    if (start_time !== undefined) {
      updates.push('start_time = ?');
      values.push(start_time);
    }
    if (end_time !== undefined) {
      updates.push('end_time = ?');
      values.push(end_time);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有要更新的字段' });
    }

    updates.push('updated_at = datetime("now")');
    values.push(id);

    db.prepare(`
      UPDATE notifications
      SET ${updates.join(', ')}
      WHERE id = ?
    `).run(...values);

    const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);

    if (!notification) {
      return res.status(404).json({ error: '通知不存在' });
    }

    res.json({ notification });
  } catch (error) {
    console.error('更新通知失败:', error);
    res.status(500).json({ error: '更新通知失败' });
  }
});

// 删除通知（管理员）
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    const result = db.prepare('DELETE FROM notifications WHERE id = ?').run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: '通知不存在' });
    }

    res.json({ message: '通知已删除' });
  } catch (error) {
    console.error('删除通知失败:', error);
    res.status(500).json({ error: '删除通知失败' });
  }
});

export default router;

