module.exports = (err, req, res, next) => {
  console.error('❌ Ошибка:', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
};