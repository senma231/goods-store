# 自动部署脚本使用指南

## 📋 脚本功能

`deploy.sh` 是一个全自动的交互式部署脚本,可以一键部署虚拟商品商城到您的独立服务器。

### ✨ 主要功能

1. ✅ **系统检测**: 自动检测系统架构和发行版
2. ✅ **依赖检查**: 检查并安装所需依赖 (Node.js, Nginx, PM2, Git)
3. ✅ **项目部署**: 自动从 GitHub 克隆项目并安装依赖
4. ✅ **交互配置**: 通过交互式问答获取域名、端口等配置
5. ✅ **数据库初始化**: 自动创建数据库表和默认管理员账号
6. ✅ **前端构建**: 自动构建前端静态文件
7. ✅ **Nginx 配置**: 自动配置反向代理和静态文件服务
8. ✅ **SSL 证书**: 可选自动申请 Let's Encrypt SSL 证书
9. ✅ **PM2 管理**: 使用 PM2 管理后端进程,支持自动重启
10. ✅ **Systemd 服务**: 创建 systemd 服务作为备用方案
11. ✅ **防火墙配置**: 自动配置防火墙规则

---

## 🖥️ 支持的系统

- ✅ Ubuntu 18.04+
- ✅ Debian 10+
- ✅ CentOS 7+
- ✅ RHEL 7+
- ✅ Fedora 30+

---

## 📦 系统要求

### 最低配置
- CPU: 1 核
- 内存: 1GB
- 硬盘: 10GB
- 网络: 公网 IP 或域名

### 推荐配置
- CPU: 2 核
- 内存: 2GB
- 硬盘: 20GB
- 网络: 公网 IP + 域名

---

## 🚀 快速开始

### 步骤 1: 下载脚本

```bash
# 方法 1: 直接从 GitHub 下载
wget https://raw.githubusercontent.com/senma231/goods-store/main/deploy.sh

# 方法 2: 克隆整个仓库
git clone https://github.com/senma231/goods-store.git
cd goods-store
```

### 步骤 2: 添加执行权限

```bash
chmod +x deploy.sh
```

### 步骤 3: 运行脚本

```bash
sudo bash deploy.sh
```

---

## 📝 交互式配置说明

脚本运行时会询问以下信息:

### 1. 域名配置
```
请输入域名 (例: shop.example.com): 
```
- 输入您的域名,例如: `shop.example.com`
- 如果没有域名,可以使用服务器 IP 地址

### 2. 安装目录
```
请输入安装目录 [默认: /var/www/goods-store]: 
```
- 直接回车使用默认目录
- 或输入自定义目录,例如: `/home/www/shop`

### 3. 后端端口
```
请输入后端端口 [默认: 8787]: 
```
- 直接回车使用默认端口 8787
- 或输入自定义端口,例如: `3000`

### 4. JWT Secret
```
请输入 JWT Secret (留空自动生成): 
```
- 直接回车自动生成随机密钥
- 或输入自定义密钥 (建议至少 32 位)

### 5. Stripe API Key
```
请输入 Stripe Secret Key (sk_test_... 或 sk_live_...): 
```
- 输入您的 Stripe Secret Key
- 测试环境: `sk_test_...`
- 生产环境: `sk_live_...`

### 6. Stripe Webhook Secret (可选)
```
请输入 Stripe Webhook Secret (whsec_..., 可选): 
```
- 如果已配置 Webhook,输入 Webhook Secret
- 否则直接回车跳过,稍后在 Stripe Dashboard 配置

### 7. SSL 证书配置
```
是否配置 SSL 证书? (y/n) [默认: n]: 
```
- 输入 `y` 自动申请 Let's Encrypt 免费证书
- 输入 `n` 跳过 SSL 配置 (可以稍后手动配置)

如果选择配置 SSL:
```
请输入邮箱 (用于 Let's Encrypt): 
```
- 输入您的邮箱地址,用于接收证书到期提醒

### 8. 确认配置
```
确认以上配置? (y/n): 
```
- 检查所有配置信息
- 输入 `y` 开始部署
- 输入 `n` 取消部署

---

## 📊 部署流程

脚本会按以下顺序执行:

