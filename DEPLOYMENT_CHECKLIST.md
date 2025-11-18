# 部署清单 (Deployment Checklist)

## ✅ 已完成的任务

### 1. ✅ 项目文件整理
- [x] 创建 `archive/` 归档文件夹
- [x] 移动所有总结文档到 `archive/docs/`
- [x] 移动测试报告到 `archive/test-reports/`
- [x] 移动 Cloudflare 迁移文件到 `archive/migration-files/`
- [x] 移动图片文件到 `archive/images/`
- [x] 移动非核心文件到归档

### 2. ✅ 项目完整性检查
- [x] 后端核心文件完整
  - [x] `backend/package.json`
  - [x] `backend/src/server.js`
  - [x] 所有路由文件
  - [x] 所有服务文件
- [x] 前端核心文件完整
  - [x] `virtual-goods-store/package.json`
  - [x] `virtual-goods-store/index.html`
  - [x] `virtual-goods-store/vite.config.ts`
  - [x] 所有页面和组件
- [x] 文档文件完整
  - [x] `README.md`
  - [x] `README-STANDALONE-DEPLOYMENT.md`
  - [x] `docs/` 目录下的所有文档

### 3. ✅ Git 配置
- [x] 创建 `.gitignore` 文件
  - [x] 排除 `node_modules/`
  - [x] 排除 `.env` 文件
  - [x] 排除数据库文件 (`*.sqlite`)
  - [x] 排除上传文件 (`backend/uploads/*`)
  - [x] 排除构建输出 (`dist/`, `build/`)
  - [x] 排除归档文件夹 (`archive/`)
  - [x] 排除所有总结和测试报告文件
  - [x] 排除浏览器截图 (`.browser_screenshots/`)
- [x] 初始化 Git 仓库
- [x] 配置 Git 用户为 `senma231`
- [x] 创建 `.gitkeep` 文件保留空目录

### 4. ✅ GitHub 推送
- [x] 添加远程仓库: `https://github.com/senma231/goods-store.git`
- [x] 创建初始提交
- [x] 推送到 `main` 分支
- [x] 验证推送成功

---

## 📋 部署到独立服务器的步骤

### 前置要求
- [ ] 服务器已安装 Node.js >= 16
- [ ] 服务器已安装 Git
- [ ] 服务器已配置防火墙（开放端口 8787 和 5173，或使用 Nginx 反向代理）
- [ ] 已准备好域名（可选）

### 步骤 1: 克隆仓库
```bash
# SSH 到服务器
ssh user@your-server-ip

# 克隆仓库
git clone https://github.com/senma231/goods-store.git
cd goods-store
```

### 步骤 2: 安装依赖
```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../virtual-goods-store
npm install
```

### 步骤 3: 配置环境变量
```bash
# 创建后端 .env 文件
cd ../backend
cp .env.example .env
nano .env
```

编辑 `.env` 文件：
```env
PORT=8787
JWT_SECRET=your-secure-jwt-secret-key-here
STRIPE_SECRET_KEY=sk_live_...  # 生产环境使用 live key
STRIPE_WEBHOOK_SECRET=whsec_...  # Stripe Webhook Secret
```

### 步骤 4: 构建前端
```bash
cd ../virtual-goods-store
npm run build
```

### 步骤 5: 配置 Nginx（推荐）
创建 Nginx 配置文件 `/etc/nginx/sites-available/goods-store`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/goods-store/virtual-goods-store/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:8787;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/goods-store /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 步骤 6: 使用 PM2 运行后端（推荐）
```bash
# 安装 PM2
npm install -g pm2

# 启动后端
cd /path/to/goods-store/backend
pm2 start src/server.js --name goods-store-backend

# 设置开机自启
pm2 startup
pm2 save
```

### 步骤 7: 配置 SSL（推荐）
```bash
# 使用 Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 步骤 8: 配置 Stripe Webhook
1. 登录 Stripe Dashboard
2. 进入 Developers → Webhooks
3. 添加 Endpoint: `https://your-domain.com/api/payments/stripe/webhook`
4. 选择事件: `payment_intent.succeeded`
5. 复制 Webhook Secret 到 `.env` 文件

---

## 🔍 验证部署

### 检查后端
```bash
# 检查后端是否运行
pm2 status

# 查看后端日志
pm2 logs goods-store-backend

# 测试 API
curl http://localhost:8787/health
```

### 检查前端
访问: `https://your-domain.com`

### 检查功能
- [ ] 用户注册/登录
- [ ] 浏览商品
- [ ] 添加到购物车
- [ ] 创建订单
- [ ] Stripe 支付
- [ ] USDT 支付
- [ ] 管理后台登录
- [ ] 通知系统

---

## 📊 项目统计

- **总文件数**: 87 个核心文件
- **代码行数**: 22,911 行
- **归档文件**: 已移动到 `archive/` 文件夹
- **Git 仓库**: https://github.com/senma231/goods-store.git
- **分支**: `main`
- **提交**: 1 个初始提交

---

## 📝 注意事项

1. **环境变量**: 确保生产环境使用安全的密钥
2. **数据库**: SQLite 适合小型项目，大型项目建议迁移到 PostgreSQL/MySQL
3. **备份**: 定期备份 `backend/database.sqlite` 和 `backend/uploads/`
4. **监控**: 使用 PM2 监控后端进程
5. **日志**: 定期检查 PM2 日志和 Nginx 日志
6. **更新**: 定期从 GitHub 拉取更新

---

## 🎉 完成状态

- ✅ 项目文件已整理
- ✅ 项目完整性已确认
- ✅ `.gitignore` 已创建
- ✅ GitHub 仓库已推送
- ⏳ 等待部署到独立服务器

**下一步**: 按照上述步骤部署到您的独立服务器！

