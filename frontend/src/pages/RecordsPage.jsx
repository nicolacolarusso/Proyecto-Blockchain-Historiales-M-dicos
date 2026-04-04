import { useState } from 'react';
import {
  Container, Typography, Button, Box, TextField, Paper, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip,
  IconButton, Tooltip, TablePagination, CircularProgress, ImageList,
  ImageListItem, ImageListItemBar, Card, CardContent, LinearProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VerifiedIcon from '@mui/icons-material/Verified';
import HistoryIcon from '@mui/icons-material/History';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import CollectionsIcon from '@mui/icons-material/Collections';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const TIPOS_REGISTRO = [
  'consulta', 'emergencia', 'hospitalizacion', 'laboratorio', 'imagen'
];

const tipoColor = {
  consulta: 'primary', emergencia: 'error', hospitalizacion: 'warning',
  laboratorio: 'info', imagen: 'secondary'
};

const CATEGORIAS_IMAGEN = [
  'radiografia', 'ecografia', 'tomografia', 'resonancia', 'laboratorio',
  'foto_clinica', 'electrocardiograma', 'patologia', 'otro'
];

export default function RecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [searchId, setSearchId] = useState('');
  const [searched, setSearched] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [historyResult, setHistoryResult] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [form, setForm] = useState({
    pacienteId: '', tipo: '', diagnostico: '', tratamiento: '', notas: ''
  });

  // Estado para imagenes
  const [imageDialog, setImageDialog] = useState(false);
  const [imageUploadDialog, setImageUploadDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadCategoria, setUploadCategoria] = useState('general');
  const [uploadDescripcion, setUploadDescripcion] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const canCreate = user?.role === 'medico';
  const canUploadImages = ['medico', 'laboratorista', 'radiologo', 'admin'].includes(user?.role);

  const handleSearch = async () => {
    if (!searchId) return;
    try {
      const res = await api.get(`/records/patient/${searchId}`);
      setRecords(Array.isArray(res.data) ? res.data : [res.data]);
      setError('');
      setSearched(true);
      setPage(0);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al buscar registros');
      setRecords([]);
      setSearched(true);
    }
  };

  const handleSubmit = async () => {
    try {
      const res = await api.post('/records', form);
      setRecords([...records, res.data]);
      setOpen(false);
      setForm({ pacienteId: '', tipo: '', diagnostico: '', tratamiento: '', notas: '' });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear registro');
    }
  };

  const handleVerify = async (recordId) => {
    try {
      const res = await api.get(`/records/${recordId}/verify`);
      setVerifyResult(res.data);
      setHistoryResult(null);
    } catch (err) {
      setVerifyResult({ error: err.response?.data?.error || 'Error al verificar' });
    }
  };

  const handleHistory = async (recordId) => {
    try {
      const res = await api.get(`/records/${recordId}/history`);
      setHistoryResult(res.data);
      setVerifyResult(null);
    } catch (err) {
      setHistoryResult({ error: err.response?.data?.error || 'Error al obtener historial' });
    }
  };

  // ---- Funciones de imagenes ----

  const handleViewImages = async (record) => {
    setSelectedRecord(record);
    setImageDialog(true);
    setLoadingImages(true);
    try {
      const res = await api.get(`/images/record/${record.id}`);
      setImagenes(res.data.imagenes || []);
    } catch (err) {
      setImagenes([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleOpenUpload = (record) => {
    setSelectedRecord(record);
    setUploadFiles([]);
    setUploadCategoria('general');
    setUploadDescripcion('');
    setUploadProgress(0);
    setImageUploadDialog(true);
  };

  const handleUploadImages = async () => {
    if (!uploadFiles.length || !selectedRecord) return;
    setUploadingImages(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      for (const file of uploadFiles) {
        formData.append('imagenes', file);
      }
      formData.append('categoria', uploadCategoria);
      formData.append('descripcion', uploadDescripcion);

      setUploadProgress(30);

      const res = await api.post(`/images/upload/${selectedRecord.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(30 + pct * 0.6); // 30% to 90%
        }
      });

      setUploadProgress(100);
      setImageUploadDialog(false);
      setError('');

      // Si el dialogo de imagenes esta abierto, refrescar
      if (imageDialog) {
        handleViewImages(selectedRecord);
      }

      alert(`${res.data.imagenesSubidas} imagen(es) subida(s) exitosamente a Firebase Storage`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al subir imagenes');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteImage = async (imagenId) => {
    if (!window.confirm('Desea eliminar esta imagen?')) return;
    try {
      await api.delete(`/images/${imagenId}`);
      setImagenes(imagenes.filter(img => img.id !== imagenId));
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar imagen');
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const paginated = records.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Registros Medicos</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Nuevo Registro
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          label="ID del Paciente" size="small" value={searchId}
          onChange={(e) => setSearchId(e.target.value)} sx={{ flexGrow: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button variant="outlined" onClick={handleSearch}>Buscar</Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Tipo</strong></TableCell>
              <TableCell><strong>Diagnostico</strong></TableCell>
              <TableCell><strong>Medico</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell><strong>Version</strong></TableCell>
              <TableCell><strong>Blockchain</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  {searched ? 'No se encontraron registros' : 'Busque por ID de paciente para ver registros'}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell><code style={{ fontSize: 11 }}>{r.id}</code></TableCell>
                  <TableCell><Chip label={r.tipo} size="small" color={tipoColor[r.tipo] || 'default'} /></TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.diagnostico}</TableCell>
                  <TableCell>{r.medicoNombre || r.medicoId}</TableCell>
                  <TableCell>{r.fechaCreacion ? new Date(r.fechaCreacion).toLocaleDateString('es-VE') : r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-VE') : '-'}</TableCell>
                  <TableCell>v{r.version}</TableCell>
                  <TableCell>
                    <Chip label={r.enBlockchain ? 'Si' : 'No'} size="small" color={r.enBlockchain ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver imagenes">
                      <IconButton size="small" color="primary" onClick={() => handleViewImages(r)}>
                        <CollectionsIcon />
                      </IconButton>
                    </Tooltip>
                    {canUploadImages && (
                      <Tooltip title="Subir imagenes">
                        <IconButton size="small" color="secondary" onClick={() => handleOpenUpload(r)}>
                          <PhotoCameraIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Verificar integridad">
                      <IconButton size="small" color="success" onClick={() => handleVerify(r.id)}>
                        <VerifiedIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Ver historial">
                      <IconButton size="small" color="info" onClick={() => handleHistory(r.id)}>
                        <HistoryIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {records.length > 0 && (
          <TablePagination
            component="div" count={records.length} page={page} rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Filas por pagina"
          />
        )}
      </TableContainer>

      {/* Resultado de verificacion */}
      {verifyResult && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>Resultado de Verificacion</Typography>
          {verifyResult.error ? (
            <Alert severity="error">{verifyResult.error}</Alert>
          ) : (
            <Alert severity={verifyResult.integridadOk ? 'success' : 'error'}>
              <strong>{verifyResult.integridadOk ? 'Integridad verificada' : 'INTEGRIDAD COMPROMETIDA'}</strong>
              <br />Registro: {verifyResult.registroId}
              <br />Hash almacenado: <code>{verifyResult.hashAlmacenado}</code>
              <br />Hash calculado: <code>{verifyResult.hashCalculado}</code>
              {verifyResult.fuente && <><br />Fuente: {verifyResult.fuente}</>}
            </Alert>
          )}
        </Paper>
      )}

      {/* Resultado de historial */}
      {historyResult && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>Historial de Cambios</Typography>
          {historyResult.error ? (
            <Alert severity="error">{historyResult.error}</Alert>
          ) : (
            <>
              {historyResult.fuente && (
                <Chip label={`Fuente: ${historyResult.fuente}`} size="small" color={historyResult.fuente === 'blockchain' ? 'success' : 'default'} sx={{ mb: 1 }} />
              )}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>TX ID</TableCell>
                      <TableCell>Timestamp</TableCell>
                      <TableCell>Version</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(historyResult.historial || []).map((h, i) => (
                      <TableRow key={i}>
                        <TableCell><code style={{ fontSize: 10 }}>{typeof h.txId === 'string' ? h.txId.slice(0, 16) + '...' : 'N/A'}</code></TableCell>
                        <TableCell>{h.timestamp ? (typeof h.timestamp === 'object' ? new Date(h.timestamp.seconds * 1000).toLocaleString('es-VE') : new Date(h.timestamp).toLocaleString('es-VE')) : 'N/A'}</TableCell>
                        <TableCell>{h.version || (i + 1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>
      )}

      {/* Dialog crear registro */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Registro Medico</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField fullWidth label="ID del Paciente" margin="dense" value={form.pacienteId} onChange={(e) => setForm({ ...form, pacienteId: e.target.value })} required />
          <TextField fullWidth select label="Tipo" margin="dense" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} required>
            {TIPOS_REGISTRO.map((t) => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Diagnostico" margin="dense" multiline rows={3} value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} required />
          <TextField fullWidth label="Tratamiento" margin="dense" multiline rows={2} value={form.tratamiento} onChange={(e) => setForm({ ...form, tratamiento: e.target.value })} />
          <TextField fullWidth label="Notas" margin="dense" multiline rows={2} value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!form.pacienteId || !form.tipo || !form.diagnostico}>
            Crear Registro
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog ver imagenes de un registro */}
      <Dialog open={imageDialog} onClose={() => setImageDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Imagenes del Registro {selectedRecord?.id}
          {canUploadImages && (
            <Button size="small" startIcon={<CloudUploadIcon />} sx={{ ml: 2 }}
              onClick={() => { setImageDialog(false); handleOpenUpload(selectedRecord); }}>
              Subir
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          {loadingImages ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : imagenes.length === 0 ? (
            <Alert severity="info">
              Este registro no tiene imagenes adjuntas.
              {canUploadImages && ' Puede subir imagenes con el boton "Subir".'}
            </Alert>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {imagenes.length} imagen(es) almacenada(s) en Firebase Storage
              </Typography>
              <ImageList cols={3} gap={12}>
                {imagenes.map((img) => (
                  <ImageListItem key={img.id} sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
                    {img.tipoMime?.startsWith('image/') ? (
                      <img
                        src={img.firebaseUrl}
                        alt={img.nombreOriginal}
                        loading="lazy"
                        style={{ height: 200, objectFit: 'cover' }}
                      />
                    ) : (
                      <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
                        <Typography variant="body2" color="text.secondary">
                          {img.tipoMime?.includes('pdf') ? 'PDF' : img.tipoMime?.split('/')[1]?.toUpperCase() || 'Archivo'}
                        </Typography>
                      </Box>
                    )}
                    <ImageListItemBar
                      title={img.nombreOriginal}
                      subtitle={
                        <span>
                          {img.categoria} | {formatSize(img.tamanioBytes)} | {new Date(img.createdAt).toLocaleDateString('es-VE')}
                        </span>
                      }
                      actionIcon={
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Verificar integridad">
                            <IconButton size="small" sx={{ color: '#4ade80' }}
                              onClick={async () => {
                                try {
                                  const res = await api.get(`/images/${img.id}/verify`);
                                  alert(res.data.integridadOk
                                    ? 'Integridad OK: la imagen no ha sido alterada'
                                    : 'ALERTA: la imagen fue modificada');
                                } catch (e) { alert('Error al verificar'); }
                              }}>
                              <VerifiedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {['medico', 'admin'].includes(user?.role) && (
                            <Tooltip title="Eliminar">
                              <IconButton size="small" sx={{ color: '#f87171' }} onClick={() => handleDeleteImage(img.id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      }
                    />
                  </ImageListItem>
                ))}
              </ImageList>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog subir imagenes */}
      <Dialog open={imageUploadDialog} onClose={() => !uploadingImages && setImageUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Subir Imagenes al Registro {selectedRecord?.id}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Las imagenes se almacenan en Firebase Storage. Solo la referencia se guarda en blockchain.
            <br />Formatos: JPEG, PNG, GIF, WebP, BMP, TIFF, DICOM, PDF. Max 10 MB/imagen.
          </Alert>

          <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />} fullWidth sx={{ mb: 2, py: 2 }}>
            {uploadFiles.length > 0
              ? `${uploadFiles.length} archivo(s) seleccionado(s)`
              : 'Seleccionar imagenes'
            }
            <input type="file" hidden multiple accept="image/*,.pdf,.dcm"
              onChange={(e) => setUploadFiles(Array.from(e.target.files))}
            />
          </Button>

          {uploadFiles.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1, mb: 2, maxHeight: 120, overflow: 'auto' }}>
              {uploadFiles.map((f, i) => (
                <Typography key={i} variant="body2" color="text.secondary">
                  {f.name} ({formatSize(f.size)})
                </Typography>
              ))}
            </Paper>
          )}

          <TextField fullWidth select label="Categoria" margin="dense" value={uploadCategoria}
            onChange={(e) => setUploadCategoria(e.target.value)}>
            {CATEGORIAS_IMAGEN.map((c) => (
              <MenuItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1).replace('_', ' ')}</MenuItem>
            ))}
          </TextField>

          <TextField fullWidth label="Descripcion (opcional)" margin="dense" multiline rows={2}
            value={uploadDescripcion} onChange={(e) => setUploadDescripcion(e.target.value)} />

          {uploadingImages && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                Subiendo a Firebase Storage... {Math.round(uploadProgress)}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageUploadDialog(false)} disabled={uploadingImages}>Cancelar</Button>
          <Button onClick={handleUploadImages} variant="contained" startIcon={<CloudUploadIcon />}
            disabled={uploadFiles.length === 0 || uploadingImages}>
            {uploadingImages ? 'Subiendo...' : `Subir ${uploadFiles.length} imagen(es)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
