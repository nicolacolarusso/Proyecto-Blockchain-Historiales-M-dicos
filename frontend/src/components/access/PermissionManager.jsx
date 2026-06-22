import { useState, useEffect } from 'react';
import {
  Paper, Typography, TextField, Button, Box, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, IconButton, Tooltip
} from '@mui/material';
import ShareIcon from '@mui/icons-material/Share';
import BlockIcon from '@mui/icons-material/Block';
import api from '../../services/api';

export default function PermissionManager({ pacienteId }) {
  const [medicoId, setMedicoId] = useState('');
  const [dias, setDias] = useState('30');
  const [permisos, setPermisos] = useState([]);
  const [message, setMessage] = useState(null);

  // Cargar permisos existentes al montar o cuando cambie el pacienteId
  useEffect(() => {
    if (!pacienteId) return;
    (async () => {
      try {
        const res = await api.get(`/records/share/${pacienteId}`);
        setPermisos(res.data);
      } catch (err) {
        console.error('Error al cargar permisos:', err);
      }
    })();
  }, [pacienteId]);

  const handleOtorgar = async () => {
    if (!medicoId) return;
    try {
      const res = await api.post('/records/share', {
        pacienteId,
        medicoId,
        duracionDias: parseInt(dias)
      });
      // Reemplazar si ya existe o agregar
      setPermisos(prev => {
        const idx = prev.findIndex(p => p.medicoId === medicoId);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = res.data;
          return updated;
        }
        return [...prev, res.data];
      });
      setMessage({ type: 'success', text: `Permiso otorgado al medico ${medicoId}` });
      setMedicoId('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al otorgar permiso' });
    }
  };

  const handleRevocar = async (medicoIdToRevoke) => {
    try {
      await api.delete('/records/share', {
        data: { pacienteId, medicoId: medicoIdToRevoke }
      });
      setPermisos(permisos.map(p =>
        p.medicoId === medicoIdToRevoke ? { ...p, activo: false, fechaRevocacion: new Date().toISOString() } : p
      ));
      setMessage({ type: 'success', text: `Permiso revocado para medico ${medicoIdToRevoke}` });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al revocar permiso' });
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Gestionar Permisos de Acceso</Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <TextField label="ID del Medico" size="small" value={medicoId} onChange={(e) => setMedicoId(e.target.value)} sx={{ flexGrow: 1 }} />
        <TextField label="Dias" type="number" size="small" value={dias} onChange={(e) => setDias(e.target.value)} sx={{ width: 100 }} />
        <Button variant="contained" startIcon={<ShareIcon />} onClick={handleOtorgar}>
          Otorgar
        </Button>
      </Box>

      {permisos.length > 0 && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Medico</TableCell>
                <TableCell>Otorgado</TableCell>
                <TableCell>Expiracion</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permisos.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{p.medicoId}</TableCell>
                  <TableCell>{new Date(p.fechaOtorgamiento).toLocaleDateString('es-VE')}</TableCell>
                  <TableCell>{new Date(p.expiracion).toLocaleDateString('es-VE')}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.activo ? (new Date(p.expiracion) > new Date() ? 'Activo' : 'Expirado') : 'Revocado'}
                      size="small"
                      color={p.activo && new Date(p.expiracion) > new Date() ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {p.activo && new Date(p.expiracion) > new Date() && (
                      <Tooltip title="Revocar acceso">
                        <IconButton size="small" color="error" onClick={() => handleRevocar(p.medicoId)}>
                          <BlockIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {permisos.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No hay permisos registrados para este paciente.
        </Typography>
      )}
    </Paper>
  );
}
