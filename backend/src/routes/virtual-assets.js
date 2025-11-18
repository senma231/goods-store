import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDb from '../database/db.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// 获取商品的虚拟资产列表
router.get('/product/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { status } = req.query;

    const db = getDb();
    let query = 'SELECT * FROM virtual_assets WHERE product_id = ?';
    const params = [productId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const assets = db.prepare(query).all(...params);

    res.json({ assets });
  } catch (error) {
    console.error('获取虚拟资产列表错误:', error);
    res.status(500).json({ error: '获取虚拟资产列表失败' });
  }
});

// 批量添加虚拟资产
router.post('/batch', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { product_id, asset_type, asset_values } = req.body;

    if (!product_id || !asset_type || !Array.isArray(asset_values) || asset_values.length === 0) {
      return res.status(400).json({ error: '参数错误' });
    }

    const db = getDb();
    const insertStmt = db.prepare(`
      INSERT INTO virtual_assets (id, product_id, asset_type, asset_value)
      VALUES (?, ?, ?, ?)
    `);

    const assets = [];
    for (const value of asset_values) {
      const id = uuidv4();
      insertStmt.run(id, product_id, asset_type, value.trim());
      assets.push({ id, product_id, asset_type, asset_value: value.trim(), status: 'available' });
    }

    res.json({ 
      message: `成功添加 ${assets.length} 个虚拟资产`,
      assets 
    });
  } catch (error) {
    console.error('批量添加虚拟资产错误:', error);
    res.status(500).json({ error: '批量添加虚拟资产失败' });
  }
});

// 添加单个虚拟资产
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { product_id, asset_type, asset_value } = req.body;

    if (!product_id || !asset_type || !asset_value) {
      return res.status(400).json({ error: '参数错误' });
    }

    const db = getDb();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO virtual_assets (id, product_id, asset_type, asset_value)
      VALUES (?, ?, ?, ?)
    `).run(id, product_id, asset_type, asset_value);

    const asset = db.prepare('SELECT * FROM virtual_assets WHERE id = ?').get(id);

    res.json({ asset });
  } catch (error) {
    console.error('添加虚拟资产错误:', error);
    res.status(500).json({ error: '添加虚拟资产失败' });
  }
});

// 删除虚拟资产
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();

    const asset = db.prepare('SELECT * FROM virtual_assets WHERE id = ?').get(id);
    if (!asset) {
      return res.status(404).json({ error: '虚拟资产不存在' });
    }

    if (asset.status === 'sold') {
      return res.status(400).json({ error: '已售出的虚拟资产不能删除' });
    }

    db.prepare('DELETE FROM virtual_assets WHERE id = ?').run(id);

    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('删除虚拟资产错误:', error);
    res.status(500).json({ error: '删除虚拟资产失败' });
  }
});

// 获取商品库存统计
router.get('/stats/:productId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const db = getDb();

    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved
      FROM virtual_assets
      WHERE product_id = ?
    `).get(productId);

    res.json({ stats });
  } catch (error) {
    console.error('获取库存统计错误:', error);
    res.status(500).json({ error: '获取库存统计失败' });
  }
});

export default router;

