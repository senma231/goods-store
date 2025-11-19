import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../../data/database.db');
const db = new Database(dbPath);

console.log('开始迁移：添加订单备注字段...\n');

// 添加 notes 字段
try {
  db.prepare(`
    ALTER TABLE orders
    ADD COLUMN notes TEXT
  `).run();
  console.log('✅ 添加 notes 字段');
} catch (error) {
  if (error.message.includes('duplicate column')) {
    console.log('⏭️  notes 字段已存在');
  } else {
    console.error('❌ 添加 notes 字段失败:', error.message);
  }
}

db.close();
console.log('\n✅ 迁移完成！');

