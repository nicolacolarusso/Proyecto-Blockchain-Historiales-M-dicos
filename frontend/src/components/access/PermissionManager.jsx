import { useState } from 'react';
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

  const handleOtorgar = async () => {
    if (!medicoId) return;
    try {
      const res = await api.post('/records/share', {
        pacienteId,
        medicoId,
        duracionDias: parseInt(dias)
      });
      setPermisos([...permisos, res.data]);
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
        p.medicoId === medicoIdToRevoke ? { ...p, activo: false } : p
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
                    <Chip label={p.activo ? 'Activo' : 'Revocado'} size="small" color={p.activo ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell align="center">
                    {p.activo && (
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
    </Paper>
  );
}