1. ✅ 检查 root 权限
2. ✅ 检测系统架构和发行版
3. ✅ 检查系统依赖
4. ✅ 安装缺失的依赖 (Node.js, Nginx, PM2, Git)
5. ✅ 获取用户配置信息
6. ✅ 从 GitHub 克隆项目
7. ✅ 安装后端和前端依赖
8. ✅ 配置环境变量 (.env)
9. ✅ 初始化数据库
10. ✅ 构建前端静态文件
11. ✅ 配置 Nginx 反向代理
12. ✅ 配置 SSL 证书 (可选)
13. ✅ 配置 PM2 进程管理
14. ✅ 创建 Systemd 服务
15. ✅ 配置防火墙规则
16. ✅ 显示部署信息

---

## 🎯 部署完成后

### 默认管理员账号
- **邮箱**: `admin@shop.com`
- **密码**: `admin123`

⚠️ **重要**: 首次登录后请立即修改密码!

### 访问网站
- **前端**: `http://your-domain.com` 或 `https://your-domain.com`
- **管理后台**: `http://your-domain.com/admin`

### 服务管理命令

#### PM2 命令
```bash
# 查看所有服务状态
pm2 status

# 查看后端日志
pm2 logs goods-store-backend

# 重启后端
pm2 restart goods-store-backend

# 停止后端
pm2 stop goods-store-backend

# 启动后端
pm2 start goods-store-backend
```

#### Nginx 命令
```bash
# 查看状态
systemctl status nginx

# 重启
systemctl restart nginx

# 停止
systemctl stop nginx

# 启动
systemctl start nginx

# 测试配置
nginx -t
```

#### Systemd 服务 (备用)
```bash
# 启动
systemctl start goods-store

# 停止
systemctl stop goods-store

# 重启
systemctl restart goods-store

# 查看状态
systemctl status goods-store

# 开机自启
systemctl enable goods-store
```

---

## 📁 重要文件位置

| 文件/目录 | 路径 | 说明 |
|----------|------|------|
| 项目根目录 | `/var/www/goods-store` | 默认安装目录 |
| 后端配置 | `/var/www/goods-store/backend/.env` | 环境变量配置 |
| 数据库 | `/var/www/goods-store/backend/data/database.db` | SQLite 数据库 |
| 上传文件 | `/var/www/goods-store/backend/uploads/` | 用户上传的文件 |
| 前端构建 | `/var/www/goods-store/virtual-goods-store/dist/` | 前端静态文件 |
| Nginx 配置 | `/etc/nginx/sites-available/goods-store` | Nginx 站点配置 |
| PM2 配置 | `/var/www/goods-store/backend/ecosystem.config.js` | PM2 配置文件 |
| 后端日志 | `/var/www/goods-store/backend/logs/` | PM2 日志目录 |

---

## 🔧 常见问题

### Q1: 脚本运行失败怎么办?
**A**: 检查以下几点:
1. 是否使用 `sudo` 运行脚本
2. 服务器是否有网络连接
3. 查看错误信息,根据提示解决

### Q2: 如何更新项目?
**A**: 
```bash
cd /var/www/goods-store
git pull origin main
cd backend && npm install
cd ../virtual-goods-store && npm install && npm run build
pm2 restart goods-store-backend
```

### Q3: 如何备份数据?
**A**: 
```bash
# 备份数据库
cp /var/www/goods-store/backend/data/database.db ~/backup/database-$(date +%Y%m%d).db

# 备份上传文件
tar -czf ~/backup/uploads-$(date +%Y%m%d).tar.gz /var/www/goods-store/backend/uploads/
```

### Q4: 如何配置 Stripe Webhook?
**A**: 
1. 登录 Stripe Dashboard
2. 进入 Developers → Webhooks
3. 添加 Endpoint: `https://your-domain.com/api/payments/stripe/webhook`
4. 选择事件: `payment_intent.succeeded`
5. 复制 Webhook Secret 到 `.env` 文件

### Q5: 如何查看日志?
**A**: 
```bash
# PM2 日志
pm2 logs goods-store-backend

# Nginx 访问日志
tail -f /var/log/nginx/access.log

# Nginx 错误日志
tail -f /var/log/nginx/error.log
```

---

## 🛡️ 安全建议

1. ✅ 修改默认管理员密码
2. ✅ 配置 SSL 证书 (HTTPS)
3. ✅ 定期备份数据库
4. ✅ 定期更新系统和依赖
5. ✅ 配置防火墙规则
6. ✅ 使用强密码
7. ✅ 定期检查日志

---

## 📞 获取帮助

- GitHub Issues: https://github.com/senma231/goods-store/issues
- 文档: 查看项目 `docs/` 目录

---

## 📄 许可证

MIT License

