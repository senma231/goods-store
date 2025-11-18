# 生产环境部署检查清单

## 部署前准备

### 1. API密钥和凭证配置

#### 必需配置 ✅

- [ ] **Stripe Secret Key**
  - 环境变量：`STRIPE_SECRET_KEY`
  - 格式：`sk_test_...`（测试）或 `sk_live_...`（生产）
  - 配置位置：Supabase Edge Functions Secrets
  - ⚠️ **当前状态：未配置或无效（系统使用演示模式）**

- [ ] **Stripe Publishable Key**
  - 文件：`/workspace/virtual-goods-store/src/pages/CheckoutPage.tsx`（第21行）
  - 格式：`pk_test_...`（测试）或 `pk_live_...`（生产）
  - ⚠️ **当前状态：使用默认测试密钥（可能无效）**

- [ ] **Supabase凭证**
  - ✅ URL: `https://agfkftjokakyvbecgkdb.supabase.co`
  - ✅ Anon Key: 已配置
  - ✅ Service Role Key: 已配置

#### 可选配置 📋

- [ ] **Stripe Webhook Secret**
  - 环境变量：`STRIPE_WEBHOOK_SECRET`
  - 用途：验证Stripe webhook签名
  - 推荐配置以提高安全性

- [ ] **通知系统配置**
  - Telegram Bot Token（如需Telegram通知）
  - 企业微信/飞书 Webhook URL（如需企业通知）
  - SMTP配置（如需邮件通知）
  - 配置方式：参考 `/workspace/docs/notification-system-guide.md`

- [ ] **USDT支付配置**
  - 区块链API密钥
  - USDT收款地址
  - 当前状态：基础框架已实现

### 2. 数据库验证

- [x] 数据库表结构完整（10个表）
- [x] 测试数据已导入
  - 4个商品分类
  - 4个示例商品
  - 1350个虚拟资产
- [ ] 生产数据准备就绪
  - 实际商品信息
  - 虚拟商品资产（激活码、下载链接等）
  - 商品图片上传到Storage

### 3. Edge Functions部署状态

| Function | 版本 | 状态 | 说明 |
|----------|------|------|------|
| create-order | v2 | ✅ 已部署 | 支持游客下单 |
| process-payment | v5 | ⚠️ 演示模式 | **需配置Stripe密钥** |
| confirm-stripe-payment | v3 | ⚠️ 演示模式 | **需配置Stripe密钥** |
| deliver-virtual-goods | v2 | ✅ 已部署 | 自动发货功能 |
| query-guest-order | v3 | ✅ 已部署 | 游客订单查询 |
| send-order-notification | v1 | ✅ 已部署 | 多渠道通知 |
| check-usdt-payment | v2 | ✅ 已部署 | USDT支付检查 |
| import-virtual-assets | v1 | ✅ 已部署 | 批量导入资产 |

### 4. Cron Jobs配置

- [x] USDT支付定时检查（每5分钟）
- [ ] 其他定时任务（根据需求添加）

### 5. 前端构建和部署

- [x] 开发环境测试通过
- [ ] 生产环境构建
  ```bash
  cd /workspace/virtual-goods-store
  pnpm run build
  ```
- [ ] 部署到生产服务器
- [ ] CDN配置（可选）
- [ ] 域名绑定和SSL证书

## 核心功能测试清单

### 用户认证流程

- [ ] 用户注册
- [ ] 邮箱验证
- [ ] 用户登录
- [ ] 密码重置
- [ ] 登出功能

### 游客购物流程

- [x] 浏览商品
- [x] 添加到购物车（localStorage）
- [x] 购物车管理
- [x] 游客结算
- ⚠️ Stripe支付（演示模式）
- [x] 订单创建
- [x] 虚拟商品自动发货
- [x] 订单查询（查询码/邮箱）

### 已登录用户购物流程

- [x] 所有游客功能
- [ ] 购物车同步
- [ ] 订单历史查看
- [ ] 个人资料管理
- **需要测试**：完整购物流程

### 支付系统测试

#### Stripe支付

- ⚠️ **当前状态：演示模式**
- [ ] **配置真实Stripe密钥后测试**：
  - [ ] Payment Intent创建
  - [ ] 信用卡信息验证
  - [ ] 支付确认
  - [ ] Webhook接收
  - [ ] 订单状态更新
  - [ ] 测试卡号：`4242 4242 4242 4242`

#### 其他支付方式

- [ ] USDT支付（基础功能已实现）
- [ ] 微信支付（待集成）
- [ ] 支付宝（待集成）

### 管理员功能

- [ ] 登录管理员账户（testuser@gmail.com）
- [ ] 商品管理（增删改查）
- [ ] 分类管理
- [ ] 虚拟资产导入
- [ ] 订单管理
- [ ] 用户管理

