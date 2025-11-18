import express from 'express';
import getDb from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 获取所有商品（支持分页和筛选）
router.get('/', async (req, res) => {
  try {
    const { category, page = 1, limit = 20, active = 'true' } = req.query;
    const db = getDb();
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    
    if (active === 'true') {
      query += ' AND is_active = 1';
    }
    
    if (category) {
      query += ' AND category_id = ?';
      params.push(category);
    }
    
    query += ' ORDER BY sort_order ASC, created_at DESC';
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));
    
    const products = db.prepare(query).all(...params);
    
    // 获取总数
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1';
    const countParams = [];
    if (active === 'true') {
      countQuery += ' AND is_active = 1';
    }
    if (category) {
      countQuery += ' AND category_id = ?';
      countParams.push(category);
    }
    const { total } = db.prepare(countQuery).get(...countParams);
    
    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取商品列表错误:', error);
    res.status(500).json({ error: '获取商品列表失败' });
  }
});

// 根据 slug 获取单个商品
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const db = getDb();
    
    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ? AND p.is_active = 1
    `).get(slug);
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    res.json({ product });
  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.status(500).json({ error: '获取商品详情失败' });
  }
});

// 根据 ID 获取单个商品
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    const product = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `).get(id);
    
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    res.json({ product });
  } catch (error) {
    console.error('获取商品详情错误:', error);
    res.status(500).json({ error: '获取商品详情失败' });
  }
});

// 创建商品（需要管理员权限）
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name, slug, category_id, description, short_description,
      price, original_price, stock_quantity,
      stock_type, total_stock, available_stock, is_featured,
      gallery_urls, video_url, meta_title, meta_description
    } = req.body;

    if (!name || !slug || !price) {
      return res.status(400).json({ error: '商品名称、slug 和价格不能为空' });
    }

    const db = getDb();
    const { v4: uuidv4 } = await import('uuid');
    const productId = uuidv4();

    db.prepare(`
      INSERT INTO products (
        id, name, slug, category_id, description, short_description,
        price, original_price, stock_quantity,
        stock_type, total_stock, available_stock, is_featured,
        gallery_urls, video_url, meta_title, meta_description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      productId, name, slug, category_id || null, description || null, short_description || null,
      price, original_price || null, stock_quantity || 0,
      stock_type || 'limited', total_stock || 0, available_stock || 0, is_featured || 0,
      gallery_urls || null, video_url || null, meta_title || null, meta_description || null
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    res.status(201).json({ product });
  } catch (error) {
    console.error('创建商品错误:', error);
    res.status(500).json({ error: '创建商品失败' });
  }
});

// 更新商品（需要管理员权限）
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const db = getDb();
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }

    const allowedFields = [
      'name', 'slug', 'category_id', 'description', 'short_description',
      'price', 'original_price', 'image_url', 'stock_quantity', 'sort_order', 'is_active',
      'stock_type', 'total_stock', 'available_stock', 'sold_count', 'view_count', 'is_featured',
      'gallery_urls', 'video_url', 'meta_title', 'meta_description'
    ];
    const updateFields = [];
    const updateValues = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '没有可更新的字段' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    db.prepare(`UPDATE products SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

    const updatedProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.json({ product: updatedProduct });
  } catch (error) {
    console.error('更新商品错误:', error);
    res.status(500).json({ error: '更新商品失败' });
  }
});

// 删除商品（需要管理员权限）
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);

    res.json({ message: '商品已删除' });
  } catch (error) {
    console.error('删除商品错误:', error);
    res.status(500).json({ error: '删除商品失败' });
  }
});

export default router;

