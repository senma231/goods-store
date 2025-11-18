#!/bin/bash

# 修复后端服务脚本

echo "=========================================="
echo "修复后端服务"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 1. 检查项目目录
log_info "检查项目目录..."
if [ ! -d "/var/www/goods-store/backend" ]; then
    log_error "后端目录不存在: /var/www/goods-store/backend"
    exit 1
fi

cd /var/www/goods-store/backend

# 2. 检查 Node.js
log_info "检查 Node.js..."
if ! command -v node &> /dev/null; then
    log_error "Node.js 未安装"
    exit 1
fi
log_info "Node.js 版本: $(node -v)"

# 3. 检查依赖
log_info "检查依赖..."
if [ ! -d "node_modules" ]; then
    log_warning "依赖未安装，正在安装..."
    npm install --omit=dev
fi

# 4. 检查 .env 文件
log_info "检查 .env 文件..."
if [ ! -f ".env" ]; then
    log_error ".env 文件不存在"
    log_info "创建默认 .env 文件..."
    cat > .env << 'EOF'
PORT=8787
NODE_ENV=production
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_PATH=./database/shop.db
CORS_ORIGIN=http://localhost
EOF
fi

log_info ".env 文件内容:"
cat .env
echo ""

# 5. 检查数据库目录
log_info "检查数据库目录..."
if [ ! -d "database" ]; then
    log_warning "数据库目录不存在，创建中..."
    mkdir -p database
fi

# 修复权限
log_info "修复文件权限..."
chown -R www-data:www-data /var/www/goods-store/backend
chmod 755 /var/www/goods-store/backend/database
if [ -f "database/shop.db" ]; then
    chmod 644 database/shop.db
fi

# 6. 测试后端启动
log_info "测试后端启动..."
log_warning "尝试直接启动后端（5秒测试）..."

# 临时启动后端查看错误
timeout 5 node src/server.js 2>&1 | tee /tmp/backend-test.log &
TEST_PID=$!

sleep 3

# 检查是否启动成功
if netstat -tuln | grep -q ":8787"; then
    log_info "✅ 后端启动成功！"
    kill $TEST_PID 2>/dev/null
else
    log_error "❌ 后端启动失败"
    log_error "错误日志:"
    cat /tmp/backend-test.log
    echo ""
    
    # 检查常见问题
    if grep -q "EADDRINUSE" /tmp/backend-test.log; then
        log_error "端口 8787 已被占用"
        log_info "占用端口的进程:"
        lsof -i :8787
    fi
    
    if grep -q "Cannot find module" /tmp/backend-test.log; then
        log_error "缺少依赖模块"
        log_info "重新安装依赖..."
        npm install --omit=dev
    fi
    
    if grep -q "database" /tmp/backend-test.log; then
        log_error "数据库错误"
        log_info "数据库文件权限:"
        ls -la database/
    fi
fi

# 7. 重启 systemd 服务
log_info "重启 systemd 服务..."
systemctl daemon-reload
systemctl restart goods-store-backend

sleep 2

# 8. 检查服务状态
log_info "检查服务状态..."
if systemctl is-active --quiet goods-store-backend; then
    log_info "✅ 服务运行中"
    systemctl status goods-store-backend --no-pager | head -20
else
    log_error "❌ 服务启动失败"
    log_error "查看详细日志:"
    journalctl -u goods-store-backend -n 50 --no-pager
fi

# 9. 测试 API
log_info "测试 API..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8787/health)
if [ "$HTTP_CODE" = "200" ]; then
    log_info "✅ API 响应正常 (HTTP $HTTP_CODE)"
else
    log_error "❌ API 响应异常 (HTTP $HTTP_CODE)"
fi

echo ""
echo "=========================================="
echo "修复完成"
echo "=========================================="

