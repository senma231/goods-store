import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import getDb from '../database/db.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// 获取购物车
router.get('/', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];

    if (!userId && !sessionId) {
      return res.json({ items: [] });
    }

    let query = `
      SELECT ci.id, ci.product_id, ci.quantity, ci.created_at, ci.updated_at,
             p.id as product_id, p.name as product_name, p.price as product_price,
             p.image_url as product_image_url, p.description as product_description
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE
    `;

    const rawItems = userId
      ? db.prepare(query + 'ci.user_id = ?').all(userId)
      : db.prepare(query + 'ci.session_id = ?').all(sessionId);

    // 转换为前端期望的格式
    const items = rawItems.map(item => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      created_at: item.created_at,
      updated_at: item.updated_at,
      product: {
        id: item.product_id,
        name: item.product_name,
        price: item.product_price,
        image_url: item.product_image_url,
        description: item.product_description
      }
    }));

    res.json({ items });
  } catch (error) {
    console.error('获取购物车错误:', error);
    res.status(500).json({ error: '获取购物车失败' });
  }
});

// 添加到购物车
router.post('/add', optionalAuth, async (req, res) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    const db = getDb();
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'] || uuidv4();
    
    if (!product_id) {
      return res.status(400).json({ error: '商品ID不能为空' });
    }
    
    // 检查商品是否存在
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(product_id);
    if (!product) {
      return res.status(404).json({ error: '商品不存在' });
    }
    
    // 检查是否已在购物车
    const existingItem = userId
      ? db.prepare('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?').get(userId, product_id)
      : db.prepare('SELECT * FROM cart_items WHERE session_id = ? AND product_id = ?').get(sessionId, product_id);
    
    if (existingItem) {
      // 更新数量
      const newQuantity = existingItem.quantity + quantity;
      db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newQuantity, existingItem.id);
    } else {
      // 新增
      const cartItemId = uuidv4();
      db.prepare(`
        INSERT INTO cart_items (id, user_id, session_id, product_id, quantity)
        VALUES (?, ?, ?, ?, ?)
      `).run(cartItemId, userId || null, userId ? null : sessionId, product_id, quantity);
    }
    
    res.json({ message: '已添加到购物车', session_id: sessionId });
  } catch (error) {
    console.error('添加购物车错误:', error);
    res.status(500).json({ error: '添加购物车失败' });
  }
});

// 更新购物车项数量
router.put('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const db = getDb();
    
    if (quantity < 1) {
      return res.status(400).json({ error: '数量必须大于0' });
    }
    
    db.prepare('UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(quantity, id);
    
    res.json({ message: '购物车已更新' });
  } catch (error) {
    console.error('更新购物车错误:', error);
    res.status(500).json({ error: '更新购物车失败' });
  }
});

// 删除购物车项
router.delete('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDb();
    
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(id);
    
    res.json({ message: '已从购物车移除' });
  } catch (error) {
    console.error('删除购物车项错误:', error);
    res.status(500).json({ error: '删除购物车项失败' });
  }
});

// 清空购物车
router.delete('/', optionalAuth, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user?.id;
    const sessionId = req.headers['x-session-id'];
    
    if (userId) {
      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    } else if (sessionId) {
      db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(sessionId);
    }
    
    res.json({ message: '购物车已清空' });
  } catch (error) {
    console.error('清空购物车错误:', error);
    res.status(500).json({ error: '清空购物车失败' });
  }
});

export default router;

