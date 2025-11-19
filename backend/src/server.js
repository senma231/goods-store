import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// 导入路由
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import categoriesRoutes from './routes/categories.js';
import ordersRoutes from './routes/orders.js';
import cartRoutes from './routes/cart.js';
import paymentsRoutes from './routes/payments.js';
import notificationChannelsRoutes from './routes/notification-channels.js';
import settingsRoutes from './routes/settings.js';
import virtualAssetsRoutes from './routes/virtual-assets.js';

// 初始化数据库
import initDatabase from './database/init.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8787;

// 确保必要的目录存在
const dataDir = path.join(__dirname, '../data');
const uploadsDir = path.join(__dirname, '../uploads');
[dataDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 初始化数据库
try {
  initDatabase();
} catch (error) {
  console.error('❌ 数据库初始化失败:', error);
}

// 中间件
app.use(helmet());
app.use(compression());

// CORS 配置 - 开发环境允许所有来源
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CORS_ORIGIN].filter(Boolean)  // 生产环境只允许配置的域名
    : true,  // 开发环境允许所有来源
  credentials: true
};

app.use(cors(corsOptions));

// ⚠️ 重要：Stripe Webhook 需要原始 body 来验证签名
// 参考：https://docs.stripe.com/webhooks/signature#verify-official-libraries
// 解决方案：条件性地应用 JSON 解析，跳过 webhook 路径

// 1. 为 Webhook 路由配置 raw body 解析
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));

// 2. 为其他所有路由配置 JSON 解析（跳过 webhook 路径）
// 注意：req.originalUrl 包含完整路径，req.path 只包含路由内的路径
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/stripe/webhook' || req.originalUrl.startsWith('/api/payments/stripe/webhook?')) {
    next();
  } else {
    express.json()(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(uploadsDir));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 限制100个请求
});
app.use('/api/', limiter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notification-channels', notificationChannelsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/virtual-assets', virtualAssetsRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message 
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 虚拟商品商城后端 API 已启动                            ║
║                                                            ║
║   📍 地址: http://localhost:${PORT}                        ║
║   🌍 环境: ${process.env.NODE_ENV || 'development'}        ║
║   📦 数据库: SQLite                                        ║
║                                                            ║
║   📚 API 文档:                                             ║
║      - 认证: /api/auth/*                                   ║
║      - 商品: /api/products/*                               ║
║      - 分类: /api/categories/*                             ║
║      - 订单: /api/orders/*                                 ║
║      - 购物车: /api/cart/*                                 ║
║      - 支付: /api/payments/*                               ║
║                                                            ║
║   🔐 管理员账号:                                           ║
║      邮箱: admin@shop.com                                  ║
║      密码: admin123                                        ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;

