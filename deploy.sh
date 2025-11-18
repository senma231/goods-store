#!/bin/bash

#==============================================================================
# 虚拟商品商城 - 自动部署脚本
# Virtual Goods Store - Auto Deployment Script
#==============================================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 打印标题
print_header() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
    echo ""
}

# 检查是否以 root 运行
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "请使用 root 权限运行此脚本"
        log_info "使用命令: sudo bash deploy.sh"
        exit 1
    fi
}

# 检测系统架构和发行版
detect_system() {
    print_header "检测系统信息"
    
    # 检测架构
    ARCH=$(uname -m)
    log_info "系统架构: $ARCH"
    
    # 检测发行版
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
        log_info "操作系统: $NAME $VERSION"
    else
        log_error "无法检测操作系统"
        exit 1
    fi
    
    # 支持的系统检查
    case $OS in
        ubuntu|debian)
            PKG_MANAGER="apt"
            ;;
        centos|rhel|fedora)
            PKG_MANAGER="yum"
            ;;
        *)
            log_error "不支持的操作系统: $OS"
            log_info "支持的系统: Ubuntu, Debian, CentOS, RHEL, Fedora"
            exit 1
            ;;
    esac
    
    log_success "系统检测完成"
}

# 检查系统依赖
check_dependencies() {
    print_header "检查系统依赖"
    
    MISSING_DEPS=()
    
    # 检查 Git
    if ! command -v git &> /dev/null; then
        log_warning "Git 未安装"
        MISSING_DEPS+=("git")
    else
        log_success "Git 已安装: $(git --version)"
    fi
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_warning "Node.js 未安装"
        MISSING_DEPS+=("nodejs")
    else
        NODE_VERSION=$(node -v)
        log_success "Node.js 已安装: $NODE_VERSION"
        
        # 检查版本是否 >= 16
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -lt 16 ]; then
            log_warning "Node.js 版本过低 (需要 >= 16.x)"
            MISSING_DEPS+=("nodejs")
        fi
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_warning "npm 未安装"
        MISSING_DEPS+=("npm")
    else
        log_success "npm 已安装: $(npm -v)"
    fi
    
    # 检查 Nginx
    if ! command -v nginx &> /dev/null; then
        log_warning "Nginx 未安装"
        MISSING_DEPS+=("nginx")
    else
        log_success "Nginx 已安装: $(nginx -v 2>&1)"
    fi
    
    # 检查 PM2
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 未安装"
        MISSING_DEPS+=("pm2")
    else
        log_success "PM2 已安装: $(pm2 -v)"
    fi
    
    # 检查 Certbot (可选)
    if ! command -v certbot &> /dev/null; then
        log_warning "Certbot 未安装 (SSL 证书工具,可选)"
    else
        log_success "Certbot 已安装"
    fi
    
    if [ ${#MISSING_DEPS[@]} -eq 0 ]; then
        log_success "所有依赖已安装"
        return 0
    else
        log_warning "缺少以下依赖: ${MISSING_DEPS[*]}"
        return 1
    fi
}

# 安装系统依赖
install_dependencies() {
    print_header "安装系统依赖"

    log_info "更新软件包列表..."
    if [ "$PKG_MANAGER" = "apt" ]; then
        apt update -y
    elif [ "$PKG_MANAGER" = "yum" ]; then
        yum update -y
    fi

    # 安装基础工具
    log_info "安装基础工具..."
    if [ "$PKG_MANAGER" = "apt" ]; then
        apt install -y curl wget git build-essential
    elif [ "$PKG_MANAGER" = "yum" ]; then
        yum install -y curl wget git gcc-c++ make
    fi

    # 安装 Node.js (使用 NodeSource)
    if [[ " ${MISSING_DEPS[@]} " =~ " nodejs " ]]; then
        log_info "安装 Node.js 18.x..."
        if [ "$PKG_MANAGER" = "apt" ]; then
            curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
            apt install -y nodejs
        elif [ "$PKG_MANAGER" = "yum" ]; then
            curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
            yum install -y nodejs
        fi
        log_success "Node.js 安装完成: $(node -v)"
    fi

    # 安装 Nginx
    if [[ " ${MISSING_DEPS[@]} " =~ " nginx " ]]; then
        log_info "安装 Nginx..."
        if [ "$PKG_MANAGER" = "apt" ]; then
            apt install -y nginx
        elif [ "$PKG_MANAGER" = "yum" ]; then
            yum install -y nginx
        fi
        systemctl enable nginx
        log_success "Nginx 安装完成"
    fi

    # 安装 PM2
    if [[ " ${MISSING_DEPS[@]} " =~ " pm2 " ]]; then
        log_info "安装 PM2..."
        npm install -g pm2
        log_success "PM2 安装完成: $(pm2 -v)"
    fi

    log_success "所有依赖安装完成"
}

# 获取用户输入
get_user_input() {
    print_header "配置部署参数"

    # 域名
    read -p "请输入域名 (例: shop.example.com): " DOMAIN
    while [ -z "$DOMAIN" ]; do
        log_error "域名不能为空"
        read -p "请输入域名: " DOMAIN
    done
    log_info "域名: $DOMAIN"

    # 安装目录
    read -p "请输入安装目录 [默认: /var/www/goods-store]: " INSTALL_DIR
    INSTALL_DIR=${INSTALL_DIR:-/var/www/goods-store}
    log_info "安装目录: $INSTALL_DIR"

    # 后端端口
    read -p "请输入后端端口 [默认: 8787]: " BACKEND_PORT
    BACKEND_PORT=${BACKEND_PORT:-8787}
    log_info "后端端口: $BACKEND_PORT"

    # JWT Secret
    read -p "请输入 JWT Secret (留空自动生成): " JWT_SECRET
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 32)
        log_info "已自动生成 JWT Secret"
    fi

    # Stripe API Key
    read -p "请输入 Stripe Secret Key (sk_test_... 或 sk_live_...): " STRIPE_SECRET_KEY
    while [ -z "$STRIPE_SECRET_KEY" ]; do
        log_error "Stripe Secret Key 不能为空"
        read -p "请输入 Stripe Secret Key: " STRIPE_SECRET_KEY
    done

    # Stripe Webhook Secret
    read -p "请输入 Stripe Webhook Secret (whsec_..., 可选): " STRIPE_WEBHOOK_SECRET

    # 是否配置 SSL
    read -p "是否配置 SSL 证书? (y/n) [默认: n]: " SETUP_SSL
    SETUP_SSL=${SETUP_SSL:-n}

    if [ "$SETUP_SSL" = "y" ] || [ "$SETUP_SSL" = "Y" ]; then
        read -p "请输入邮箱 (用于 Let's Encrypt): " SSL_EMAIL
        while [ -z "$SSL_EMAIL" ]; do
            log_error "邮箱不能为空"
            read -p "请输入邮箱: " SSL_EMAIL
        done
    fi

    # 确认信息
    echo ""
    log_info "========== 配置确认 =========="
    log_info "域名: $DOMAIN"
    log_info "安装目录: $INSTALL_DIR"
    log_info "后端端口: $BACKEND_PORT"
    log_info "JWT Secret: ${JWT_SECRET:0:10}..."
    log_info "Stripe Key: ${STRIPE_SECRET_KEY:0:15}..."
    log_info "配置 SSL: $SETUP_SSL"
    echo ""

    read -p "确认以上配置? (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
        log_error "部署已取消"
        exit 1
    fi
}

