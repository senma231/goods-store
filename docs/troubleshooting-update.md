# 更新后页面没有变化 - 故障排查指南

## 问题现象
通过 GitHub 拉取最新代码后，前端页面没有任何变化，新功能没有生效。

---

## 🔍 原因分析

### 1. 前端没有重新构建 ⚠️ **最常见原因**
- 只拉取了代码，但没有运行 `pnpm run build`
- 浏览器访问的是旧的构建文件

### 2. 浏览器缓存
- 浏览器缓存了旧的 JS/CSS 文件
- 需要强制刷新

### 3. Nginx 缓存
- Nginx 可能缓存了静态文件
- 需要清除 Nginx 缓存

### 4. 构建文件没有正确生成
- 构建过程出错
- dist 目录没有更新

---

## ✅ 解决方案

### 方案 1: 使用自动更新脚本（推荐）

#### 步骤 1: 上传更新脚本到服务器
```bash
# 在本地运行（将脚本上传到服务器）
scp scripts/update-server.sh root@your-server:/var/www/goods-store/
```

#### 步骤 2: 在服务器上运行脚本
```bash
# SSH 登录服务器
ssh root@your-server

# 添加执行权限
chmod +x /var/www/goods-store/update-server.sh

# 运行更新脚本
cd /var/www/goods-store
./update-server.sh
```

---

### 方案 2: 手动更新（逐步执行）

#### 步骤 1: SSH 登录服务器
```bash
ssh root@your-server
```

#### 步骤 2: 拉取最新代码
```bash
cd /var/www/goods-store
git pull origin main

# 查看最新提交
git log --oneline -3
```

#### 步骤 3: 清理旧的构建文件 ⚠️ **重要**
```bash
cd virtual-goods-store
rm -rf dist
rm -rf node_modules/.vite
```

#### 步骤 4: 安装依赖
```bash
pnpm install
```

#### 步骤 5: 构建前端（生产模式）⚠️ **关键步骤**
```bash
BUILD_MODE=prod pnpm run build
```

**验证构建是否成功**：
```bash
# 检查 dist 目录是否存在
ls -la dist

# 检查构建文件大小
du -sh dist

# 应该看到类似这样的输出：
# 2.5M    dist
```

#### 步骤 6: 重启服务
```bash
cd ..
systemctl restart goods-store
```

#### 步骤 7: 验证服务状态
```bash
systemctl status goods-store

# 查看日志
journalctl -u goods-store -n 50
```

---

### 方案 3: 清除浏览器缓存

#### Chrome/Edge
- Windows: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

#### Firefox
- Windows: `Ctrl + Shift + Delete`
- Mac: `Cmd + Shift + Delete`

#### Safari
- Mac: `Cmd + Option + E`

---

## 🔍 验证更新是否成功

### 1. 检查前端构建文件
```bash
# 在服务器上运行
cd /var/www/goods-store/virtual-goods-store/dist

# 查看文件修改时间（应该是最近的时间）
ls -lt | head -10

# 查看 index.html 的修改时间
stat index.html
```

### 2. 检查浏览器加载的文件
1. 打开浏览器开发者工具（F12）
2. 切换到 "Network" 标签
3. 勾选 "Disable cache"
4. 刷新页面（Ctrl+R）
5. 查看加载的 JS 文件：
   - 文件名应该包含新的哈希值
   - 例如：`index-abc123.js` → `index-def456.js`

### 3. 检查新功能是否可用
- 打开管理后台
- 进入订单管理
- 点击订单号，应该弹出订单详情窗口
- 在移动端视图下，导航栏应该显示汉堡菜单

---

## 🚨 常见错误和解决方法

### 错误 1: `pnpm: command not found`
```bash
# 安装 pnpm
npm install -g pnpm
```

### 错误 2: 构建失败 - 内存不足
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=4096" pnpm run build
```

### 错误 3: 权限错误
```bash
# 使用 sudo
sudo pnpm run build

# 或者修改文件所有权
sudo chown -R $USER:$USER /var/www/goods-store
```

### 错误 4: 端口被占用
```bash
# 查看占用端口的进程
lsof -i :8787

# 杀死进程
kill -9 <PID>

# 重启服务
systemctl restart goods-store
```

---

## 📋 完整更新检查清单

- [ ] 代码已拉取（`git pull`）
- [ ] 旧的 dist 目录已删除（`rm -rf dist`）
- [ ] 依赖已安装（`pnpm install`）
- [ ] 前端已构建（`BUILD_MODE=prod pnpm run build`）
- [ ] dist 目录已生成且包含文件
- [ ] 服务已重启（`systemctl restart goods-store`）
- [ ] 服务运行正常（`systemctl status goods-store`）
- [ ] 浏览器缓存已清除（Ctrl+Shift+R）
- [ ] 新功能可以正常使用

---

## 💡 预防措施

### 1. 创建自动化部署脚本
使用提供的 `update-server.sh` 脚本，避免手动操作遗漏步骤。

### 2. 设置版本号
在前端添加版本号显示，方便确认是否更新成功。

### 3. 使用 CI/CD
考虑使用 GitHub Actions 自动部署，避免手动操作。

---

## 🆘 仍然无法解决？

如果按照以上步骤操作后仍然无法解决，请提供以下信息：

1. 服务器上的 git log 输出
2. 构建日志（`pnpm run build` 的完整输出）
3. 服务状态（`systemctl status goods-store`）
4. 浏览器控制台的错误信息
5. dist 目录的文件列表（`ls -la dist`）

