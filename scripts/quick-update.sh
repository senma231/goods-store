#!/bin/bash

# 快速更新脚本（需要在服务器上以 root 或有权限的用户运行）

set -e

echo "========================================="
echo "快速更新虚拟商城"
echo "========================================="

cd /var/www/goods-store

# 拉取代码
echo "📥 拉取最新代码..."
git pull origin main

# 构建前端
echo "🏗️  构建前端..."
cd virtual-goods-store
rm -rf dist
pnpm install
BUILD_MODE=prod pnpm run build

# 重启服务
echo "🔄 重启服务..."
cd ..
systemctl restart goods-store

echo "✅ 更新完成！"
echo "💡 如果页面没有更新，请清除浏览器缓存（Ctrl+Shift+R）"

