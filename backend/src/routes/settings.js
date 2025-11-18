import express from 'express';
import { getDb } from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 获取公开设置
router.get('/public', (req, res) => {
  try {
    const db = getDb();
    const settings = db.prepare(`
      SELECT setting_key, setting_value, setting_type
      FROM site_settings
    `).all();

    // 返回数组格式（前端需要）
    res.json({ settings });
  } catch (error) {
    console.error('获取公开设置失败:', error);
    res.status(500).json({ error: '获取公开设置失败' });
  }
});

// 获取所有设置（管理员）
router.get('/admin/all', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { category } = req.query;

    let query = 'SELECT * FROM site_settings';
    const params = [];

    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }

    query += ' ORDER BY category, setting_key';

    const settings = db.prepare(query).all(...params);

    res.json({ settings });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 获取单个设置（管理员）
router.get('/admin/:key', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { key } = req.params;

    const setting = db.prepare('SELECT * FROM site_settings WHERE setting_key = ?').get(key);

    if (!setting) {
      return res.status(404).json({ error: '设置不存在' });
    }

    res.json({ setting });
  } catch (error) {
    console.error('获取设置失败:', error);
    res.status(500).json({ error: '获取设置失败' });
  }
});

// 创建或更新设置（管理员）
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { setting_key, setting_value, setting_type, description, category } = req.body;

    if (!setting_key) {
      return res.status(400).json({ error: '设置键不能为空' });
    }

    // 检查是否已存在
    const existing = db.prepare('SELECT id FROM site_settings WHERE setting_key = ?').get(setting_key);

    let setting;
    if (existing) {
      // 更新
      db.prepare(`
        UPDATE site_settings
        SET setting_value = ?, setting_type = ?, description = ?, category = ?, updated_at = datetime('now')
        WHERE setting_key = ?
      `).run(
        setting_value || null,
        setting_type || 'string',
        description || null,
        category || 'general',
        setting_key
      );

      setting = db.prepare('SELECT * FROM site_settings WHERE setting_key = ?').get(setting_key);
    } else {
      // 创建
      const result = db.prepare(`
        INSERT INTO site_settings (setting_key, setting_value, setting_type, description, category)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        setting_key,
        setting_value || null,
        setting_type || 'string',
        description || null,
        category || 'general'
      );

      setting = db.prepare('SELECT * FROM site_settings WHERE id = ?').get(result.lastInsertRowid);
    }

    res.json({ setting });
  } catch (error) {
    console.error('保存设置失败:', error);
    res.status(500).json({ error: '保存设置失败' });
  }
});

// 删除设置（管理员）
router.delete('/:key', authenticateToken, requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const { key } = req.params;

    const result = db.prepare('DELETE FROM site_settings WHERE setting_key = ?').run(key);

    if (result.changes === 0) {
      return res.status(404).json({ error: '设置不存在' });
    }

    res.json({ message: '设置已删除' });
  } catch (error) {
    console.error('删除设置失败:', error);
    res.status(500).json({ error: '删除设置失败' });
  }
});

export default router;

