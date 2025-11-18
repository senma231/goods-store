import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 获取所有分类（公开）
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT * FROM categories
      WHERE is_active = 1
      ORDER BY sort_order ASC, name ASC
    `).all();

    res.json({ categories });
  } catch (error) {
    console.error('获取分类列表错误:', error);
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

// 获取所有分类（管理员，包括未激活的）
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const categories = db.prepare(`
      SELECT * FROM categories
      ORDER BY sort_order ASC, name ASC
    `).all();

    res.json({ categories });
  } catch (error) {
    console.error('获取分类列表错误:', error);
    res.status(500).json({ error: '获取分类列表失败' });
  }
});

// 创建分类（管理员）
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { name, slug, description, sort_order, is_active } = req.body;

    if (!name) {
      return res.status(400).json({ error: '分类名称不能为空' });
    }

    const id = uuidv4();
    const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-');

    db.prepare(`
      INSERT INTO categories (id, name, slug, description, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      categorySlug,
      description || null,
      sort_order !== undefined ? sort_order : 0,
      is_active !== undefined ? (is_active ? 1 : 0) : 1
    );

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

    res.status(201).json({ category });
  } catch (error) {
    console.error('创建分类错误:', error);
    res.status(500).json({ error: '创建分类失败' });
  }
});

// 更新分类（管理员）
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { name, slug, description, sort_order, is_active } = req.body;

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    db.prepare(`
      UPDATE categories
      SET name = ?, slug = ?, description = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name !== undefined ? name : category.name,
      slug !== undefined ? slug : category.slug,
      description !== undefined ? description : category.description,
      sort_order !== undefined ? sort_order : category.sort_order,
      is_active !== undefined ? (is_active ? 1 : 0) : category.is_active,
      id
    );

    const updatedCategory = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);

    res.json({ category: updatedCategory });
  } catch (error) {
    console.error('更新分类错误:', error);
    res.status(500).json({ error: '更新分类失败' });
  }
});

// 删除分类（管理员）
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    // 检查是否有商品使用此分类
    const productsCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id);

    if (productsCount.count > 0) {
      return res.status(400).json({ error: `无法删除：有 ${productsCount.count} 个商品使用此分类` });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);

    res.json({ message: '分类删除成功' });
  } catch (error) {
    console.error('删除分类错误:', error);
    res.status(500).json({ error: '删除分类失败' });
  }
});

// 根据 slug 获取单个分类
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const db = getDb();
    
    const category = db.prepare('SELECT * FROM categories WHERE slug = ? AND is_active = 1').get(slug);
    
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }
    
    res.json({ category });
  } catch (error) {
    console.error('获取分类详情错误:', error);
    res.status(500).json({ error: '获取分类详情失败' });
  }
});

export default router;

