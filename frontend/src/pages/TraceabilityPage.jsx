import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container, Typography, Paper, TextField, Button, Box, Alert,
  MenuItem, CircularProgress, Chip, Grid, Card, CardContent, Divider, Tooltip
} from '@mui/material';
import {
  Timeline, TimelineItem, TimelineSeparator, TimelineConnector,
  TimelineContent, TimelineDot, TimelineOppositeContent
} from '@mui/lab';
import SearchIcon from '@mui/icons-material/Search';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import BlockIcon from '@mui/icons-material/Block';
import LoginIcon from '@mui/icons-material/Login';
import LocalPharmacyIcon from '@mui/icons-material/LocalPharmacy';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TimelineIconMui from '@mui/icons-material/Timeline';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import api from '../services/api';

const TIPOS_ENTIDAD = [
  { value: 'registro', label: 'Registro Medico', prefix: 'REG-' },
  { value: 'resultado', label: 'Resultado', prefix: 'RES-' },
  { value: 'receta', label: 'Receta Medica', prefix: 'REC-' },
  { value: 'paciente', label: 'Paciente', prefix: 'PAC-' },
  { value: 'usuario', label: 'Usuario', prefix: '' },
  { value: 'imagen', label: 'Imagen', prefix: 'IMG-' }
];

const accionIcono = (accion) => {
  switch (accion) {
    case 'CREAR': return { icon: <AddCircleIcon />, color: 'success' };
    case 'ACTUALIZAR': return { icon: <EditIcon />, color: 'warning' };
    case 'CONSULTAR': return { icon: <VisibilityIcon />, color: 'info' };
    case 'ELIMINAR': return { icon: <DeleteIcon />, color: 'error' };
    case 'COMPARTIR': return { icon: <ShareIcon />, color: 'primary' };
    case 'REVOCAR': return { icon: <BlockIcon />, color: 'error' };
    case 'LOGIN': return { icon: <LoginIcon />, color: 'primary' };
    case 'DISPENSAR': return { icon: <LocalPharmacyIcon />, color: 'success' };
    case 'SUBIR_IMAGENES': return { icon: <CloudUploadIcon />, color: 'secondary' };
    case 'TX_BLOCKCHAIN': return { icon: <LinkIcon />, color: 'primary' };
    case 'CONSULTAR_TRAZABILIDAD': return { icon: <TimelineIconMui />, color: 'info' };
    default: return { icon: <EditIcon />, color: 'default' };
  }
};

