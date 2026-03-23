const { NSE_HOLIDAYS } = require('../config/constants');

function toIST(date) {
  const d = new Date(date);
  return new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
}

function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isTradingDay(date) {
  const d = new Date(date);
  const day_of_week = d.getDay();
  if (day_of_week === 0 || day_of_week === 6) return false;

  const date_str = formatDate(d);
  const year = d.getFullYear();
  const holidays = NSE_HOLIDAYS[year] || [];
  return !holidays.includes(date_str);
}

function countTradingDays(start_date, end_date) {
  let count = 0;
  const current = new Date(start_date);
  const end = new Date(end_date);

  while (current <= end) {
    if (isTradingDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function getDateNYearsAgo(n) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

module.exports = {
  toIST,
  formatDate,
  isTradingDay,
  countTradingDays,
  getDateNDaysAgo,
  getDateNYearsAgo,
};
