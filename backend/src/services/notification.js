import getDb from '../database/db.js';

// 通知服务 - 支持飞书、Telegram、企业微信
async function sendFeishuNotification(webhookUrl, message) {
  try {
    const payload = {
      msg_type: 'text',
      content: {
        text: message
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    return {
      success: response.ok && result.code === 0,
      message: response.ok ? '发送成功' : '发送失败',
      error: response.ok ? null : JSON.stringify(result)
    };
  } catch (error) {
    return {
      success: false,
      message: '发送失败',
      error: error.message
    };
  }
}

async function sendTelegramNotification(botToken, chatId, message) {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    return {
      success: result.ok,
      message: result.ok ? '发送成功' : '发送失败',
      error: result.ok ? null : result.description
    };
  } catch (error) {
    return {
      success: false,
      message: '发送失败',
      error: error.message
    };
  }
}

async function sendWecomNotification(webhookUrl, message) {
  try {
    const payload = {
      msgtype: 'text',
      text: {
        content: message
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    return {
      success: response.ok && result.errcode === 0,
      message: response.ok ? '发送成功' : '发送失败',
      error: response.ok ? null : result.errmsg
    };
  } catch (error) {
    return {
      success: false,
      message: '发送失败',
      error: error.message
    };
  }
}

export async function sendNotification(eventType, message) {
  const db = getDb();
  
  try {
    const channels = db.prepare(`
      SELECT * FROM notification_channels
      WHERE is_enabled = 1
    `).all();

    const results = [];

    for (const channel of channels) {
      const config = JSON.parse(channel.config || '{}');
      const events = JSON.parse(channel.events || '[]');

      if (events.length > 0 && !events.includes(eventType)) {
        continue;
      }

      let result;
      switch (channel.channel_type) {
        case 'feishu':
          result = await sendFeishuNotification(config.webhook_url, message);
          break;
        case 'telegram':
          result = await sendTelegramNotification(config.bot_token, config.chat_id, message);
          break;
        case 'wecom':
          result = await sendWecomNotification(config.webhook_url, message);
          break;
        default:
          result = { success: false, message: '不支持的渠道类型' };
      }

      results.push({
        channel: channel.name,
        type: channel.channel_type,
        ...result
      });
    }

    return results;
  } catch (error) {
    console.error('发送通知失败:', error);
    return [];
  }
}

export { sendFeishuNotification, sendTelegramNotification, sendWecomNotification };