### 通知系统

- [ ] 订单创建通知
- [ ] 支付成功通知
- [ ] 发货完成通知
- [ ] 配置各通知渠道（Telegram/Webhook/Email）

## 性能和安全检查

### 性能优化

- [ ] 图片压缩和优化
- [ ] 代码分割和懒加载
- [ ] CDN配置
- [ ] 数据库查询优化
- [ ] Edge Function冷启动优化

### 安全配置

- [x] RLS（Row Level Security）策略配置
- [x] API密钥环境变量隔离
- [ ] CORS配置验证
- [ ] Rate limiting（API限流）
- [ ] 输入验证和防SQL注入
- [ ] XSS防护

### 监控和日志

- [ ] Supabase日志监控设置
- [ ] 错误追踪配置（Sentry等）
- [ ] 性能监控
- [ ] 用户行为分析（可选）

## 文档和交付

### 技术文档

- [x] 使用说明：`/workspace/docs/usage-guide.md`
- [x] Stripe集成指南：`/workspace/docs/stripe-integration-guide.md`
- [x] 通知系统配置：`/workspace/docs/notification-system-guide.md`
- [x] 游客购买指南：`/workspace/docs/guest-purchase-guide.md`
- [x] 新功能总结：`/workspace/docs/new-features-summary.md`

### 测试报告

- [x] 测试进度：`/workspace/test-progress.md`
- [ ] 完整端到端测试报告（待Stripe密钥配置后）

### 用户手册

- [ ] 商家操作手册
- [ ] 技术维护手册
- [ ] API文档（如需对外提供）

## 部署步骤

### 第一步：配置环境变量

1. **配置Stripe API密钥**（最高优先级）
   ```bash
   # 在Supabase Dashboard配置
   STRIPE_SECRET_KEY=sk_test_或sk_live_你的密钥
   ```

2. 验证其他环境变量
   ```bash
   supabase secrets list
   ```

### 第二步：更新前端配置

1. 编辑 `CheckoutPage.tsx`，更新Stripe Publishable Key
2. 检查Supabase连接配置

### 第三步：重新部署

1. 部署Edge Functions（如果有更新）
   ```bash
   supabase functions deploy process-payment
   supabase functions deploy confirm-stripe-payment
   ```

2. 构建并部署前端
   ```bash
   cd /workspace/virtual-goods-store
   pnpm run build
   # 部署dist目录到生产服务器
   ```

### 第四步：全面测试

1. 使用Stripe测试卡号进行支付测试
2. 验证订单状态更新
3. 检查虚拟商品自动发货
4. 测试游客和已登录用户流程

### 第五步：生产上线

1. 切换到生产Stripe密钥（sk_live_*）
2. 配置生产域名和SSL
3. 设置监控和告警
4. 准备客服支持

## 当前系统状态总结

### ✅ 已完成功能（100%）

- 用户认证系统
- 商品管理和展示
- 购物车（游客+登录用户）
- 订单管理系统
- 虚拟商品自动发货
- 订单查询（游客支持）
- 管理员后台
- 多渠道通知系统
- 响应式UI设计

### ⚠️ 需要配置（演示模式）

**Stripe支付集成**（核心功能）
- 当前：演示模式，模拟支付成功
- 需要：配置真实Stripe API密钥
- 影响：无法处理真实交易
- 优先级：**最高**

### 📋 可选增强

- USDT支付完整测试
- 微信/支付宝支付集成
- 通知渠道配置和测试
- 性能优化和监控

## 风险评估

| 风险项 | 严重程度 | 当前状态 | 缓解措施 |
|--------|----------|----------|----------|
| Stripe支付未配置 | 🔴 高 | 演示模式 | **必须配置真实密钥** |
| 缺少完整测试 | 🟡 中 | 部分测试 | 配置密钥后进行完整测试 |
| 通知系统未配置 | 🟢 低 | 可选功能 | 根据需求配置 |
| 性能未优化 | 🟢 低 | 功能正常 | 上线后逐步优化 |

## 部署决策

在部署到生产环境前，请确认：

1. ✅ **必需项**：配置真实Stripe API密钥
2. ✅ **推荐项**：完成完整支付流程测试
3. 📋 **可选项**：配置通知系统、其他支付方式

**当前建议**：
- 如用于演示/展示：当前系统可直接使用（演示模式）
- 如用于生产运营：**必须先配置Stripe密钥并通过真实支付测试**

---

**检查清单最后更新**：2025-11-11
**系统版本**：v1.0（演示模式）
**部署URL**：https://km4t9ruauz4x.space.minimaxi.com
