const axios = require('axios');
const { logger } = require('../middlewares/logger.middleware');

async function sendTelegramAlert(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat_id = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat_id) return;

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id,
      text: message,
      parse_mode: 'HTML',
    });
  } catch (error) {
    logger.warn(`Telegram alert failed: ${error.message}`);
  }
}

module.exports = { sendTelegramAlert };
