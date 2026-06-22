require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./config/logger');
const fabricCAService = require('./services/fabricCAService');
const blockchainService = require('./services/blockchainService');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const recordRoutes = require('./routes/records');
const resultRoutes = require('./routes/results');
const prescriptionRoutes = require('./routes/prescriptions');
const imageRoutes = require('./routes/images');
const auditRoutes = require('./routes/audit');

const authController = require('./controllers/authController');
const patientController = require('./controllers/patientController');
const recordController = require('./controllers/recordController');
const resultController = require('./controllers/resultController');
const prescriptionController = require('./controllers/prescriptionController');
const auth = require('./middlewares/authMiddleware');
const { sequelize } = require('./models');
const supabaseConfig = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares globales
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configurado (soporta multiples origenes separados por coma)
app.use(cors({
  origin: function(origin, callback) {
    const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',').map(s => s.trim());
    // Permitir requests sin origin (mobile apps, curl, etc.)
    if (!origin || allowed.includes(origin) || allowed.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));

// Rate limiting global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500,
  message: { error: 'Demasiadas solicitudes. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting estricto para login (proteccion contra brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos de login. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Log de requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Rutas
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/audit', auditRoutes);

// Stats endpoint para dashboards
app.get('/api/stats', auth, (req, res) => {
  const users = authController.getUsers();
  const patients = patientController.getPatients();
  const records = recordController.getRecords();
  const permissions = recordController.getPermissions();
  const results = resultController.getResults();
  const prescriptions = prescriptionController.getPrescriptions();

  const permisosActivos = Array.from(permissions.values()).filter(p => p.activo).length;
  const registrosHoy = Array.from(records.values()).filter(r => {
    return r.fechaCreacion && r.fechaCreacion.startsWith(new Date().toISOString().slice(0, 10));
  }).length;

  res.json({
    usuarios: users.size,
    pacientes: patients.size,
    registros: records.size,
    resultados: results.size,
    recetas: prescriptions.size,
    permisosActivos,
    registrosHoy,
    blockchainActiva: blockchainService.available,
    fabricCAActiva: fabricCAService.available
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'historiales-medicos-api',
    blockchain: blockchainService.available,
    fabricCA: fabricCAService.available,
    supabaseStorage: supabaseConfig.isAvailable()
  });
});

// Manejo de errores global
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// Bootstrap e inicio del servidor
async function startServer() {
  // Inicializar base de datos
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    logger.info(`Base de datos conectada (${sequelize.getDialect()})`);

    // Cargar datos existentes al cache en memoria
    await authController.loadFromDB();
    await patientController.loadFromDB();
    await recordController.loadFromDB();
    await resultController.loadFromDB();
    await prescriptionController.loadFromDB();
  } catch (dbErr) {
    logger.warn(`Base de datos no disponible: ${dbErr.message}. Usando solo memoria.`);
  }

  // Exponer caches en app.locals para acceso entre controladores
  app.locals.records = recordController.getRecords();

  // Inicializar Supabase Storage
  const supabaseOk = supabaseConfig.initSupabase();
  logger.info(`Supabase Storage: ${supabaseOk ? 'CONECTADO' : 'NO DISPONIBLE'}`);

  // Intentar conectar a Fabric CA y blockchain
  logger.info('Intentando conectar a Fabric blockchain...');
  const caOk = await fabricCAService.init();
  if (caOk) {
    await blockchainService.init();

    // Registrar usuarios seed en Fabric CA si estan disponibles
    const seedUsers = [
      { id: 'admin-app', role: 'admin' },
      { id: 'doctor', role: 'medico' },
      { id: 'paciente', role: 'paciente' },
      { id: 'laboratorista', role: 'laboratorista' },
      { id: 'farmacia', role: 'farmacia' }
    ];
    for (const u of seedUsers) {
      try {
        await fabricCAService.registrarUsuario(u.id, u.role);
      } catch (err) {
        logger.warn(`Seed usuario ${u.id}: ${err.message}`);
      }
    }
  } else {
    logger.info('Blockchain no disponible. Funcionando solo con almacenamiento en memoria.');
  }

  app.listen(PORT, () => {
    logger.info(`Servidor backend corriendo en puerto ${PORT}`);
    logger.info(`Blockchain: ${blockchainService.available ? 'CONECTADA' : 'NO DISPONIBLE'}`);
    logger.info(`Fabric CA: ${fabricCAService.available ? 'CONECTADA' : 'NO DISPONIBLE'}`);
  });
}

startServer();

module.exports = app;
