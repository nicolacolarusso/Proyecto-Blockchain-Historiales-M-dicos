import { useState, useEffect } from 'react';
import {
  Container, Typography, Button, Box, TextField, Paper, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const GRUPOS_SANGRE = ['A', 'B', 'AB', 'O'];
const RH_FACTOR = ['Positivo (+)', 'Negativo (-)'];

export default function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    nombre: '', cedula: '', fechaNacimiento: '', sexo: '',
    direccion: '', telefono: '', grupoSangre: '', rhFactor: '', alergias: ''
  });

  const canCreate = ['admin', 'administrativo'].includes(user?.role);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients');
      setPatients(res.data);
    } catch (err) {
      console.error('Error cargando pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const tipoSangre = form.grupoSangre && form.rhFactor
        ? `${form.grupoSangre}${form.rhFactor === 'Positivo (+)' ? '+' : '-'}`
        : '';

      const res = await api.post('/patients', {
        nombre: form.nombre,
        cedula: form.cedula,
        fechaNacimiento: form.fechaNacimiento,
        sexo: form.sexo,
        direccion: form.direccion,
        telefono: form.telefono,
        tipoSangre,
        alergias: form.alergias ? form.alergias.split(',').map(a => a.trim()) : []
      });
      setPatients([...patients, res.data]);
      setOpen(false);
      setForm({ nombre: '', cedula: '', fechaNacimiento: '', sexo: '', direccion: '', telefono: '', grupoSangre: '', rhFactor: '', alergias: '' });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar paciente');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Pacientes</Typography>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            Registrar Paciente
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Cedula</strong></TableCell>
              <TableCell><strong>Sexo</strong></TableCell>
              <TableCell><strong>Tipo Sangre</strong></TableCell>
              <TableCell><strong>Fecha Registro</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center"><CircularProgress size={24} /></TableCell>
              </TableRow>
            ) : patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No hay pacientes registrados</TableCell>
              </TableRow>
            ) : (
              patients.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>{p.nombre}</TableCell>
                  <TableCell>{p.cedula}</TableCell>
                  <TableCell>{p.sexo}</TableCell>
                  <TableCell>{p.tipoSangre}</TableCell>
                  <TableCell>{new Date(p.fechaRegistro).toLocaleDateString('es-VE')}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Paciente</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField fullWidth label="Nombre completo" margin="dense" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <TextField fullWidth label="Cedula" margin="dense" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} required />
          <TextField
            fullWidth label="Fecha de nacimiento" type="date" margin="dense"
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: today }}
            value={form.fechaNacimiento}
            onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
          />
          <TextField fullWidth select label="Sexo" margin="dense" value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}>
            <MenuItem value="Masculino">Masculino</MenuItem>
            <MenuItem value="Femenino">Femenino</MenuItem>
          </TextField>
          <TextField fullWidth label="Direccion" margin="dense" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
          <TextField fullWidth label="Telefono" margin="dense" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth select label="Grupo sanguineo" margin="dense" value={form.grupoSangre} onChange={(e) => setForm({ ...form, grupoSangre: e.target.value })}>
              {GRUPOS_SANGRE.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
            </TextField>
            <TextField fullWidth select label="Factor Rh" margin="dense" value={form.rhFactor} onChange={(e) => setForm({ ...form, rhFactor: e.target.value })}>
              {RH_FACTOR.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
          </Box>
          <TextField fullWidth label="Alergias (separadas por coma)" margin="dense" value={form.alergias} onChange={(e) => setForm({ ...form, alergias: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">Registrar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
