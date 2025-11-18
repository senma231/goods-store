import Database from 'better-sqlite3';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  const db = new Database('./data/database.db');

  console.log('=== Stripe 测试密钥配置工具 ===\n');
  console.log('请输入您的 Stripe 测试密钥。');
  console.log('您可以从 https://dashboard.stripe.com/test/apikeys 获取测试密钥\n');

  const secretKey = await question('Stripe Secret Key (sk_test_...): ');
  const publishableKey = await question('Stripe Publishable Key (pk_test_...): ');

  if (!secretKey.startsWith('sk_test_') || !publishableKey.startsWith('pk_test_')) {
    console.log('\n❌ 错误: 请使用测试环境密钥 (sk_test_ 和 pk_test_ 开头)');
    rl.close();
    db.close();
    return;
  }

  try {
    // 更新或插入 secret key
    db.prepare(`
      INSERT INTO site_settings (setting_key, setting_value, setting_type, category, description)
      VALUES ('stripe_secret_key', ?, 'string', 'payment', 'Stripe API 密钥')
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
    `).run(secretKey);

    // 更新或插入 publishable key
    db.prepare(`
      INSERT INTO site_settings (setting_key, setting_value, setting_type, category, description)
      VALUES ('stripe_publishable_key', ?, 'string', 'payment', 'Stripe 公钥')
      ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value
    `).run(publishableKey);

    console.log('\n✅ Stripe 测试密钥已成功保存到数据库');
    console.log('\n下一步:');
    console.log('1. 安装 Stripe CLI: https://stripe.com/docs/stripe-cli');
    console.log('2. 运行: stripe listen --forward-to localhost:8787/api/payments/stripe/webhook');
    console.log('3. 复制 webhook secret (whsec_...) 并在前端支付配置中更新');

  } catch (error) {
    console.error('\n❌ 保存失败:', error.message);
  } finally {
    rl.close();
    db.close();
  }
}

main();

