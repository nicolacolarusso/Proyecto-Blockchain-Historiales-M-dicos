import { useState } from 'react';
import {
  Container, Typography, Button, Box, TextField, Paper, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const TIPOS_REGISTRO = [
  'consulta', 'emergencia', 'hospitalizacion', 'laboratorio', 'imagen'
];

export default function RecordsPage() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [searchId, setSearchId] = useState('');
  const [form, setForm] = useState({
    pacienteId: '', tipo: '', diagnostico: '', tratamiento: '', notas: ''
  });

  const canCreate = user?.role === 'medico';

  const handleSearch = async () => {
    if (!searchId) return;
    try {
      const res = await api.get(`/records/${searchId}`);
      setRecords(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al buscar registros');
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

  const tipoColor = {
    consulta: 'primary', emergencia: 'error', hospitalizacion: 'warning',
    laboratorio: 'info', imagen: 'secondary'
  };

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
        <TextField label="ID del Paciente" size="small" value={searchId} onChange={(e) => setSearchId(e.target.value)} sx={{ flexGrow: 1 }} />
        <Button variant="outlined" onClick={handleSearch}>Buscar</Button>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
            </TableRow>
          </TableHead>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">Busque por ID de paciente para ver registros</TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.id}</TableCell>
                  <TableCell><Chip label={r.tipo} size="small" color={tipoColor[r.tipo] || 'default'} /></TableCell>
                  <TableCell>{r.diagnostico}</TableCell>
                  <TableCell>{r.medicoNombre}</TableCell>
                  <TableCell>{new Date(r.fechaCreacion).toLocaleDateString()}</TableCell>
                  <TableCell>v{r.version}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Registro Medico</DialogTitle>
        <DialogContent>
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
          <Button onClick={handleSubmit} variant="contained">Crear Registro</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
