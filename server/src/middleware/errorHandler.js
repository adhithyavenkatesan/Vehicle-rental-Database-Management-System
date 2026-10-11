function errorHandler(err, req, res, next) {
  console.error(`[API Error] ${req.method} ${req.originalUrl}:`, err);

  // SQLite foreign key constraint violation
  if (err.message && err.message.includes('FOREIGN KEY constraint failed')) {
    return res.status(409).json({
      success: false,
      message: 'Database relational integrity constraint failed. A referenced record does not exist or has active dependents.'
    });
  }

  // SQLite UNIQUE constraint violation
  if (err.message && err.message.includes('UNIQUE constraint failed')) {
    const field = err.message.split('UNIQUE constraint failed: ')[1] || 'value';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`
    });
  }

  // SQLite CHECK constraint violation
  if (err.message && err.message.includes('CHECK constraint failed')) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data format or constraint violation in supplied values.'
    });
  }

  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
}

module.exports = { errorHandler };
