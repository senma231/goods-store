import getDb from './src/database/db.js';

/**
 * 添加 error_message 字段到 deliveries 表
 */
function addErrorMessageColumn() {
  const db = getDb();

  try {
    // 检查字段是否已存在
    const tableInfo = db.prepare("PRAGMA table_info(deliveries)").all();
    const hasErrorMessage = tableInfo.some(col => col.name === 'error_message');

    if (hasErrorMessage) {
      console.log('✅ error_message 字段已存在');
      return;
    }

    // 添加字段
    db.prepare(`
      ALTER TABLE deliveries 
      ADD COLUMN error_message TEXT
    `).run();

    console.log('✅ 成功添加 error_message 字段到 deliveries 表');

  } catch (error) {
    console.error('❌ 添加字段失败:', error);
    throw error;
  }
}

// 执行迁移
addErrorMessageColumn();

