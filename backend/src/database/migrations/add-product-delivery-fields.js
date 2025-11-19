import getDb from '../db.js';

/**
 * 数据库迁移：添加商品发货方式和库存类型字段
 * 
 * 新增字段：
 * - delivery_method: 发货方式 (auto/manual)
 * - stock_type: 库存类型 (unlimited/limited)
 * - total_stock: 总库存
 * - available_stock: 可用库存
 * - sold_count: 销量
 * - is_featured: 是否精选
 * - gallery_urls: 图片集
 * - video_url: 视频链接
 * - meta_title: SEO标题
 * - meta_description: SEO描述
 */

export function up() {
  const db = getDb();
  
  console.log('开始迁移：添加商品发货方式和库存类型字段...');
  
  try {
    // 检查字段是否已存在
    const tableInfo = db.prepare("PRAGMA table_info(products)").all();
    const existingColumns = tableInfo.map(col => col.name);
    
    // 添加 delivery_method 字段
    if (!existingColumns.includes('delivery_method')) {
      db.prepare(`
        ALTER TABLE products ADD COLUMN delivery_method TEXT DEFAULT 'auto' 
        CHECK(delivery_method IN ('auto', 'manual'))
      `).run();
      console.log('✅ 添加 delivery_method 字段');
    }
    
    // 添加 stock_type 字段
    if (!existingColumns.includes('stock_type')) {
      db.prepare(`
        ALTER TABLE products ADD COLUMN stock_type TEXT DEFAULT 'limited' 
        CHECK(stock_type IN ('unlimited', 'limited'))
      `).run();
      console.log('✅ 添加 stock_type 字段');
    }
    
    // 添加 total_stock 字段
    if (!existingColumns.includes('total_stock')) {
      db.prepare(`ALTER TABLE products ADD COLUMN total_stock INTEGER DEFAULT 0`).run();
      console.log('✅ 添加 total_stock 字段');
    }
    
    // 添加 available_stock 字段
    if (!existingColumns.includes('available_stock')) {
      db.prepare(`ALTER TABLE products ADD COLUMN available_stock INTEGER DEFAULT 0`).run();
      console.log('✅ 添加 available_stock 字段');
    }
    
    // 添加 sold_count 字段
    if (!existingColumns.includes('sold_count')) {
      db.prepare(`ALTER TABLE products ADD COLUMN sold_count INTEGER DEFAULT 0`).run();
      console.log('✅ 添加 sold_count 字段');
    }
    
    // 添加 is_featured 字段
    if (!existingColumns.includes('is_featured')) {
      db.prepare(`ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT 0`).run();
      console.log('✅ 添加 is_featured 字段');
    }
    
    // 添加 gallery_urls 字段
    if (!existingColumns.includes('gallery_urls')) {
      db.prepare(`ALTER TABLE products ADD COLUMN gallery_urls TEXT`).run();
      console.log('✅ 添加 gallery_urls 字段');
    }
    
    // 添加 video_url 字段
    if (!existingColumns.includes('video_url')) {
      db.prepare(`ALTER TABLE products ADD COLUMN video_url TEXT`).run();
      console.log('✅ 添加 video_url 字段');
    }
    
    // 添加 meta_title 字段
    if (!existingColumns.includes('meta_title')) {
      db.prepare(`ALTER TABLE products ADD COLUMN meta_title TEXT`).run();
      console.log('✅ 添加 meta_title 字段');
    }
    
    // 添加 meta_description 字段
    if (!existingColumns.includes('meta_description')) {
      db.prepare(`ALTER TABLE products ADD COLUMN meta_description TEXT`).run();
      console.log('✅ 添加 meta_description 字段');
    }
    
    // 添加 view_count 字段
    if (!existingColumns.includes('view_count')) {
      db.prepare(`ALTER TABLE products ADD COLUMN view_count INTEGER DEFAULT 0`).run();
      console.log('✅ 添加 view_count 字段');
    }
    
    // 迁移现有数据：将 stock_quantity 同步到 total_stock 和 available_stock
    if (existingColumns.includes('stock_quantity')) {
      db.prepare(`
        UPDATE products 
        SET total_stock = stock_quantity, 
            available_stock = stock_quantity
        WHERE total_stock = 0 AND available_stock = 0
      `).run();
      console.log('✅ 迁移现有库存数据');
    }
    
    console.log('✅ 迁移完成！');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  }
}

export function down() {
  console.log('回滚迁移：删除商品发货方式和库存类型字段...');
  // SQLite 不支持 DROP COLUMN，需要重建表
  console.log('⚠️  SQLite 不支持删除列，请手动处理');
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  up();
}

