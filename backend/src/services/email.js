import nodemailer from 'nodemailer';
import getDb from '../database/db.js';

/**
 * 获取邮件配置
 */
function getEmailConfig() {
  const db = getDb();
  
  try {
    const settings = db.prepare(`
      SELECT setting_key, setting_value 
      FROM site_settings 
      WHERE setting_key LIKE 'email_%'
    `).all();

    const config = {};
    settings.forEach(s => {
      const key = s.setting_key.replace('email_', '');
      config[key] = s.setting_value;
    });

    return config;
  } catch (error) {
    console.error('获取邮件配置失败:', error);
    return null;
  }
}

/**
 * 创建邮件传输器
 */
function createTransporter() {
  const config = getEmailConfig();
  
  if (!config || !config.smtp_host || !config.smtp_user) {
    console.warn('邮件配置不完整，无法发送邮件');
    return null;
  }

  try {
    return nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port) || 587,
      secure: config.smtp_secure === 'true', // true for 465, false for other ports
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass,
      },
    });
  } catch (error) {
    console.error('创建邮件传输器失败:', error);
    return null;
  }
}

/**
 * 发送发货通知邮件
 */
export async function sendDeliveryEmail(orderData, deliveries) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.log('邮件服务未配置，跳过发送邮件');
    return { success: false, message: '邮件服务未配置' };
  }

  const config = getEmailConfig();
  
  try {
    // 构建邮件内容
    const deliveryList = deliveries.map(d => `
      <div style="margin: 10px 0; padding: 15px; background: #f9f9f9; border-radius: 5px;">
        <strong>${d.product_name}</strong><br>
        <span style="color: #666;">类型: ${d.asset_type}</span><br>
        <code style="background: #fff; padding: 5px 10px; border-radius: 3px; display: inline-block; margin-top: 5px;">
          ${d.asset_value}
        </code>
      </div>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>订单发货通知</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4CAF50;">🎉 您的订单已发货！</h2>
          
          <p>您好，</p>
          <p>您的订单 <strong>${orderData.order_number}</strong> 已成功发货！</p>
          
          <h3>订单详情：</h3>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>订单号:</strong> ${orderData.order_number}</p>
            <p><strong>订单金额:</strong> $${orderData.total_amount}</p>
            <p><strong>下单时间:</strong> ${new Date(orderData.created_at).toLocaleString('zh-CN')}</p>
          </div>

          <h3>虚拟商品信息：</h3>
          ${deliveryList}

          <div style="margin-top: 30px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 3px;">
            <strong>⚠️ 重要提示：</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>请妥善保管您的激活码/卡密</li>
              <li>请勿将激活码分享给他人</li>
              <li>如有问题，请联系客服</li>
            </ul>
          </div>

          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            此邮件由系统自动发送，请勿回复。<br>
            如有疑问，请访问我们的网站或联系客服。
          </p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"${config.from_name || '虚拟商品商城'}" <${config.smtp_user}>`,
      to: orderData.contact_email,
      subject: `订单发货通知 - ${orderData.order_number}`,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('邮件发送成功:', info.messageId);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('发送邮件失败:', error);
    return { success: false, error: error.message };
  }
}

