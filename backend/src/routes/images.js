const router = require('express').Router();
const multer = require('multer');
const auth = require('../middlewares/authMiddleware');
const role = require('../middlewares/roleMiddleware');
const imageController = require('../controllers/imageController');

// Configuracion de multer: almacenar en memoria (buffer) para subir a Firebase
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB por archivo
    files: 10                    // maximo 10 archivos por request
  },
  fileFilter: (req, file, cb) => {
    const tiposPermitidos = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
      'image/tiff', 'application/dicom',     // DICOM (imagenes medicas)
      'application/pdf'                       // PDF de resultados escaneados
    ];
    if (tiposPermitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}. Permitidos: JPEG, PNG, GIF, WebP, BMP, TIFF, DICOM, PDF`));
    }
  }
});

// Subir imagenes a un registro medico (medico, laboratorista, radiologo)
router.post(
  '/upload/:registroId',
  auth,
  role(['medico', 'laboratorista', 'radiologo', 'admin']),
  upload.array('imagenes', 10),
  imageController.subir
);

// Listar imagenes de un registro medico especifico (lista interna)
router.get('/record/:registroId', auth, imageController.listarPorRegistro);

// Listar todos los registros con imagenes de un paciente (lista de listas)
router.get('/patient/:pacienteId', auth, imageController.listarPorPaciente);

// Verificar integridad de una imagen
router.get('/:id/verify', auth, imageController.verificarIntegridad);

// Eliminar imagen (soft delete)
router.delete('/:id', auth, role(['medico', 'admin']), imageController.eliminar);

// Middleware de error de multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Archivo muy grande. Maximo 10 MB por imagen.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Maximo 10 imagenes por solicitud.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message && err.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
