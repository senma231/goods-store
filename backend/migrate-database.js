/**
 * 独立的数据库迁移脚本
 * 用于添加商品发货方式和库存类型字段
 * 
 * 使用方法：
 * cd /var/www/goods-store/backend
 * node migrate-database.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 查找数据库文件
 */
function findDatabaseFile() {
  const possiblePaths = [
    join(__dirname, 'data/database.db'),
    join(__dirname, 'database.db'),
    join(__dirname, 'data/database.sqlite'),
    join(__dirname, 'database.sqlite'),
  ];

  console.log('🔍 查找数据库文件...');
  for (const path of possiblePaths) {
    console.log(`   检查: ${path}`);
    if (fs.existsSync(path)) {
      console.log(`✅ 找到数据库文件: ${path}\n`);
      return path;
    }
  }

  throw new Error('❌ 未找到数据库文件！请检查数据库位置。');
}

/**
 * 执行迁移
 */
function migrate() {
  try {
    const dbPath = findDatabaseFile();
    const db = new Database(dbPath);
    
    console.log('========================================');
    console.log('  数据库迁移：添加商品发货和库存字段');
    console.log('========================================\n');
    
    // 检查字段是否已存在
    const tableInfo = db.prepare("PRAGMA table_info(products)").all();
    const existingColumns = tableInfo.map(col => col.name);
    
    console.log(`📋 当前 products 表有 ${existingColumns.length} 个字段\n`);
    
    let addedCount = 0;
    
    // 添加 delivery_method 字段
    if (!existingColumns.includes('delivery_method')) {
      db.prepare(`
        ALTER TABLE products ADD COLUMN delivery_method TEXT DEFAULT 'auto'
      `).run();
      console.log('✅ 添加 delivery_method 字段');
      addedCount++;
    } else {
      console.log('⏭️  delivery_method 字段已存在');
    }
    
    // 添加 stock_type 字段
    if (!existingColumns.includes('stock_type')) {
      db.prepare(`
        ALTER TABLE products ADD COLUMN stock_type TEXT DEFAULT 'limited'
      `).run();
      console.log('✅ 添加 stock_type 字段');
      addedCount++;
    } else {
      console.log('⏭️  stock_type 字段已存在');
    }
    
    // 添加 total_stock 字段
    if (!existingColumns.includes('total_stock')) {
      db.prepare(`ALTER TABLE products ADD COLUMN total_stock INTEGER DEFAULT 0`).run();
      console.log('✅ 添加 total_stock 字段');
      addedCount++;
    } else {
      console.log('⏭️  total_stock 字段已存在');
    }
    
    // 添加 available_stock 字段
    if (!existingColumns.includes('available_stock')) {
      db.prepare(`ALTER TABLE products ADD COLUMN available_stock INTEGER DEFAULT 0`).run();
      console.log('✅ 添加 available_stock 字段');
      addedCount++;
    } else {
      console.log('⏭️  available_stock 字段已存在');
    }
    
    // 添加 sold_count 字段
    if (!existingColumns.includes('sold_count')) {
      db.prepare(`ALTER TABLE products ADD COLUMN sold_count INTEGER DEFAULT 0`).run();
      console.log('✅ 添加 sold_count 字段');
      addedCount++;
    } else {
      console.log('⏭️  sold_count 字段已存在');
    }
    
    // 添加 is_featured 字段
    if (!existingColumns.includes('is_featured')) {
      db.prepare(`ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT 0`).run();
      console.log('✅ 添加 is_featured 字段');
      addedCount++;
    } else {
      console.log('⏭️  is_featured 字段已存在');
    }
    
    // 添加 gallery_urls 字段
    if (!existingColumns.includes('gallery_urls')) {
      db.prepare(`ALTER TABLE products ADD COLUMN gallery_urls TEXT`).run();
      console.log('✅ 添加 gallery_urls 字段');
      addedCount++;
    } else {
      console.log('⏭️  gallery_urls 字段已存在');
    }
    
    // 添加 video_url 字段
    if (!existingColumns.includes('video_url')) {
      db.prepare(`ALTER TABLE products ADD COLUMN video_url TEXT`).run();
      console.log('✅ 添加 video_url 字段');
      addedCount++;
    } else {
      console.log('⏭️  video_url 字段已存在');
    }
    
    // 添加 meta_title 字段
    if (!existingColumns.includes('meta_title')) {
      db.prepare(`ALTER TABLE products ADD COLUMN meta_title TEXT`).run();
      console.log('✅ 添加 meta_title 字段');
      addedCount++;
    } else {
      console.log('⏭️  meta_title 字段已存在');
    }
    
    // 添加 meta_description 字段
    if (!existingColumns.includes('meta_description')) {
      db.prepare(`ALTER TABLE products ADD COLUMN meta_description TEXT`).run();
      console.log('✅ 添加 meta_description 字段');
      addedCount++;
    } else {
      console.log('⏭️  meta_description 字段已存在');
    }
    
    // 添加 view_count 字段
    if (!existingColumns.includes('view_count')) {
      db.prepare(`ALTER TABLE products ADD COLUMN view_count INTEGER DEFAULT 0`).run();
      console.log('✅ 添加 view_count 字段');
      addedCount++;
    } else {
      console.log('⏭️  view_count 字段已存在');
    }
    
    console.log(`\n📊 本次迁移添加了 ${addedCount} 个新字段`);
    
    // 迁移现有数据
    if (existingColumns.includes('stock_quantity') && addedCount > 0) {
      const result = db.prepare(`
        UPDATE products 
        SET total_stock = stock_quantity, 
            available_stock = stock_quantity
        WHERE (total_stock = 0 OR total_stock IS NULL) 
          AND (available_stock = 0 OR available_stock IS NULL)
      `).run();
      console.log(`✅ 迁移现有库存数据 (${result.changes} 条记录)`);
    }
    
    db.close();
    
    console.log('\n========================================');
    console.log('  🎉 迁移完成！');
    console.log('========================================\n');
    
  } catch (error) {
    console.error('\n❌ 迁移失败:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// 执行迁移
migrate();

