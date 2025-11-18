import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../data/database.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// 确保数据目录存在
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据库
export function initDatabase() {
  console.log('📦 初始化数据库...');
  
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  
  // 读取并执行 schema
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);
  
  console.log('✅ 数据库表创建成功');
  
  // 插入初始数据
  seedData(db);
  
  db.close();
  console.log('✅ 数据库初始化完成');
}

// 插入初始数据
function seedData(db) {
  // 检查是否已有数据
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count > 0) {
    console.log('⚠️  数据库已有数据，跳过初始化');
    return;
  }
  
  console.log('📝 插入初始数据...');
  
  // 创建管理员账户
  const adminId = uuidv4();
  const adminPassword = bcrypt.hashSync('admin123', 10);
  
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(adminId, 'admin@shop.com', adminPassword, '管理员', 'admin');
  
  console.log('✅ 管理员账户创建成功');
  console.log('   邮箱: admin@shop.com');
  console.log('   密码: admin123');
  
  // 创建示例分类
  const categories = [
    { id: uuidv4(), name: '游戏账号', slug: 'game-accounts', description: '各类游戏账号' },
    { id: uuidv4(), name: '软件激活码', slug: 'software-keys', description: '正版软件激活码' },
    { id: uuidv4(), name: '会员充值', slug: 'memberships', description: '各类会员充值' },
    { id: uuidv4(), name: '虚拟货币', slug: 'virtual-currency', description: '游戏币、点券等' }
  ];
  
  const insertCategory = db.prepare(`
    INSERT INTO categories (id, name, slug, description, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  categories.forEach((cat, index) => {
    insertCategory.run(cat.id, cat.name, cat.slug, cat.description, index, 1);
  });
  
  console.log('✅ 示例分类创建成功');
  
  // 创建示例商品
  const products = [
    {
      id: uuidv4(),
      name: 'Steam 钱包充值码 $10',
      slug: 'steam-wallet-10',
      category_id: categories[1].id,
      description: 'Steam 官方钱包充值码，可用于购买游戏和DLC',
      short_description: 'Steam $10 充值码',
      price: 10.00,
      original_price: 12.00,
      stock_quantity: 100
    },
    {
      id: uuidv4(),
      name: 'Netflix 高级会员 1个月',
      slug: 'netflix-premium-1month',
      category_id: categories[2].id,
      description: 'Netflix 高级会员账号，支持4K画质，4个设备同时观看',
      short_description: 'Netflix 高级会员',
      price: 15.99,
      original_price: 19.99,
      stock_quantity: 50
    }
  ];
  
  const insertProduct = db.prepare(`
    INSERT INTO products (id, name, slug, category_id, description, short_description, price, original_price, stock_quantity, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  products.forEach(product => {
    insertProduct.run(
      product.id, product.name, product.slug, product.category_id,
      product.description, product.short_description, product.price,
      product.original_price, product.stock_quantity, 1
    );
  });
  
  console.log('✅ 示例商品创建成功');
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
}

export default initDatabase;