# 克隆项目
clone_project() {
    print_header "克隆项目"

    # 创建安装目录
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "目录已存在: $INSTALL_DIR"
        read -p "是否删除并重新克隆? (y/n): " REMOVE_DIR
        if [ "$REMOVE_DIR" = "y" ] || [ "$REMOVE_DIR" = "Y" ]; then
            rm -rf "$INSTALL_DIR"
            log_info "已删除旧目录"
        else
            log_error "部署已取消"
            exit 1
        fi
    fi

    mkdir -p "$(dirname "$INSTALL_DIR")"

    log_info "克隆项目..."
    git clone https://github.com/senma231/goods-store.git "$INSTALL_DIR"

    cd "$INSTALL_DIR"
    log_success "项目克隆完成"
}

# 安装项目依赖
install_project_dependencies() {
    print_header "安装项目依赖"

    cd "$INSTALL_DIR"

    # 安装后端依赖
    log_info "安装后端依赖..."
    cd backend
    npm install --production
    log_success "后端依赖安装完成"

    # 安装前端依赖
    log_info "安装前端依赖..."
    cd ../virtual-goods-store
    npm install
    log_success "前端依赖安装完成"

    cd "$INSTALL_DIR"
}

# 配置环境变量
configure_environment() {
    print_header "配置环境变量"

    cd "$INSTALL_DIR/backend"

    # 创建 .env 文件
    cat > .env << EOF
# 服务器配置
PORT=$BACKEND_PORT
NODE_ENV=production

# JWT 配置
JWT_SECRET=$JWT_SECRET

# Stripe 配置
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET

# 数据库配置
DATABASE_PATH=./data/database.db

# 邮件配置 (可选)
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=your-email@example.com
# SMTP_PASS=your-password
# SMTP_FROM=noreply@example.com

# 通知配置 (可选)
# FEISHU_WEBHOOK_URL=
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_CHAT_ID=
# WECHAT_WEBHOOK_URL=
EOF

    log_success "环境变量配置完成"
}

