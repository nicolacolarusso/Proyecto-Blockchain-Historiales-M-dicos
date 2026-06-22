import { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, TextField, Button, Box, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, CircularProgress, Divider, Tabs, Tab, Grid, MenuItem,
  TablePagination, IconButton, Tooltip, Card, CardContent
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import BarChartIcon from '@mui/icons-material/BarChart';
import FilterListIcon from '@mui/icons-material/FilterList';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from '../services/api';

const ACCIONES = ['CREAR', 'CONSULTAR', 'ACTUALIZAR', 'ELIMINAR', 'COMPARTIR', 'REVOCAR', 'LOGIN', 'REGISTRO_USUARIO', 'DISPENSAR', 'SUBIR_IMAGEN'];
const ENTIDADES = ['registro', 'resultado', 'receta', 'paciente', 'usuario', 'permiso', 'imagen'];
const ROLES = ['admin', 'medico', 'paciente', 'administrativo', 'auditor', 'laboratorista', 'radiologo', 'farmacia'];

const accionColor = (a) => {
  switch (a) {
    case 'CREAR': return 'success';
    case 'CONSULTAR': return 'info';
    case 'ACTUALIZAR': return 'warning';
    case 'ELIMINAR': return 'error';
    case 'LOGIN': return 'primary';
    case 'COMPARTIR': return 'secondary';
    case 'REVOCAR': return 'error';
    case 'DISPENSAR': return 'success';
    default: return 'default';
  }
};

export default function AuditPage() {
  const [tab, setTab] = useState(0);

  // --- Logs ---
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filters, setFilters] = useState({
    accion: '', entidad: '', entidadId: '', usuarioId: '', usuarioRole: '', desde: '', hasta: ''
  });
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  // --- Stats ---
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // --- Verificacion de registro (legacy) ---
  const [registroId, setRegistroId] = useState('');
  const [integridad, setIntegridad] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLogs();
    loadStats();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, rowsPerPage]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page + 1);
      params.append('limit', rowsPerPage);
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params.append(k, v);
      });
      const res = await api.get(`/audit?${params.toString()}`);
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Error cargando logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const params = new URLSearchParams();
      if (filters.desde) params.append('desde', filters.desde);
      if (filters.hasta) params.append('hasta', filters.hasta);
      const res = await api.get(`/audit/stats?${params.toString()}`);
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleFilter = () => {
    setPage(0);
    loadLogs();
    loadStats();
  };

  const handleClearFilters = () => {
    setFilters({ accion: '', entidad: '', entidadId: '', usuarioId: '', usuarioRole: '', desde: '', hasta: '' });
    setPage(0);
    setTimeout(() => { loadLogs(); loadStats(); }, 100);
  };

  const handleVerify = async () => {
    if (!registroId.trim()) return;
    setLoading(true);
    setError(null);
    setIntegridad(null);
    try {
      const res = await api.get(`/records/${registroId}/verify`);
      setIntegridad(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al verificar integridad');
    } finally {
      setLoading(false);
    }
  };

  const handleHistory = async () => {
    if (!registroId.trim()) return;
    setLoading(true);
    setError(null);
    setHistorial(null);
    try {
      const res = await api.get(`/records/${registroId}/history`);
      setHistorial(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al obtener historial');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Auditoria y Trazabilidad</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Registro completo de todas las acciones realizadas en el sistema
      </Typography>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Registro de Auditoria" icon={<HistoryIcon />} iconPosition="start" />
        <Tab label="Estadisticas" icon={<BarChartIcon />} iconPosition="start" />
        <Tab label="Integridad de Registro" icon={<VerifiedIcon />} iconPosition="start" />
      </Tabs>

      {/* --- TAB 0: LOGS --- */}
      {tab === 0 && (
        <>
          {/* Filtros */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
              <FilterListIcon color="primary" />
              <Typography variant="subtitle1">Filtros</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField select fullWidth size="small" label="Accion"
                  value={filters.accion} onChange={(e) => setFilters({ ...filters, accion: e.target.value })}>
                  <MenuItem value="">Todas</MenuItem>
                  {ACCIONES.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField select fullWidth size="small" label="Entidad"
                  value={filters.entidad} onChange={(e) => setFilters({ ...filters, entidad: e.target.value })}>
                  <MenuItem value="">Todas</MenuItem>
                  {ENTIDADES.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField select fullWidth size="small" label="Rol"
                  value={filters.usuarioRole} onChange={(e) => setFilters({ ...filters, usuarioRole: e.target.value })}>
                  <MenuItem value="">Todos</MenuItem>
                  {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="Usuario"
                  value={filters.usuarioId} onChange={(e) => setFilters({ ...filters, usuarioId: e.target.value })}
                  placeholder="username" />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" label="Entidad ID"
                  value={filters.entidadId} onChange={(e) => setFilters({ ...filters, entidadId: e.target.value })}
                  placeholder="REG-XXX, PAC-XXX..." />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" type="datetime-local" label="Desde"
                  InputLabelProps={{ shrink: true }}
                  value={filters.desde} onChange={(e) => setFilters({ ...filters, desde: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <TextField fullWidth size="small" type="datetime-local" label="Hasta"
                  InputLabelProps={{ shrink: true }}
                  value={filters.hasta} onChange={(e) => setFilters({ ...filters, hasta: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button variant="contained" startIcon={<SearchIcon />} onClick={handleFilter} fullWidth>
                  Filtrar
                </Button>
                <Tooltip title="Limpiar">
                  <IconButton onClick={handleClearFilters}><RefreshIcon /></IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </Paper>

          {/* Tabla de logs */}
          <Paper>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1">
                {total} evento{total !== 1 ? 's' : ''} registrado{total !== 1 ? 's' : ''}
              </Typography>
              {loadingLogs && <CircularProgress size={20} />}
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha / Hora</TableCell>
                    <TableCell>Accion</TableCell>
                    <TableCell>Entidad</TableCell>
                    <TableCell>Entidad ID</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Rol</TableCell>
                    <TableCell>IP</TableCell>
                    <TableCell align="center">Detalles</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(log.createdAt).toLocaleString('es-VE')}
                      </TableCell>
                      <TableCell>
                        <Chip label={log.accion} size="small" color={accionColor(log.accion)} />
                      </TableCell>
                      <TableCell>{log.entidad}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.entidadId || '-'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{log.usuarioId || '-'}</TableCell>
                      <TableCell>
                        {log.usuarioRole && <Chip label={log.usuarioRole} size="small" variant="outlined" />}
                      </TableCell>
                      <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>{log.ip || '-'}</TableCell>
                      <TableCell align="center">
                        {log.detalles && (
                          <Tooltip title="Ver detalles">
                            <IconButton size="small" onClick={() => setSelectedLog(log)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && !loadingLogs && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No hay eventos que coincidan con los filtros
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={total} page={page}
              onPageChange={(e, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              labelRowsPerPage="Filas por pagina" />
          </Paper>

          {/* Panel de detalles expandido */}
          {selectedLog && (
            <Paper sx={{ p: 3, mt: 2, bgcolor: '#f9fbe7' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Detalles del Evento</Typography>
                <Button size="small" onClick={() => setSelectedLog(null)}>Cerrar</Button>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="caption" color="text.secondary">ID Evento</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }}>{selectedLog.id}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="caption" color="text.secondary">Fecha</Typography>
                  <Typography variant="body2">{new Date(selectedLog.createdAt).toLocaleString('es-VE')}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="caption" color="text.secondary">Usuario / Rol</Typography>
                  <Typography variant="body2">{selectedLog.usuarioId} ({selectedLog.usuarioRole})</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="caption" color="text.secondary">IP Origen</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{selectedLog.ip || '-'}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">Metadatos (JSON)</Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fff', fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {JSON.stringify(selectedLog.detalles, null, 2)}
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          )}
        </>
      )}

      {/* --- TAB 1: STATS --- */}
      {tab === 1 && stats && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <CardContent>
                  <Typography variant="h3">{stats.total}</Typography>
                  <Typography variant="body2">Eventos totales</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}>
                <CardContent>
                  <Typography variant="h3">{stats.porAccion.CREAR || 0}</Typography>
                  <Typography variant="body2">Creaciones</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText' }}>
                <CardContent>
                  <Typography variant="h3">{stats.porAccion.CONSULTAR || 0}</Typography>
                  <Typography variant="body2">Consultas</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
                <CardContent>
                  <Typography variant="h3">{stats.porAccion.ACTUALIZAR || 0}</Typography>
                  <Typography variant="body2">Actualizaciones</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Por Accion</Typography>
                {Object.entries(stats.porAccion).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Chip label={k} size="small" color={accionColor(k)} />
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{v}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Por Entidad</Typography>
                {Object.entries(stats.porEntidad).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">{k}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{v}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Por Rol</Typography>
                {Object.entries(stats.porRole).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                  <Box key={k} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                    <Typography variant="body2">{k}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{v}</Typography>
                  </Box>
                ))}
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Top 10 Usuarios mas Activos</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>#</TableCell>
                      <TableCell>Usuario</TableCell>
                      <TableCell align="right">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.topUsuarios.map((u, i) => (
                      <TableRow key={u.usuarioId}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>{u.usuarioId}</TableCell>
                        <TableCell align="right">{u.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}

      {/* --- TAB 2: INTEGRIDAD --- */}
      {tab === 2 && (
        <>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Verificar Integridad de un Registro</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="ID del Registro (ej: REG-XXXXXXXX)"
                size="small"
                value={registroId}
                onChange={(e) => setRegistroId(e.target.value)}
                sx={{ flexGrow: 1 }}
              />
              <Button variant="contained" startIcon={<VerifiedIcon />}
                onClick={handleVerify} disabled={loading || !registroId.trim()}>
                Verificar Integridad
              </Button>
              <Button variant="outlined" startIcon={<HistoryIcon />}
                onClick={handleHistory} disabled={loading || !registroId.trim()}>
                Ver Historial
              </Button>
            </Box>

            {loading && <Box sx={{ mt: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

            {integridad && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle1" gutterBottom>Resultado</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {integridad.integridadOk ? (
                    <Chip icon={<CheckCircleIcon />} label="Integridad OK" color="success" />
                  ) : (
                    <Chip icon={<ErrorIcon />} label="Integridad COMPROMETIDA" color="error" />
                  )}
                  <Chip label={`Fuente: ${integridad.fuente || 'local'}`} variant="outlined" size="small" />
                </Box>
                <Paper variant="outlined" sx={{ p: 2, fontFamily: 'monospace', fontSize: 12 }}>
                  <Typography variant="caption" display="block"><strong>Hash almacenado:</strong> {integridad.hashAlmacenado}</Typography>
                  <Typography variant="caption" display="block"><strong>Hash calculado:</strong> {integridad.hashCalculado}</Typography>
                  <Typography variant="caption" display="block"><strong>Registro ID:</strong> {integridad.registroId}</Typography>
                </Paper>
              </Box>
            )}
          </Paper>

          {historial && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Historial de Cambios
                <Chip label={`Fuente: ${historial.fuente || 'local'}`} variant="outlined" size="small" sx={{ ml: 2 }} />
              </Typography>
              {historial.historial && historial.historial.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>TX ID</TableCell>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Version</TableCell>
                        <TableCell>Datos</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {historial.historial.map((entry, idx) => {
                        let datos = {};
                        try { datos = JSON.parse(entry.valor); } catch(e) { datos = entry.valor; }
                        return (
                          <TableRow key={idx}>
                            <TableCell sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                              {(entry.txId || '').substring(0, 16)}...
                            </TableCell>
                            <TableCell>
                              {entry.timestamp
                                ? (typeof entry.timestamp === 'object' && entry.timestamp.seconds
                                  ? new Date(entry.timestamp.seconds * 1000).toLocaleString('es-VE')
                                  : new Date(entry.timestamp).toLocaleString('es-VE'))
                                : '-'}
                            </TableCell>
                            <TableCell>{entry.version || datos.version || idx + 1}</TableCell>
                            <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {datos.diagnostico || JSON.stringify(datos).substring(0, 80)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Alert severity="info">No hay historial de cambios para este registro</Alert>
              )}
            </Paper>
          )}
        </>
      )}
    </Container>
  );
}
