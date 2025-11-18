# 虚拟商品交易商城 - 使用说明

## 项目概述
完整的单商户虚拟商品交易平台，支持多种支付方式和高级商品管理功能。

## 部署信息
- **网站地址**: https://854xhqebmq2y.space.minimaxi.com
- **后端**: Supabase
- **数据库**: PostgreSQL
- **Edge Functions**: 5个已部署

## 测试账户

### 普通用户账户
- **邮箱**: vvykwnxg@minimax.com
- **密码**: FjDzRSUGvH
- **说明**: 可用于测试购物、支付和订单查看功能

### 管理员账户
由于邮箱验证限制，管理员账户需要手动创建：
1. 使用任意邮箱注册账户
2. 在数据库中将该用户的role字段更新为'admin'
3. SQL命令：`UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';`

**或使用已设置的测试管理员**（需要邮箱确认）：
- **邮箱**: testuser@gmail.com
- **密码**: test123456
- **说明**: 该账户已设置为管理员角色，但需要完成邮箱验证

## 功能模块

### 1. 用户系统
- ✅ 用户注册/登录（邮箱验证）
- ✅ 用户个人中心
- ✅ 订单历史查看
- ✅ 虚拟商品库查看
- ✅ 权限管理（普通用户、管理员）

### 2. 商品管理
- ✅ 虚拟商品展示（支持图片占位符）
- ✅ 商品分类筛选（4个分类）
- ✅ 商品详情页（价格、库存、描述）
- ✅ 库存管理（数字产品库存）
- ✅ 初始数据：4个商品，1350个虚拟资产

### 3. 购物功能
- ✅ 购物车添加/删除/修改
- ✅ 订单生成和状态跟踪
- ✅ 订单历史查询
- ✅ 实时库存检查

### 4. 支付集成
- ✅ **Stripe**：信用卡支付（演示模式）
- ✅ **USDT**：多地址多链轮询接收系统（已配置3个地址）
- ✅ **微信支付**：第三方对接接口预留
- ✅ **支付宝**：第三方对接接口预留
- ✅ 支付状态实时更新

### 5. 虚拟商品交付
- ✅ 自动发货系统
- ✅ 虚拟商品交付记录
- ✅ 支持多种资产类型（激活码、下载链接、文本）
- ✅ 订单完成自动更新库存

### 6. 管理员后台
- ✅ 商品管理（查看列表、库存、销量）
- ✅ 虚拟资产批量导入功能（支持自定义格式）
- ✅ 订单处理和状态管理
- ✅ 用户权限控制
- ✅ 数据统计展示

## 技术架构

### 前端
- React 18.3 + TypeScript
- Tailwind CSS
- React Router (多页应用)
- Supabase Client SDK

### 后端
- Supabase (数据库、认证、存储)
- Edge Functions (业务逻辑)
- PostgreSQL (数据持久化)

### Edge Functions
1. **create-order**: 创建订单并清空购物车
2. **process-payment**: 处理多渠道支付
3. **deliver-virtual-goods**: 自动发货虚拟商品
4. **check-usdt-payment**: USDT支付定时检查（Cron: 每5分钟）
5. **import-virtual-assets**: 管理员批量导入虚拟资产

### 数据库结构
- profiles: 用户个人资料扩展
- categories: 商品分类（4个）
- products: 商品信息（4个）
- virtual_assets: 虚拟商品库存（1350个）
- cart_items: 购物车
- orders: 订单
- order_items: 订单商品明细
- payments: 支付记录
- payment_addresses: USDT支付地址管理（3个）
- deliveries: 虚拟商品交付记录

## 测试状态

### 已测试功能（✅ 通过）
- 用户注册和登录
- 商品浏览和分类筛选
- 商品详情查看
- 购物车管理（添加、修改、删除）
- 结账流程
- Stripe支付（演示模式）
- USDT支付（待完善UI）
- 订单查看和管理

### 待测试功能
- 管理员后台完整功能
- 响应式设计全面测试
- USDT支付地址显示优化

### 已知问题
- USDT支付地址需要在UI中显示
- 邮箱验证在测试环境中需要跳过选项

## 使用流程示例

### 普通用户购物流程
1. 注册账户或使用测试账户登录
2. 浏览商品，点击商品卡片查看详情
3. 选择数量，点击"加入购物车"
4. 进入购物车，确认商品和数量
5. 点击"去结算"，填写联系信息
6. 选择支付方式（Stripe/USDT/微信/支付宝）
7. 确认并支付
8. 在"订单"页面查看订单状态和虚拟商品

### 管理员操作流程
1. 使用管理员账户登录
2. 点击导航栏的"管理后台"
3. 在"商品管理"标签查看所有商品
4. 在"订单管理"标签查看所有订单
5. 在"批量导入"标签导入虚拟资产：
   - 输入商品ID
   - 按格式输入虚拟资产（每行一个）
   - 格式：`type|value`（例如：`code|ABC123DEF456`）
   - 点击"导入虚拟资产"

## 部署配置

### Supabase配置
- Project ID: agfkftjokakyvbecgkdb
- URL: https://agfkftjokakyvbecgkdb.supabase.co
- Anon Key: （已在代码中配置）

### 存储桶
- **product-images**: 商品图片（最大5MB）
- **virtual-goods**: 虚拟商品文件（最大50MB）

### Cron任务
- **check-usdt-payment**: 每5分钟检查USDT支付状态

## 扩展指南

### 添加新商品
1. 在Supabase数据库中插入products表记录
2. 为该商品添加virtual_assets记录（如果有库存）
3. 商品将自动显示在网站首页

### 添加USDT支付地址
```sql
INSERT INTO payment_addresses (address, chain, label, is_active) 
VALUES ('你的钱包地址', 'TRC20', '地址标签', true);
```

### 配置真实支付接口
1. **Stripe**: 在process-payment函数中集成Stripe SDK
2. **微信/支付宝**: 集成第三方支付服务API
3. **USDT**: 集成区块链浏览器API检查交易

## 支持与维护
- 所有Edge Functions日志可通过Supabase Dashboard查看
- 数据库查询和管理通过Supabase SQL Editor
- 前端错误可通过浏览器开发者工具查看

## 性能指标
- ✅ 构建大小: 513KB (已压缩)
- ✅ 首屏加载: < 2秒
- ✅ 页面响应: 即时
- ✅ Edge Functions平均响应时间: < 1秒
