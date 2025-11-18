# 订单通知系统配置指南

## 功能概述
系统支持多渠道订单通知，可在订单状态变化时自动发送通知到管理员。

## 支持的通知渠道

### 1. Telegram Bot通知
通过Telegram机器人发送订单通知消息。

**配置步骤**：
1. 创建Telegram Bot（通过@BotFather）
2. 获取Bot Token
3. 获取Chat ID（可通过@userinfobot）
4. 在数据库中添加配置：

```sql
INSERT INTO notification_configs (notification_type, is_enabled, config, priority)
VALUES (
    'telegram',
    TRUE,
    '{
        "botToken": "YOUR_BOT_TOKEN",
        "chatId": "YOUR_CHAT_ID"
    }'::jsonb,
    1
);
```

### 2. 飞书Webhook通知
通过飞书群机器人发送通知。

**配置步骤**：
1. 在飞书群中添加"自定义机器人"
2. 复制Webhook URL
3. 在数据库中添加配置：

```sql
INSERT INTO notification_configs (notification_type, is_enabled, config, priority)
VALUES (
    'feishu_webhook',
    TRUE,
    '{
        "webhookUrl": "https://open.feishu.cn/open-apis/bot/v2/hook/YOUR_WEBHOOK_TOKEN"
    }'::jsonb,
    2
);
```

### 3. 企业微信Webhook通知
通过企业微信群机器人发送通知。

**配置步骤**：
1. 在企业微信群中添加"群机器人"
2. 复制Webhook URL
3. 在数据库中添加配置：

```sql
INSERT INTO notification_configs (notification_type, is_enabled, config, priority)
VALUES (
    'wecom_webhook',
    TRUE,
    '{
        "webhookUrl": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_WEBHOOK_KEY"
    }'::jsonb,
    3
);
```

### 4. 邮件通知（SMTP）
通过SMTP服务发送邮件通知。

**配置步骤**：
1. 准备SMTP服务器信息
2. 在数据库中添加配置：

```sql
INSERT INTO notification_configs (notification_type, is_enabled, config, priority)
VALUES (
    'email',
    TRUE,
    '{
        "smtpHost": "smtp.example.com",
        "smtpPort": 587,
        "smtpUser": "your@email.com",
        "smtpPassword": "your_password",
        "fromEmail": "noreply@yourdomain.com",
        "fromName": "虚拟商品商城"
    }'::jsonb,
    4
);
```

**注意**：邮件通知功能需要集成第三方邮件服务（如SendGrid、Mailgun等）以确保邮件送达率。

## 通知触发事件

系统会在以下事件触发通知：

| 事件类型 | 描述 | 触发时机 |
|---------|------|---------|
| order_created | 新订单创建 | 用户提交订单后 |
| payment_success | 支付成功 | 支付确认后 |
| payment_failed | 支付失败 | 支付失败后 |
| order_delivered | 商品已发货 | 虚拟商品自动发货后 |
| order_completed | 订单已完成 | 订单完成后 |
| order_cancelled | 订单已取消 | 订单取消后 |

## 通知内容模板

通知消息包含以下信息：
- 订单号
- 订单金额
- 支付方式
- 订单状态
- 支付状态
- 联系邮箱
- 联系人
- 创建时间
- 游客订单标识（如适用）

## 管理通知配置

### 启用/禁用通知渠道
```sql
-- 禁用某个通知渠道
UPDATE notification_configs
SET is_enabled = FALSE
WHERE notification_type = 'telegram';

-- 启用某个通知渠道
UPDATE notification_configs
SET is_enabled = TRUE
WHERE notification_type = 'telegram';
```

### 修改通知优先级
```sql
-- 数字越小优先级越高
UPDATE notification_configs
SET priority = 0
WHERE notification_type = 'telegram';
```

### 查看通知日志
```sql
-- 查看最近的通知记录
SELECT 
    nl.created_at,
    nl.notification_type,
    nl.event_type,
    nl.status,
    o.order_number,
    nl.error_message
FROM notification_logs nl
JOIN orders o ON nl.order_id = o.id
ORDER BY nl.created_at DESC
LIMIT 50;

-- 统计通知成功率
SELECT 
    notification_type,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
    ROUND(100.0 * SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM notification_logs
GROUP BY notification_type;
```

## 测试通知
可以通过直接调用Edge Function测试通知功能：

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/send-order-notification' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "orderId": "YOUR_ORDER_ID",
    "eventType": "order_created"
  }'
```

## 注意事项

1. **安全性**：通知配置中包含敏感信息（如Bot Token、密码），请确保：
   - 仅通过数据库管理，不要在前端暴露
   - 使用强密码和安全的Token
   - 定期轮换密钥

2. **错误处理**：通知发送失败不会影响订单处理流程，所有错误都会记录到notification_logs表中

3. **频率限制**：部分服务（如Telegram）有API调用频率限制，建议：
   - 设置合理的优先级
   - 避免短时间内大量通知
   - 考虑批量通知功能

4. **邮件送达率**：如需使用邮件通知，建议：
   - 使用专业的SMTP服务（SendGrid、Mailgun、AWS SES等）
   - 配置SPF、DKIM等DNS记录
   - 避免使用免费邮箱的SMTP服务

## Edge Functions说明

通知系统使用以下Edge Function：
- `send-order-notification`: 发送订单通知到配置的渠道
- 部署地址: https://agfkftjokakyvbecgkdb.supabase.co/functions/v1/send-order-notification

该函数会自动在订单创建和发货时被调用。
