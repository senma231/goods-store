# 快速部署指南

## 🚀 一键部署命令

在您的服务器上执行以下命令即可开始部署:

```bash
wget https://raw.githubusercontent.com/senma231/goods-store/main/deploy.sh && sudo bash deploy.sh
```

或者使用 curl:

```bash
curl -O https://raw.githubusercontent.com/senma231/goods-store/main/deploy.sh && sudo bash deploy.sh
```

---

## 📋 部署前准备

### 1. 服务器要求
- ✅ Ubuntu 18.04+ / Debian 10+ / CentOS 7+
- ✅ 至少 1GB 内存
- ✅ 至少 10GB 硬盘空间
- ✅ 公网 IP 或域名
- ✅ Root 权限

### 2. 准备信息
在运行脚本前,请准备好以下信息:

- **域名**: 例如 `shop.example.com` (或使用服务器 IP)
- **Stripe Secret Key**: 从 [Stripe Dashboard](https://dashboard.stripe.com/apikeys) 获取
  - 测试环境: `sk_test_...`
  - 生产环境: `sk_live_...`
- **邮箱**: 用于 SSL 证书申请 (可选)

---

## 🎯 部署步骤

### 步骤 1: SSH 连接服务器
```bash
ssh root@your-server-ip
```

### 步骤 2: 下载并运行部署脚本
```bash
wget https://raw.githubusercontent.com/senma231/goods-store/main/deploy.sh
chmod +x deploy.sh
sudo bash deploy.sh
```

### 步骤 3: 按提示输入配置信息
脚本会依次询问:
1. 域名
2. 安装目录 (默认: `/var/www/goods-store`)
3. 后端端口 (默认: `8787`)
4. JWT Secret (可自动生成)
5. Stripe Secret Key
6. Stripe Webhook Secret (可选)
7. 是否配置 SSL

### 步骤 4: 等待部署完成
脚本会自动完成以下操作:
- ✅ 安装系统依赖 (Node.js, Nginx, pnpm)
- ✅ 克隆项目
- ✅ 安装项目依赖
- ✅ 初始化数据库
- ✅ 构建前端
- ✅ 配置 Nginx
- ✅ 配置 SSL (可选)
- ✅ 创建 Systemd 服务
- ✅ 启动服务并设置开机自启

### 步骤 5: 访问网站
部署完成后,访问您的域名:
- **前端**: `https://your-domain.com`
- **管理后台**: `https://your-domain.com/admin`

---

## 🔑 默认管理员账号

- **邮箱**: `admin@shop.com`
- **密码**: `admin123`

⚠️ **重要**: 首次登录后请立即修改密码!

---

## 🔧 部署后配置

### 1. 配置 Stripe Webhook

1. 登录 [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. 点击 "Add endpoint"
3. 输入 Webhook URL: `https://your-domain.com/api/payments/stripe/webhook`
4. 选择事件: `payment_intent.succeeded`
5. 复制 Webhook Secret
6. 更新服务器配置:
   ```bash
   nano /var/www/goods-store/backend/.env
   # 添加: STRIPE_WEBHOOK_SECRET=whsec_...
   pm2 restart goods-store-backend
   ```

### 2. 配置系统设置

登录管理后台,进入 "系统设置":
- ✅ 网站名称
- ✅ 联系邮箱
- ✅ USDT 收款地址
- ✅ 邮件服务器 (可选)

### 3. 配置通知渠道

进入 "通知管理" → "通知渠道":
- ✅ 飞书 Webhook
- ✅ Telegram Bot
- ✅ 微信企业号

### 4. 添加商品

1. 创建商品分类
2. 添加虚拟商品
3. 上传虚拟资产 (卡密、账号等)

---

## 📊 服务管理

### 查看服务状态
```bash
systemctl status goods-store
systemctl status nginx
```

### 查看日志
```bash
# 后端日志
journalctl -u goods-store -f

# Nginx 日志
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 重启服务
```bash
# 重启后端
systemctl restart goods-store

# 重启 Nginx
systemctl restart nginx
```

---

## 🔄 更新项目

```bash
cd /var/www/goods-store
git pull origin main
cd backend && npm install --omit=dev
cd ../virtual-goods-store && pnpm install && pnpm run build
systemctl restart goods-store
systemctl reload nginx
```

---

## 💾 备份数据

### 备份数据库
```bash
cp /var/www/goods-store/backend/data/database.db ~/backup/database-$(date +%Y%m%d).db
```

### 备份上传文件
```bash
tar -czf ~/backup/uploads-$(date +%Y%m%d).tar.gz /var/www/goods-store/backend/uploads/
```

### 自动备份脚本
```bash
# 创建备份脚本
cat > /root/backup-shop.sh << 'EOF'
#!/bin/bash
BACKUP_DIR=~/backup
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d)
cp /var/www/goods-store/backend/data/database.db $BACKUP_DIR/database-$DATE.db
tar -czf $BACKUP_DIR/uploads-$DATE.tar.gz /var/www/goods-store/backend/uploads/
# 删除 7 天前的备份
find $BACKUP_DIR -name "database-*.db" -mtime +7 -delete
find $BACKUP_DIR -name "uploads-*.tar.gz" -mtime +7 -delete
EOF

chmod +x /root/backup-shop.sh

# 添加到 crontab (每天凌晨 2 点备份)
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-shop.sh") | crontab -
```

---

## ❓ 常见问题

### Q: 部署失败怎么办?
**A**: 检查错误信息,常见原因:
- 网络连接问题
- 端口被占用
- 权限不足
- 系统不支持

### Q: 如何更换域名?
**A**: 
```bash
# 1. 更新 Nginx 配置
nano /etc/nginx/sites-available/goods-store
# 修改 server_name

# 2. 测试并重启
nginx -t
systemctl restart nginx

# 3. 重新申请 SSL (如果需要)
certbot --nginx -d new-domain.com
```

### Q: 如何修改端口?
**A**: 
```bash
# 1. 更新 .env
nano /var/www/goods-store/backend/.env
# 修改 PORT=新端口

# 2. 更新 Nginx 配置
nano /etc/nginx/sites-available/goods-store
# 修改 proxy_pass http://localhost:新端口

# 3. 重启服务
pm2 restart goods-store-backend
systemctl restart nginx
```

---

## 📞 获取帮助

- **文档**: [DEPLOY_SCRIPT_GUIDE.md](./DEPLOY_SCRIPT_GUIDE.md)
- **GitHub**: https://github.com/senma231/goods-store
- **Issues**: https://github.com/senma231/goods-store/issues

---

## ✅ 部署检查清单

- [ ] 服务器满足最低配置要求
- [ ] 已准备好域名或 IP
- [ ] 已获取 Stripe API Key
- [ ] 已运行部署脚本
- [ ] 网站可以正常访问
- [ ] 已登录管理后台
- [ ] 已修改默认密码
- [ ] 已配置 Stripe Webhook
- [ ] 已配置系统设置
- [ ] 已配置通知渠道
- [ ] 已添加商品分类和商品
- [ ] 已设置自动备份

---

**🎉 祝您部署顺利!**

