import getDb from './src/database/db.js';

const db = getDb();

console.log('=== Products表结构 ===');
const schema = db.prepare("PRAGMA table_info(products)").all();
console.log(schema);

console.log('\n=== 示例商品数据 ===');
const products = db.prepare("SELECT * FROM products LIMIT 1").all();
console.log(products);

