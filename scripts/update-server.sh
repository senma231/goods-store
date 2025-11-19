#!/bin/bash

# 虚拟商城服务器更新脚本
# 用途：拉取最新代码、构建前端、重启服务

set -e  # 遇到错误立即退出

echo "========================================="
echo "开始更新虚拟商城..."
echo "========================================="

# 1. 进入项目目录
cd /var/www/goods-store || exit 1
echo "✅ 进入项目目录: $(pwd)"

# 2. 拉取最新代码
echo ""
echo "📥 拉取最新代码..."
sudo git fetch origin
sudo git reset --hard origin/main
echo "✅ 代码已更新到最新版本"

# 3. 显示最新的提交
echo ""
echo "📋 最新提交记录："
git log --oneline -3

# 4. 安装/更新后端依赖
echo ""
echo "📦 检查后端依赖..."
cd backend
if [ -f "package.json" ]; then
    sudo npm install --production
    echo "✅ 后端依赖已更新"
fi

# 5. 运行数据库迁移（如果存在）
echo ""
echo "🗄️  检查数据库迁移..."
if [ -f "src/database/migrations/add-order-notes-field.js" ]; then
    if ! sudo node src/database/migrations/add-order-notes-field.js 2>/dev/null; then
        echo "⚠️  数据库迁移可能已经运行过，跳过"
    else
        echo "✅ 数据库迁移完成"
    fi
fi

# 6. 构建前端
echo ""
echo "🏗️  构建前端..."
cd ../virtual-goods-store

# 清理旧的构建文件
echo "🧹 清理旧的构建文件..."
sudo rm -rf dist
sudo rm -rf node_modules/.vite

# 安装依赖
echo "📦 安装前端依赖..."
sudo pnpm install

# 构建（生产模式）
echo "🔨 开始构建前端（生产模式）..."
sudo BUILD_MODE=prod pnpm run build

# 检查构建是否成功
if [ ! -d "dist" ]; then
    echo "❌ 前端构建失败！dist 目录不存在"
    exit 1
fi

echo "✅ 前端构建完成"
echo "📊 构建文件大小："
du -sh dist

# 7. 重启服务
echo ""
echo "🔄 重启服务..."
cd ..
sudo systemctl restart goods-store

# 等待服务启动
sleep 3

# 8. 检查服务状态
echo ""
echo "🔍 检查服务状态..."
if sudo systemctl is-active --quiet goods-store; then
    echo "✅ 服务运行正常"
else
    echo "❌ 服务启动失败！"
    echo "查看日志："
    sudo journalctl -u goods-store -n 20 --no-pager
    exit 1
fi

# 9. 显示最新日志
echo ""
echo "📋 最新日志（最后10行）："
sudo journalctl -u goods-store -n 10 --no-pager

# 10. 完成
echo ""
echo "========================================="
echo "✅ 更新完成！"
echo "========================================="
echo ""
echo "🌐 访问地址："
echo "   前端: https://shop.senma.io"
echo "   管理后台: https://shop.senma.io/admin"
echo ""
echo "💡 提示："
echo "   - 如果页面没有更新，请清除浏览器缓存（Ctrl+Shift+R 或 Cmd+Shift+R）"
echo "   - 查看完整日志: sudo journalctl -u goods-store -f"
echo "   - 查看服务状态: sudo systemctl status goods-store"
echo ""