# 初始化数据库
initialize_database() {
    print_header "初始化数据库"

    cd "$INSTALL_DIR/backend"

    # 创建数据目录
    mkdir -p data

    # 运行数据库初始化脚本
    log_info "创建数据库表..."
    node src/database/init.js

    log_success "数据库初始化完成"

    # 提示创建管理员账号
    log_warning "请记住以下默认管理员账号:"
    log_info "邮箱: admin@shop.com"
    log_info "密码: admin123"
    log_warning "首次登录后请立即修改密码!"
}

# 构建前端
build_frontend() {
    print_header "构建前端"

    cd "$INSTALL_DIR/virtual-goods-store"

    # 更新 API 地址
    log_info "配置 API 地址..."
    if [ "$SETUP_SSL" = "y" ] || [ "$SETUP_SSL" = "Y" ]; then
        API_URL="https://$DOMAIN/api"
    else
        API_URL="http://$DOMAIN/api"
    fi

    # 创建环境变量文件
    cat > .env.production << EOF
VITE_API_URL=$API_URL
EOF

    log_info "构建前端..."
    npm run build

    log_success "前端构建完成"
}

# 配置 Nginx
configure_nginx() {
    print_header "配置 Nginx"

    # 创建 Nginx 配置文件
    cat > /etc/nginx/sites-available/goods-store << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # 前端静态文件
    location / {
        root $INSTALL_DIR/virtual-goods-store/dist;
        try_files \$uri \$uri/ /index.html;

        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 后端 API
    location /api {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # 增加超时时间
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 上传文件
    location /uploads {
        alias $INSTALL_DIR/backend/uploads;
        expires 1y;
        add_header Cache-Control "public";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 限制上传大小
    client_max_body_size 10M;
}
EOF

    # 启用站点
    if [ "$PKG_MANAGER" = "apt" ]; then
        ln -sf /etc/nginx/sites-available/goods-store /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
    elif [ "$PKG_MANAGER" = "yum" ]; then
        # CentOS/RHEL 需要在 nginx.conf 中 include
        if ! grep -q "include /etc/nginx/sites-enabled" /etc/nginx/nginx.conf; then
            sed -i '/http {/a \    include /etc/nginx/sites-enabled/*;' /etc/nginx/nginx.conf
        fi
        mkdir -p /etc/nginx/sites-enabled
        ln -sf /etc/nginx/sites-available/goods-store /etc/nginx/sites-enabled/
    fi

    # 测试配置
    log_info "测试 Nginx 配置..."
    nginx -t

    # 重启 Nginx
    systemctl restart nginx
    systemctl enable nginx

    log_success "Nginx 配置完成"
}

# 配置 SSL
configure_ssl() {
    if [ "$SETUP_SSL" != "y" ] && [ "$SETUP_SSL" != "Y" ]; then
        return
    fi

    print_header "配置 SSL 证书"

    # 安装 Certbot
    if ! command -v certbot &> /dev/null; then
        log_info "安装 Certbot..."
        if [ "$PKG_MANAGER" = "apt" ]; then
            apt install -y certbot python3-certbot-nginx
        elif [ "$PKG_MANAGER" = "yum" ]; then
            yum install -y certbot python3-certbot-nginx
        fi
    fi

    # 获取证书
    log_info "获取 SSL 证书..."
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$SSL_EMAIL" --redirect

    # 设置自动续期
    log_info "配置证书自动续期..."
    (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

    log_success "SSL 证书配置完成"
}

# 配置 PM2
configure_pm2() {
    print_header "配置 PM2"

    cd "$INSTALL_DIR/backend"

    # 创建 PM2 配置文件
    cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'goods-store-backend',
    script: './src/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: $BACKEND_PORT
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
EOF

    # 创建日志目录
    mkdir -p logs

    # 启动应用
    log_info "启动后端服务..."
    pm2 start ecosystem.config.js

    # 保存 PM2 配置
    pm2 save

    # 设置开机自启
    log_info "配置开机自启..."
    pm2 startup systemd -u root --hp /root

    log_success "PM2 配置完成"
}

# 创建 systemd 服务 (备用方案)
create_systemd_service() {
    print_header "创建 Systemd 服务"

    cat > /etc/systemd/system/goods-store.service << EOF
[Unit]
Description=Virtual Goods Store Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR/backend
Environment=NODE_ENV=production
Environment=PORT=$BACKEND_PORT
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=goods-store

[Install]
WantedBy=multi-user.target
EOF

    # 重新加载 systemd
    systemctl daemon-reload

    log_info "Systemd 服务已创建"
    log_info "使用以下命令管理服务:"
    log_info "  启动: systemctl start goods-store"
    log_info "  停止: systemctl stop goods-store"
    log_info "  重启: systemctl restart goods-store"
    log_info "  状态: systemctl status goods-store"
    log_info "  开机自启: systemctl enable goods-store"
}

# 配置防火墙
configure_firewall() {
    print_header "配置防火墙"

    # 检查防火墙类型
    if command -v ufw &> /dev/null; then
        log_info "配置 UFW 防火墙..."
        ufw allow 80/tcp
        ufw allow 443/tcp
        ufw allow 22/tcp
        echo "y" | ufw enable
        log_success "UFW 防火墙配置完成"
    elif command -v firewall-cmd &> /dev/null; then
        log_info "配置 Firewalld..."
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --reload
        log_success "Firewalld 配置完成"
    else
        log_warning "未检测到防火墙,请手动配置"
        log_info "需要开放端口: 80 (HTTP), 443 (HTTPS), 22 (SSH)"
    fi
}

# 显示部署信息
show_deployment_info() {
    print_header "部署完成"

    log_success "虚拟商品商城部署成功!"
    echo ""
    log_info "========== 访问信息 =========="
    if [ "$SETUP_SSL" = "y" ] || [ "$SETUP_SSL" = "Y" ]; then
        log_info "网站地址: https://$DOMAIN"
    else
        log_info "网站地址: http://$DOMAIN"
    fi
    log_info "管理后台: /admin"
    echo ""
    log_info "========== 默认管理员账号 =========="
    log_info "邮箱: admin@shop.com"
    log_info "密码: admin123"
    log_warning "请立即登录并修改密码!"
    echo ""
    log_info "========== 服务管理 =========="
    log_info "查看后端状态: pm2 status"
    log_info "查看后端日志: pm2 logs goods-store-backend"
    log_info "重启后端: pm2 restart goods-store-backend"
    log_info "停止后端: pm2 stop goods-store-backend"
    echo ""
    log_info "查看 Nginx 状态: systemctl status nginx"
    log_info "重启 Nginx: systemctl restart nginx"
    echo ""
    log_info "========== 重要文件位置 =========="
    log_info "项目目录: $INSTALL_DIR"
    log_info "后端配置: $INSTALL_DIR/backend/.env"
    log_info "数据库: $INSTALL_DIR/backend/data/database.db"
    log_info "上传文件: $INSTALL_DIR/backend/uploads/"
    log_info "Nginx 配置: /etc/nginx/sites-available/goods-store"
    echo ""
    log_info "========== 下一步 =========="
    log_info "1. 访问网站并登录管理后台"
    log_info "2. 修改管理员密码"
    log_info "3. 配置系统设置 (Stripe Webhook URL 等)"
    log_info "4. 添加商品分类和商品"
    log_info "5. 配置通知渠道 (飞书/Telegram/微信)"
    log_info "6. 定期备份数据库: $INSTALL_DIR/backend/data/database.db"
    echo ""
    log_success "祝您使用愉快!"
}

# 主函数
main() {
    clear

    cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        虚拟商品商城 - 自动部署脚本                        ║
║        Virtual Goods Store - Auto Deploy Script          ║
║                                                           ║
║        Version: 1.0.0                                     ║
║        Author: senma231                                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF

    echo ""
    log_info "开始部署流程..."
    echo ""

    # 1. 检查 root 权限
    check_root

    # 2. 检测系统
    detect_system

    # 3. 检查依赖
    if ! check_dependencies; then
        read -p "是否自动安装缺失的依赖? (y/n): " INSTALL_DEPS
        if [ "$INSTALL_DEPS" = "y" ] || [ "$INSTALL_DEPS" = "Y" ]; then
            install_dependencies
        else
            log_error "请手动安装依赖后重新运行脚本"
            exit 1
        fi
    fi

    # 4. 获取用户输入
    get_user_input

    # 5. 克隆项目
    clone_project

    # 6. 安装项目依赖
    install_project_dependencies

    # 7. 配置环境变量
    configure_environment

    # 8. 初始化数据库
    initialize_database

    # 9. 构建前端
    build_frontend

    # 10. 配置 Nginx
    configure_nginx

    # 11. 配置 SSL (可选)
    configure_ssl

    # 12. 配置 PM2
    configure_pm2

    # 13. 创建 Systemd 服务 (备用)
    create_systemd_service

    # 14. 配置防火墙
    configure_firewall

    # 15. 显示部署信息
    show_deployment_info
}

# 错误处理
trap 'log_error "部署过程中发生错误,请检查日志"; exit 1' ERR

# 运行主函数
main "$@"

