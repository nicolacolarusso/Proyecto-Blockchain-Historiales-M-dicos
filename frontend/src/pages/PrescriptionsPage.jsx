import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, TextField, Button, Box, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Tooltip, TablePagination, Divider, Dialog, DialogContent,
  AppBar, Toolbar, Grid
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import MedicationIcon from '@mui/icons-material/Medication';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function PrescriptionsPage() {
  const { user } = useAuth();
  const isMedico = user?.role === 'medico';
  const isFarmacia = user?.role === 'farmacia';
  const isPaciente = user?.role === 'paciente';

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ pacienteId: '', indicaciones: '', duracionDias: '30' });
  const [medicamentos, setMedicamentos] = useState([{ nombre: '', dosis: '', frecuencia: '', via: 'oral' }]);
  const [searchId, setSearchId] = useState('');
  const [recetas, setRecetas] = useState([]);
  const [message, setMessage] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialogo detalle
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedReceta, setSelectedReceta] = useState(null);
  const [verifyInfo, setVerifyInfo] = useState(null);

  // Si es paciente, cargar sus recetas automaticamente
  useEffect(() => {
    if (isPaciente) {
      (async () => {
        try {
          const meRes = await api.get('/patients/me');
          const patientId = meRes.data.id;
          setSearchId(patientId);
          const res = await api.get(`/prescriptions/patient/${patientId}`);
          setRecetas(res.data);
        } catch (err) {
          setMessage({ type: 'error', text: err.response?.data?.error || 'Error al cargar tus recetas' });
        }
      })();
    }
  }, []);

  const addMedicamento = () => {
    setMedicamentos([...medicamentos, { nombre: '', dosis: '', frecuencia: '', via: 'oral' }]);
  };

  const removeMedicamento = (idx) => {
    if (medicamentos.length > 1) {
      setMedicamentos(medicamentos.filter((_, i) => i !== idx));
    }
  };

  const updateMedicamento = (idx, field, value) => {
    const updated = [...medicamentos];
    updated[idx][field] = value;
    setMedicamentos(updated);
  };

  const handleEmitir = async () => {
    if (!form.pacienteId || !medicamentos[0].nombre) {
      setMessage({ type: 'error', text: 'ID paciente y al menos un medicamento son requeridos' });
      return;
    }
    try {
      const res = await api.post('/prescriptions', {
        pacienteId: form.pacienteId,
        medicamentos: medicamentos.filter(m => m.nombre),
        indicaciones: form.indicaciones,
        duracionDias: parseInt(form.duracionDias) || 30
      });
      setMessage({ type: 'success', text: `Receta ${res.data.id} emitida exitosamente (blockchain: ${res.data.enBlockchain})` });
      setForm({ pacienteId: '', indicaciones: '', duracionDias: '30' });
      setMedicamentos([{ nombre: '', dosis: '', frecuencia: '', via: 'oral' }]);
      setShowForm(false);
      if (searchId === form.pacienteId) {
        setRecetas([res.data, ...recetas]);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al emitir receta' });
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    try {
      const res = await api.get(`/prescriptions/patient/${searchId}`);
      setRecetas(res.data);
      setPage(0);
      if (res.data.length === 0) {
        setMessage({ type: 'info', text: 'No se encontraron recetas para este paciente' });
      } else {
        setMessage(null);
      }
    } catch (err) {
      setRecetas([]);
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al buscar' });
    }
  };

  const handleDispensar = async (id) => {
    try {
      const res = await api.post(`/prescriptions/${id}/dispense`, {
        farmaciaId: user.username,
        notas: 'Dispensado correctamente'
      });
      setRecetas(recetas.map(r => r.id === id ? res.data : r));
      // Si esta abierta la receta dispensada, actualizar tambien
      if (selectedReceta?.id === id) {
        setSelectedReceta(res.data);
      }
      setMessage({ type: 'success', text: `Receta ${id} dispensada exitosamente` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al dispensar' });
    }
  };

  const handleVerify = async (id) => {
    try {
      const res = await api.get(`/prescriptions/${id}/verify`);
      setVerifyInfo(res.data);
      setMessage({
        type: res.data.autentica ? 'success' : 'error',
        text: `Receta ${id}: ${res.data.autentica ? 'Autentica - verificada en blockchain' : 'NO AUTENTICA'} | Medico: ${res.data.medicoId || 'N/A'} | Estado: ${res.data.estado}`
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al verificar' });
    }
  };

  const handleOpenDetail = (receta) => {
    setSelectedReceta(receta);
    setVerifyInfo(null);
    setDetailDialog(true);
  };

  const handleCloseDetail = () => {
    setDetailDialog(false);
    setSelectedReceta(null);
    setVerifyInfo(null);
  };

  const estadoColor = (estado) => {
    switch (estado) {
      case 'activa': return 'success';
      case 'dispensada': return 'primary';
      case 'vencida': return 'warning';
      case 'cancelada': return 'error';
      default: return 'default';
    }
  };

  const paginatedRecetas = recetas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5">Prescripciones Medicas</Typography>
          <Typography variant="body2" color="text.secondary">
            Emision, consulta y dispensacion de recetas medicas
          </Typography>
        </Box>
        {isMedico && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(!showForm)}>
            Nueva Receta
          </Button>
        )}
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {showForm && isMedico && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Emitir Receta Medica</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField label="ID Paciente *" size="small" value={form.pacienteId}
              onChange={(e) => setForm({ ...form, pacienteId: e.target.value })} sx={{ flexGrow: 1 }} />
            <TextField label="Duracion (dias)" type="number" size="small" value={form.duracionDias}
              onChange={(e) => setForm({ ...form, duracionDias: e.target.value })} sx={{ width: 140 }} />
          </Box>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>Medicamentos</Typography>
          {medicamentos.map((med, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
              <TextField label="Medicamento *" size="small" value={med.nombre}
                onChange={(e) => updateMedicamento(idx, 'nombre', e.target.value)} sx={{ flexGrow: 1 }} />
              <TextField label="Dosis" size="small" value={med.dosis}
                onChange={(e) => updateMedicamento(idx, 'dosis', e.target.value)} sx={{ width: 120 }} />
              <TextField label="Frecuencia" size="small" value={med.frecuencia} placeholder="c/8h"
                onChange={(e) => updateMedicamento(idx, 'frecuencia', e.target.value)} sx={{ width: 120 }} />
              <TextField label="Via" size="small" value={med.via}
                onChange={(e) => updateMedicamento(idx, 'via', e.target.value)} sx={{ width: 100 }} />
              <IconButton size="small" onClick={() => removeMedicamento(idx)} disabled={medicamentos.length === 1}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button size="small" onClick={addMedicamento} sx={{ mb: 2 }}>+ Agregar medicamento</Button>

          <TextField label="Indicaciones generales" fullWidth multiline rows={2}
            value={form.indicaciones} onChange={(e) => setForm({ ...form, indicaciones: e.target.value })} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleEmitir}
              disabled={!form.pacienteId || !medicamentos[0].nombre}>
              Emitir Receta
            </Button>
            <Button variant="outlined" onClick={() => setShowForm(false)}>Cancelar</Button>
          </Box>
        </Paper>
      )}

      {!isPaciente && (
        <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField label="Buscar recetas por ID Paciente" size="small" value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flexGrow: 1 }} />
          <Button variant="outlined" startIcon={<SearchIcon />} onClick={handleSearch}>Buscar</Button>
        </Paper>
      )}

      {recetas.length > 0 && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID Receta</TableCell>
                  <TableCell>Medico</TableCell>
                  <TableCell>Medicamentos</TableCell>
                  <TableCell>Emision</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Blockchain</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedRecetas.map(r => (
                  <TableRow key={r.id} hover sx={{ cursor: 'pointer' }}
                    onClick={() => handleOpenDetail(r)}>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</TableCell>
                    <TableCell>{r.medicoNombre || r.medicoId}</TableCell>
                    <TableCell>{(r.medicamentos || []).map(m => m.nombre).join(', ')}</TableCell>
                    <TableCell>{new Date(r.fechaEmision).toLocaleDateString('es-VE')}</TableCell>
                    <TableCell>{new Date(r.fechaVencimiento).toLocaleDateString('es-VE')}</TableCell>
                    <TableCell><Chip label={r.estado} size="small" color={estadoColor(r.estado)} /></TableCell>
                    <TableCell>
                      <Chip label={r.enBlockchain ? 'Si' : 'No'} size="small"
                        color={r.enBlockchain ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Ver detalle completo">
                        <IconButton size="small" onClick={() => handleOpenDetail(r)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Verificar autenticidad">
                        <IconButton size="small" onClick={() => handleVerify(r.id)}>
                          <VerifiedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isFarmacia && r.estado === 'activa' && (
                        <Tooltip title="Dispensar receta">
                          <IconButton size="small" color="primary" onClick={() => handleDispensar(r.id)}>
                            <LocalPharmacyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={recetas.length} page={page}
            onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            labelRowsPerPage="Filas por pagina" />
        </Paper>
      )}

      {/* Dialog detalle completo de la receta */}
      <Dialog fullScreen open={detailDialog} onClose={handleCloseDetail}>
        <AppBar sx={{ position: 'relative' }} color="primary">
          <Toolbar>
            <MedicationIcon sx={{ mr: 2 }} />
            <Typography sx={{ flex: 1 }} variant="h6" component="div">
              Detalle de Receta Medica
            </Typography>
            <IconButton edge="end" color="inherit" onClick={handleCloseDetail}>
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
        <DialogContent sx={{ p: 3, bgcolor: '#f5f5f5' }}>
          {selectedReceta && (
            <Grid container spacing={3}>
              {/* Panel de informacion */}
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>Informacion</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip label={selectedReceta.estado} size="small" color={estadoColor(selectedReceta.estado)} />
                    <Chip label={selectedReceta.enBlockchain ? 'Blockchain Si' : 'Blockchain No'}
                      size="small" color={selectedReceta.enBlockchain ? 'success' : 'default'} />
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption" color="text.secondary">ID Receta</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11, mb: 1, wordBreak: 'break-all' }}>
                    {selectedReceta.id}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">ID Paciente</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11, mb: 1, wordBreak: 'break-all' }}>
                    {selectedReceta.pacienteId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Medico</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {selectedReceta.medicoNombre || selectedReceta.medicoId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Fecha de Emision</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {new Date(selectedReceta.fechaEmision).toLocaleString('es-VE')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Fecha de Vencimiento</Typography>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {new Date(selectedReceta.fechaVencimiento).toLocaleString('es-VE')}
                  </Typography>
                  {selectedReceta.duracionDias && (
                    <>
                      <Typography variant="caption" color="text.secondary">Duracion</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {selectedReceta.duracionDias} dias
                      </Typography>
                    </>
                  )}
                  <Divider sx={{ my: 2 }} />
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<VerifiedIcon />}
                    onClick={() => handleVerify(selectedReceta.id)}
                    size="small"
                    sx={{ mb: 1 }}
                  >
                    Verificar en Blockchain
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="secondary"
                    onClick={() => window.open(`/traceability?entidad=receta&id=${selectedReceta.id}`, '_blank')}
                    size="small"
                    sx={{ mb: 1 }}
                  >
                    Ver Trazabilidad
                  </Button>
                  {isFarmacia && selectedReceta.estado === 'activa' && (
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<LocalPharmacyIcon />}
                      onClick={() => handleDispensar(selectedReceta.id)}
                      size="small"
                    >
                      Dispensar Receta
                    </Button>
                  )}
                  {verifyInfo && (
                    <Alert severity={verifyInfo.autentica ? 'success' : 'error'} sx={{ mt: 2, fontSize: 12 }}>
                      <strong>{verifyInfo.autentica ? 'Autentica' : 'NO AUTENTICA'}</strong>
                      <br />
                      Estado: {verifyInfo.estado}
                      <br />
                      Medico: {verifyInfo.medicoId || 'N/A'}
                    </Alert>
                  )}
                </Paper>
              </Grid>

              {/* Contenido clinico */}
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>Medicamentos Prescritos</Typography>
                  <TableContainer component={Box} sx={{ mb: 3 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'primary.light' }}>
                          <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Medicamento</TableCell>
                          <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Dosis</TableCell>
                          <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Frecuencia</TableCell>
                          <TableCell sx={{ color: 'primary.contrastText', fontWeight: 'bold' }}>Via</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(selectedReceta.medicamentos || []).map((m, i) => (
                          <TableRow key={i} hover>
                            <TableCell sx={{ fontWeight: 'bold' }}>{m.nombre || '-'}</TableCell>
                            <TableCell>{m.dosis || '-'}</TableCell>
                            <TableCell>{m.frecuencia || '-'}</TableCell>
                            <TableCell>{m.via || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {selectedReceta.indicaciones && (
                    <>
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Indicaciones Generales
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#fffbe6' }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {selectedReceta.indicaciones}
                        </Typography>
                      </Paper>
                    </>
                  )}

                  {selectedReceta.dispensaciones && selectedReceta.dispensaciones.length > 0 && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" color="primary" gutterBottom>
                        Historial de Dispensaciones ({selectedReceta.dispensaciones.length})
                      </Typography>
                      {selectedReceta.dispensaciones.map((d, i) => (
                        <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1, bgcolor: '#e8f5e9' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Farmacia</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {d.farmaciaId}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary">Fecha</Typography>
                              <Typography variant="body2">
                                {new Date(d.fecha).toLocaleString('es-VE')}
                              </Typography>
                            </Box>
                          </Box>
                          {d.notas && (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">Notas</Typography>
                              <Typography variant="body2">{d.notas}</Typography>
                            </Box>
                          )}
                        </Paper>
                      ))}
                    </>
                  )}

                  {(!selectedReceta.dispensaciones || selectedReceta.dispensaciones.length === 0) && (
                    <Box sx={{ mt: 2, p: 2, textAlign: 'center', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Esta receta aun no ha sido dispensada
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </DialogContent>
      </Dialog>
    </Container>
  );
}