export default function TraceabilityPage() {
  const [searchParams] = useSearchParams();
  const [entidad, setEntidad] = useState(searchParams.get('entidad') || 'registro');
  const [entidadId, setEntidadId] = useState(searchParams.get('id') || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blockchainStatus, setBlockchainStatus] = useState(null);

  useEffect(() => {
    loadBlockchainStatus();
    // Si llegan parametros en la URL, ejecutar busqueda automaticamente
    if (searchParams.get('id')) {
      setTimeout(() => handleSearch(), 100);
    }
  }, []);

  const loadBlockchainStatus = async () => {
    try {
      const res = await api.get('/audit/blockchain/status');
      setBlockchainStatus(res.data);
    } catch (err) {
      console.error('Error estado blockchain:', err);
    }
  };

  const handleSearch = async () => {
    if (!entidadId.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.get(`/audit/traceability/${entidad}/${entidadId}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cargar trazabilidad');
    } finally {
      setLoading(false);
    }
  };

  const formatDetalles = (d) => {
    if (!d) return null;
    if (typeof d === 'string') return d;
    return Object.entries(d).slice(0, 3).map(([k, v]) => {
      let val = typeof v === 'string' ? v : JSON.stringify(v);
      if (val.length > 80) val = val.substring(0, 80) + '...';
      return `${k}: ${val}`;
    }).join(' | ');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <AccountTreeIcon color="primary" fontSize="large" />
        <Box>
          <Typography variant="h5">Trazabilidad Blockchain</Typography>
          <Typography variant="body2" color="text.secondary">
            Ciclo de vida completo de cualquier entidad en el sistema
          </Typography>
        </Box>
      </Box>

      {/* Estado de la red */}
      {blockchainStatus && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: blockchainStatus.disponible ? 'success.light' : 'error.light' }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {blockchainStatus.disponible
                  ? <CheckCircleIcon sx={{ fontSize: 40, color: 'success.dark' }} />
                  : <CancelIcon sx={{ fontSize: 40, color: 'error.dark' }} />}
                <Box>
                  <Typography variant="h6">
                    {blockchainStatus.disponible ? 'Conectada' : 'Desconectada'}
                  </Typography>
                  <Typography variant="caption">Red Hyperledger Fabric</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={9}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Smart Contracts desplegados</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {blockchainStatus.chaincodes.length > 0
                    ? blockchainStatus.chaincodes.map(cc => (
                      <Chip key={cc} label={cc} size="small" color="primary" variant="outlined" icon={<LinkIcon />} />
                    ))
                    : <Typography variant="body2" color="text.secondary">Sin chaincodes activos</Typography>}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Formulario de busqueda */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Consultar trazabilidad de una entidad</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField select fullWidth size="small" label="Tipo de entidad"
              value={entidad} onChange={(e) => setEntidad(e.target.value)}>
              {TIPOS_ENTIDAD.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth size="small" label="ID de la entidad"
              value={entidadId} onChange={(e) => setEntidadId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={TIPOS_ENTIDAD.find(t => t.value === entidad)?.prefix + 'XXXXXXXX'} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button fullWidth variant="contained" startIcon={<SearchIcon />}
              onClick={handleSearch} disabled={loading || !entidadId.trim()}>
              Consultar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /></Box>}
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {data && (
        <>
          {/* Resumen */}
          <Paper sx={{ p: 3, mb: 3, bgcolor: '#f0f4ff' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <Typography variant="overline" color="text.secondary">Entidad</Typography>
                <Typography variant="h6">{data.entidad}</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{data.entidadId}</Typography>
              </Grid>
              <Grid item xs={6} md={4}>
                <Typography variant="overline" color="text.secondary">Eventos registrados</Typography>
                <Typography variant="h4" color="primary">{data.totalEventos}</Typography>
              </Grid>
              <Grid item xs={6} md={4}>
                <Typography variant="overline" color="text.secondary">Blockchain</Typography>
                <Chip
                  label={data.blockchainDisponible ? 'Datos verificados' : 'Solo audit DB'}
                  color={data.blockchainDisponible ? 'success' : 'default'}
                  icon={data.blockchainDisponible ? <LinkIcon /> : <BlockIcon />}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Timeline */}
          {data.eventos.length > 0 ? (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Linea de tiempo</Typography>
              <Divider sx={{ mb: 2 }} />
              <Timeline position="alternate">
                {data.eventos.map((ev, idx) => {
                  const { icon, color } = accionIcono(ev.tipo);
                  const isBlockchain = ev.fuente === 'blockchain';
                  return (
                    <TimelineItem key={idx}>
                      <TimelineOppositeContent sx={{ py: 2 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(ev.timestamp).toLocaleString('es-VE')}
                        </Typography>
                        {isBlockchain && (
                          <Box sx={{ mt: 0.5 }}>
                            <Chip label="BLOCKCHAIN" size="small" color="primary" icon={<LinkIcon />} />
                          </Box>
                        )}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot color={color}>
                          {icon}
                        </TimelineDot>
                        {idx < data.eventos.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent sx={{ py: 2 }}>
                        <Paper elevation={2} sx={{ p: 2, bgcolor: isBlockchain ? '#e3f2fd' : '#fff' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {ev.tipo.replace(/_/g, ' ')}
                          </Typography>
                          {ev.usuario && (
                            <Typography variant="body2">
                              Usuario: <strong>{ev.usuario}</strong>
                              {ev.rol && <Chip label={ev.rol} size="small" variant="outlined" sx={{ ml: 1, height: 18, fontSize: 10 }} />}
                            </Typography>
                          )}
                          {ev.version && (
                            <Typography variant="body2">Version: <strong>{ev.version}</strong></Typography>
                          )}
                          {ev.txId && (
                            <Tooltip title={ev.txId}>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                                TX: {ev.txId.substring(0, 20)}...
                              </Typography>
                            </Tooltip>
                          )}
                          {ev.hash && (
                            <Tooltip title={ev.hash}>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', color: 'success.dark' }}>
                                Hash: {ev.hash.substring(0, 16)}...
                              </Typography>
                            </Tooltip>
                          )}
                          {ev.ip && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              IP: {ev.ip}
                            </Typography>
                          )}
                          {ev.detalles && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              {formatDetalles(ev.detalles)}
                            </Typography>
                          )}
                        </Paper>
                      </TimelineContent>
                    </TimelineItem>
                  );
                })}
              </Timeline>
            </Paper>
          ) : (
            <Alert severity="info">
              No se encontraron eventos para esta entidad. Verifique que el ID sea correcto.
            </Alert>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#fafafa' }}>
          <AccountTreeIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>Ingrese una entidad para ver su trazabilidad</Typography>
          <Typography variant="body2" color="text.secondary">
            El sistema combina el historial del blockchain con los logs de auditoria
            para mostrar un ciclo de vida completo: creacion, consultas, modificaciones,
            accesos y cualquier otra accion ejecutada sobre la entidad.
          </Typography>
        </Paper>
      )}
    </Container>
  );
}
