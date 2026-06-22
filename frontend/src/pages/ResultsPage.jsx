import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, TextField, Button, Box, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Select, MenuItem, FormControl, InputLabel, Divider, IconButton,
  Tooltip, TablePagination, Dialog, DialogContent, DialogTitle, AppBar, Toolbar,
  Grid, ImageList, ImageListItem, ImageListItemBar, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TIPOS = ['laboratorio', 'imagen', 'patologia'];
const CATEGORIAS = {
  laboratorio: ['Hematologia', 'Quimica sanguinea', 'Urinalisis', 'Inmunologia', 'Microbiologia'],
  imagen: ['Radiografia', 'Resonancia magnetica', 'Tomografia', 'Ecografia', 'Mamografia'],
  patologia: ['Biopsia', 'Citologia', 'Histopatologia']
};

export default function ResultsPage() {
  const { user } = useAuth();
  const canCreate = ['laboratorista', 'radiologo', 'medico'].includes(user?.role);
  const isPaciente = user?.role === 'paciente';

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    pacienteId: '', tipo: 'laboratorio', categoria: '', descripcion: '',
    valores: '', unidades: '', referencia: '', observaciones: ''
  });
  const [searchId, setSearchId] = useState('');
  const [resultados, setResultados] = useState([]);
  const [message, setMessage] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [verifyInfo, setVerifyInfo] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Si es paciente, cargar sus resultados automaticamente
  useEffect(() => {
    if (isPaciente) {
      (async () => {
        try {
          const meRes = await api.get('/patients/me');
          const patientId = meRes.data.id;
          setSearchId(patientId);
          const res = await api.get(`/results/patient/${patientId}`);
          setResultados(res.data);
        } catch (err) {
          setMessage({ type: 'error', text: err.response?.data?.error || 'Error al cargar tus resultados' });
        }
      })();
    }
  }, []);

  const handleCreate = async () => {
    if (!form.pacienteId || !form.tipo || !form.categoria || !form.descripcion || !form.valores) {
      setMessage({ type: 'error', text: 'Complete los campos requeridos' });
      return;
    }
    try {
      const res = await api.post('/results', form);
      setMessage({ type: 'success', text: `Resultado ${res.data.id} creado exitosamente (blockchain: ${res.data.enBlockchain})` });
      setForm({ pacienteId: '', tipo: 'laboratorio', categoria: '', descripcion: '', valores: '', unidades: '', referencia: '', observaciones: '' });
      setShowForm(false);
      if (searchId === form.pacienteId) {
        setResultados([res.data, ...resultados]);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al crear resultado' });
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    try {
      const res = await api.get(`/results/patient/${searchId}`);
      setResultados(res.data);
      setPage(0);
      if (res.data.length === 0) {
        setMessage({ type: 'info', text: 'No se encontraron resultados para este paciente' });
      } else {
        setMessage(null);
      }
    } catch (err) {
      setResultados([]);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al buscar' });
    }
  };

  const handleVerify = async (id) => {
    try {
      const res = await api.get(`/results/${id}/verify`);
      const info = {
        integridadOk: res.data.integridadOk,
        hashAlmacenado: res.data.hashAlmacenado,
        hashCalculado: res.data.hashCalculado,
        fuente: res.data.fuente
      };
      setVerifyInfo(info);
      setMessage({
        type: res.data.integridadOk ? 'success' : 'error',
        text: `Resultado ${id}: Integridad ${res.data.integridadOk ? 'OK' : 'COMPROMETIDA'}`
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al verificar' });
    }
  };

  const handleOpenDetail = async (result) => {
    setSelectedResult(result);
    setDetailDialog(true);
    setVerifyInfo(null);
    // Intentar cargar imagenes asociadas (endpoint comparte ID entre registros e imagenes)
    setLoadingImages(true);
    try {
      const res = await api.get(`/images/record/${result.id}`);
      setImagenes(res.data.imagenes || []);
    } catch (err) {
      setImagenes([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const paginatedResults = resultados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5">Gestion de Resultados</Typography>
          <Typography variant="body2" color="text.secondary">
            Resultados de laboratorio, imagenes medicas y patologia
          </Typography>
        </Box>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(!showForm)}>
            Nuevo Resultado
          </Button>
        )}
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {showForm && canCreate && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Subir Resultado</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 2 }}>
            <TextField label="ID Paciente *" size="small" value={form.pacienteId}
              onChange={(e) => setForm({ ...form, pacienteId: e.target.value })} />
            <FormControl size="small">
              <InputLabel>Tipo *</InputLabel>
              <Select value={form.tipo} label="Tipo *"
                onChange={(e) => setForm({ ...form, tipo: e.target.value, categoria: '' })}>
                {TIPOS.map(t => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Categoria *</InputLabel>
              <Select value={form.categoria} label="Categoria *"
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {(CATEGORIAS[form.tipo] || []).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Unidades" size="small" value={form.unidades}
              onChange={(e) => setForm({ ...form, unidades: e.target.value })} />
            <TextField label="Valores de Referencia" size="small" value={form.referencia}
              onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
          </Box>
          <TextField label="Descripcion *" fullWidth multiline rows={2} sx={{ mt: 2 }}
            value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <TextField label="Valores/Resultados *" fullWidth multiline rows={2} sx={{ mt: 2 }}
            value={form.valores} onChange={(e) => setForm({ ...form, valores: e.target.value })} />
          <TextField label="Observaciones" fullWidth multiline rows={2} sx={{ mt: 2 }}
            value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleCreate}
              disabled={!form.pacienteId || !form.categoria || !form.descripcion || !form.valores}>
              Guardar Resultado
            </Button>
            <Button variant="outlined" onClick={() => setShowForm(false)}>Cancelar</Button>
          </Box>
        </Paper>
      )}

      {!isPaciente && (
        <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField label="Buscar por ID Paciente" size="small" value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flexGrow: 1 }} />
          <Button variant="outlined" startIcon={<SearchIcon />} onClick={handleSearch}>Buscar</Button>
        </Paper>
      )}

      {resultados.length > 0 && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Descripcion</TableCell>
                  <TableCell>Valores</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Blockchain</TableCell>
                  <TableCell align="center">Verificar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedResults.map(r => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => handleOpenDetail(r)}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</TableCell>
                    <TableCell>
                      <Chip label={r.tipo} size="small" color={
                        r.tipo === 'laboratorio' ? 'primary' : r.tipo === 'imagen' ? 'secondary' : 'default'
                      } />
                    </TableCell>
                    <TableCell>{r.categoria}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.descripcion}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.valores}
                    </TableCell>
                    <TableCell>{new Date(r.fechaCreacion).toLocaleDateString('es-VE')}</TableCell>
                    <TableCell>
                      <Chip label={r.enBlockchain ? 'Si' : 'No'} size="small"
                        color={r.enBlockchain ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" color="primary" onClick={() => handleOpenDetail(r)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={resultados.length} page={page}
            onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            labelRowsPerPage="Filas por pagina" />
        </Paper>
      )}

      {/* Dialog detalle completo del resultado */}
      <Dialog open={detailDialog} onClose={() => setDetailDialog(false)} fullScreen>
        <AppBar sx={{ position: 'relative' }} color="primary">
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => setDetailDialog(false)}>
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6">
              Resultado {selectedResult?.id}
            </Typography>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ bgcolor: '#f5f5f5', p: 3 }}>
          {selectedResult && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                    <Chip label={selectedResult.tipo} color={
                      selectedResult.tipo === 'laboratorio' ? 'primary'
                      : selectedResult.tipo === 'imagen' ? 'secondary' : 'default'
                    } />
                    <Chip label={selectedResult.categoria} size="small" />
                    <Chip label={selectedResult.enBlockchain ? 'En Blockchain' : 'Local'} size="small"
                      color={selectedResult.enBlockchain ? 'success' : 'default'} />
                    <Chip label={`v${selectedResult.version}`} size="small" />
                  </Box>

                  <Typography variant="overline" color="text.secondary">ID Resultado</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    {selectedResult.id}
                  </Typography>

                  <Typography variant="overline" color="text.secondary">ID Paciente</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace', mb: 2 }}>
                    {selectedResult.pacienteId}
                  </Typography>

                  <Typography variant="overline" color="text.secondary">Profesional</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedResult.profesionalNombre || selectedResult.profesionalId}
                  </Typography>

                  <Typography variant="overline" color="text.secondary">Fecha</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {new Date(selectedResult.fechaCreacion).toLocaleString('es-VE')}
                  </Typography>

                  <Typography variant="overline" color="text.secondary">Estado</Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedResult.estado}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Button size="small" variant="outlined" startIcon={<VerifiedIcon />}
                    onClick={() => handleVerify(selectedResult.id)}>
                    Verificar Integridad
                  </Button>
                  <Button size="small" variant="outlined" color="secondary"
                    sx={{ mt: 1, ml: 1 }}
                    onClick={() => window.open(`/traceability?entidad=resultado&id=${selectedResult.id}`, '_blank')}>
                    Ver Trazabilidad
                  </Button>

                  {verifyInfo && (
                    <Alert severity={verifyInfo.integridadOk ? 'success' : 'error'}
                      sx={{ mt: 2 }} onClose={() => setVerifyInfo(null)}>
                      <strong>{verifyInfo.integridadOk ? 'Integridad OK' : 'Integridad COMPROMETIDA'}</strong>
                      <Box sx={{ fontSize: 10, mt: 1, wordBreak: 'break-all' }}>
                        Hash: {verifyInfo.hashAlmacenado}
                      </Box>
                    </Alert>
                  )}
                </Paper>
              </Grid>

              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 3, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>Descripcion</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {selectedResult.descripcion || '—'}
                  </Typography>
                </Paper>

                <Paper sx={{ p: 3, mb: 2 }}>
                  <Typography variant="h6" gutterBottom>Valores / Resultados</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {selectedResult.valores || '—'}
                  </Typography>
                  {selectedResult.unidades && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Unidades: {selectedResult.unidades}
                    </Typography>
                  )}
                  {selectedResult.referencia && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Referencia: {selectedResult.referencia}
                    </Typography>
                  )}
                </Paper>

                {selectedResult.observaciones && (
                  <Paper sx={{ p: 3, mb: 2 }}>
                    <Typography variant="h6" gutterBottom>Observaciones</Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {selectedResult.observaciones}
                    </Typography>
                  </Paper>
                )}
              </Grid>

              {/* Imagenes asociadas si existen */}
              {(loadingImages || imagenes.length > 0) && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                      Imagenes Asociadas {imagenes.length > 0 && `(${imagenes.length})`}
                    </Typography>

                    {loadingImages ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <ImageList cols={4} gap={12} sx={{ maxHeight: 'none' }}>
                        {imagenes.map((img) => (
                          <ImageListItem key={img.id} sx={{ border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
                            {img.tipoMime?.startsWith('image/') ? (
                              <img src={img.firebaseUrl} alt={img.nombreOriginal} loading="lazy"
                                style={{ height: 240, objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => setPreviewImage(img)} />
                            ) : (
                              <Box sx={{ height: 240, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', bgcolor: '#f5f5f5', cursor: 'pointer' }}
                                onClick={() => window.open(img.firebaseUrl, '_blank')}>
                                <Typography variant="h4" color="text.secondary">
                                  {img.tipoMime?.includes('pdf') ? 'PDF' : 'ARCHIVO'}
                                </Typography>
                              </Box>
                            )}
                            <ImageListItemBar title={img.nombreOriginal}
                              subtitle={`${img.categoria} | ${formatSize(img.tamanioBytes)}`} />
                          </ImageListItem>
                        ))}
                      </ImageList>
                    )}
                  </Paper>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog preview imagen */}
      <Dialog open={!!previewImage} onClose={() => setPreviewImage(null)} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {previewImage?.nombreOriginal}
          <IconButton onClick={() => setPreviewImage(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', bgcolor: '#000' }}>
          {previewImage && (
            <img src={previewImage.firebaseUrl} alt={previewImage.nombreOriginal}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
