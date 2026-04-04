const { Sequelize } = require('sequelize');
const path = require('path');
const logger = require('./logger');

let sequelize;

if (process.env.DATABASE_URL) {
  // URL de conexion directa (Render, Supabase, Railway, etc.)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else if (process.env.DB_DIALECT === 'postgres') {
  // PostgreSQL con variables individuales
  sequelize = new Sequelize(
    process.env.DB_NAME || 'historiales_medicos',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg),
      pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
    }
  );
} else {
  // SQLite (desarrollo local - funciona sin dependencias externas)
  try {
    require('sqlite3');
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'historiales.sqlite');
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: dbPath,
      logging: (msg) => logger.debug(msg)
    });
  } catch (e) {
    // sqlite3 no instalado, usar PostgreSQL por defecto
    logger.warn('sqlite3 no disponible, usando PostgreSQL');
    sequelize = new Sequelize(
      process.env.DB_NAME || 'historiales_medicos',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'postgres',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: (msg) => logger.debug(msg),
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
      }
    );
  }
}

module.exports = sequelize;
