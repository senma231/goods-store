#!/bin/bash

# 诊断脚本 - 检查部署问题

echo "=========================================="
echo "虚拟商品商城 - 部署诊断工具"
echo "=========================================="
echo ""

# 1. 检查后端服务状态
echo "1. 检查后端服务状态"
echo "----------------------------------------"
if systemctl is-active --quiet goods-store-backend; then
    echo "✅ 后端服务正在运行"
    systemctl status goods-store-backend --no-pager | head -15
else
    echo "❌ 后端服务未运行"
    echo ""
    echo "尝试启动服务..."
    systemctl start goods-store-backend
    sleep 2
    if systemctl is-active --quiet goods-store-backend; then
        echo "✅ 服务启动成功"
    else
        echo "❌ 服务启动失败，查看日志："
        journalctl -u goods-store-backend -n 50 --no-pager
    fi
fi
echo ""

# 2. 检查后端端口
echo "2. 检查后端端口 (8787)"
echo "----------------------------------------"
if netstat -tuln | grep -q ":8787"; then
    echo "✅ 端口 8787 正在监听"
    netstat -tuln | grep ":8787"
else
    echo "❌ 端口 8787 未监听"
fi
echo ""

# 3. 检查 Nginx 状态
echo "3. 检查 Nginx 状态"
echo "----------------------------------------"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx 正在运行"
else
    echo "❌ Nginx 未运行"
fi
echo ""

# 4. 检查 Nginx 配置
echo "4. 检查 Nginx 配置"
echo "----------------------------------------"
nginx -t
echo ""

# 5. 测试后端 API
echo "5. 测试后端 API"
echo "----------------------------------------"
echo "测试 /api/categories..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8787/api/categories

echo "测试 /api/settings/public..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:8787/api/settings/public
echo ""

# 6. 检查后端日志
echo "6. 最近的后端日志"
echo "----------------------------------------"
journalctl -u goods-store-backend -n 20 --no-pager
echo ""

# 7. 检查 Nginx 错误日志
echo "7. Nginx 错误日志"
echo "----------------------------------------"
if [ -f /var/log/nginx/error.log ]; then
    tail -20 /var/log/nginx/error.log
else
    echo "未找到 Nginx 错误日志"
fi
echo ""

# 8. 检查项目文件
echo "8. 检查项目文件"
echo "----------------------------------------"
if [ -d /var/www/goods-store ]; then
    echo "✅ 项目目录存在: /var/www/goods-store"
    ls -la /var/www/goods-store/
else
    echo "❌ 项目目录不存在"
fi
echo ""

# 9. 检查环境变量
echo "9. 检查后端环境变量"
echo "----------------------------------------"
if [ -f /var/www/goods-store/backend/.env ]; then
    echo "✅ .env 文件存在"
    echo "PORT=$(grep PORT /var/www/goods-store/backend/.env)"
else
    echo "❌ .env 文件不存在"
fi
echo ""

echo "=========================================="
echo "诊断完成"
echo "=========================================="

