import { useState } from 'react';
import {
  Container, Typography, Paper, TextField, Button, Box, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, CircularProgress, Divider
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import HistoryIcon from '@mui/icons-material/History';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api from '../services/api';

export default function AuditPage() {
  const [registroId, setRegistroId] = useState('');
  const [integridad, setIntegridad] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Auditoria y Trazabilidad</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Verificacion de integridad y trazabilidad de registros medicos
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Verificar Registro</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="ID del Registro (ej: REG-XXXXXXXX)"
            size="small"
            value={registroId}
            onChange={(e) => setRegistroId(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <Button
            variant="contained"
            startIcon={<VerifiedIcon />}
            onClick={handleVerify}
            disabled={loading || !registroId.trim()}
          >
            Verificar Integridad
          </Button>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={handleHistory}
            disabled={loading || !registroId.trim()}
          >
            Ver Historial
          </Button>
        </Box>

        {loading && <Box sx={{ mt: 2, textAlign: 'center' }}><CircularProgress size={24} /></Box>}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        {integridad && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" gutterBottom>Resultado de Verificacion</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              {integridad.integridadOk ? (
                <Chip icon={<CheckCircleIcon />} label="Integridad OK" color="success" />
              ) : (
                <Chip icon={<ErrorIcon />} label="Integridad COMPROMETIDA" color="error" />
              )}
              <Chip
                label={`Fuente: ${integridad.fuente || 'local'}`}
                variant="outlined"
                size="small"
              />
            </Box>
            <Paper variant="outlined" sx={{ p: 2, fontFamily: 'monospace', fontSize: 12 }}>
              <Typography variant="caption" display="block">
                <strong>Hash almacenado:</strong> {integridad.hashAlmacenado}
              </Typography>
              <Typography variant="caption" display="block">
                <strong>Hash calculado:</strong> {integridad.hashCalculado}
              </Typography>
              <Typography variant="caption" display="block">
                <strong>Registro ID:</strong> {integridad.registroId}
              </Typography>
            </Paper>
          </Box>
        )}
      </Paper>

      {historial && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Historial de Cambios
            <Chip
              label={`Fuente: ${historial.fuente || 'local'}`}
              variant="outlined"
              size="small"
              sx={{ ml: 2 }}
            />
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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Como funciona la auditoria</Typography>
        <Typography variant="body2" paragraph>
          Cada registro medico almacenado en Hyperledger Fabric es inmutable. Cuando se actualiza un registro,
          la version anterior permanece en el historial del ledger, accesible mediante getHistoryForKey().
        </Typography>
        <Typography variant="body2" paragraph>
          El hash SHA-256 de integridad se calcula al crear el registro y se recalcula en cada consulta
          de verificacion, comparando ambos valores para detectar cualquier alteracion.
        </Typography>
        <Typography variant="body2">
          Los certificados X.509 emitidos por Fabric CA garantizan que cada accion es trazable
          al usuario que la realizo, incluyendo su rol y departamento.
        </Typography>
      </Paper>
    </Container>
  );
}
