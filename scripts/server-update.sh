#!/bin/bash

# 服务器更新脚本
# 用途：一键更新商城系统到最新版本

set -e  # 遇到错误立即退出

echo "=========================================="
echo "  虚拟商品商城 - 服务器更新脚本"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="/var/www/goods-store"

# 检查是否在正确的目录
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}❌ 错误：项目目录不存在: $PROJECT_DIR${NC}"
    exit 1
fi

cd $PROJECT_DIR

echo -e "${YELLOW}📋 本次更新内容：${NC}"
echo "  1. 商品发货方式选择（自动发货/手动发货）"
echo "  2. 库存类型优化（有限库存/无限库存）"
echo "  3. 库存显示优化（9999+显示）"
echo ""

# 确认更新
read -p "是否继续更新？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  更新已取消${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}步骤 1/7: 备份数据库...${NC}"
BACKUP_FILE="backend/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)"
sudo cp backend/database.sqlite $BACKUP_FILE
echo -e "${GREEN}✅ 数据库已备份到: $BACKUP_FILE${NC}"

echo ""
echo -e "${GREEN}步骤 2/7: 停止服务...${NC}"
sudo systemctl stop goods-store
echo -e "${GREEN}✅ 服务已停止${NC}"

echo ""
echo -e "${GREEN}步骤 3/7: 拉取最新代码...${NC}"
sudo git fetch origin
sudo git pull origin main
echo -e "${GREEN}✅ 代码已更新${NC}"

echo ""
echo -e "${GREEN}步骤 4/7: 运行数据库迁移...${NC}"
cd backend
node src/database/migrations/add-product-delivery-fields.js
cd ..
echo -e "${GREEN}✅ 数据库迁移完成${NC}"

echo ""
echo -e "${GREEN}步骤 5/7: 安装依赖...${NC}"
cd virtual-goods-store
sudo pnpm install
echo -e "${GREEN}✅ 依赖安装完成${NC}"

echo ""
echo -e "${GREEN}步骤 6/7: 构建前端...${NC}"
sudo pnpm run build
cd ..
echo -e "${GREEN}✅ 前端构建完成${NC}"

echo ""
echo -e "${GREEN}步骤 7/7: 启动服务...${NC}"
sudo systemctl start goods-store
sleep 3
echo -e "${GREEN}✅ 服务已启动${NC}"

echo ""
echo -e "${GREEN}=========================================="
echo "  验证更新结果"
echo "==========================================${NC}"

# 检查服务状态
if sudo systemctl is-active --quiet goods-store; then
    echo -e "${GREEN}✅ 后端服务运行正常${NC}"
else
    echo -e "${RED}❌ 后端服务启动失败${NC}"
    echo "查看日志: sudo journalctl -u goods-store -n 50"
    exit 1
fi

# 测试 API
if curl -s http://localhost:8787/api/health > /dev/null; then
    echo -e "${GREEN}✅ API 响应正常${NC}"
else
    echo -e "${RED}❌ API 无响应${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}=========================================="
echo "  🎉 更新完成！"
echo "==========================================${NC}"
echo ""
echo "📋 后续操作："
echo "  1. 访问管理后台检查新功能"
echo "  2. 进入商品管理 -> 编辑商品 -> 查看发货方式选项"
echo "  3. 检查前端库存显示是否为 9999+"
echo ""
echo "📚 相关文档："
echo "  - 功能说明: docs/product-delivery-and-stock-guide.md"
echo "  - 更新指南: docs/server-update-guide.md"
echo ""
echo "🔍 查看服务日志："
echo "  sudo journalctl -u goods-store -f"
echo ""
echo "📞 如有问题，请查看日志或联系技术支持"
echo ""

