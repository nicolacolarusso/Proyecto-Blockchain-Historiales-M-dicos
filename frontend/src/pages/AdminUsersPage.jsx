import { useState, useEffect } from 'react';
import {
  Container, Typography, Button, Box, TextField, Paper, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip, IconButton, Tooltip
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/api';

const ROLES = [
  { value: 'medico', label: 'Medico' },
  { value: 'paciente', label: 'Paciente' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'laboratorista', label: 'Laboratorista' },
  { value: 'radiologo', label: 'Radiologo' },
  { value: 'farmacia', label: 'Farmacia' }
];

const GRUPOS_SANGRE = ['A', 'B', 'AB', 'O'];
const RH_FACTOR = ['Positivo (+)', 'Negativo (-)'];

const roleColors = {
  admin: 'error', medico: 'primary', paciente: 'success',
  administrativo: 'warning', auditor: 'info',
  laboratorista: 'secondary', radiologo: 'secondary', farmacia: 'warning'
};

export default function AdminUsersPage() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState(null);
  const [form, setForm] = useState({
    username: '', password: '', role: '', nombre: '', cedula: '', departamento: '',
    fechaNacimiento: '', sexo: '', grupoSangre: '', rhFactor: '', direccion: '', telefono: '', alergias: ''
  });

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Error cargando stats:', err);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    try {
      const payload = { ...form };
      // Construir tipoSangre combinado
      if (form.role === 'paciente' && form.grupoSangre && form.rhFactor) {
        payload.tipoSangre = `${form.grupoSangre}${form.rhFactor === 'Positivo (+)' ? '+' : '-'}`;
      }
      // Convertir alergias de string a array
      if (form.role === 'paciente' && form.alergias) {
        payload.alergias = form.alergias.split(',').map(a => a.trim()).filter(Boolean);
      } else {
        payload.alergias = [];
      }
      // Limpiar campos innecesarios
      delete payload.grupoSangre;
      delete payload.rhFactor;

      const res = await api.post('/auth/register', payload);
      const msg = res.data.paciente
        ? `Usuario "${res.data.username}" creado con rol ${res.data.role} y ficha de paciente ${res.data.paciente.id}`
        : `Usuario "${res.data.username}" creado con rol ${res.data.role}`;
      setSuccess(msg);
      setOpen(false);
      setForm({
        username: '', password: '', role: '', nombre: '', cedula: '', departamento: '',
        fechaNacimiento: '', sexo: '', grupoSangre: '', rhFactor: '', direccion: '', telefono: '', alergias: ''
      });
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar usuario');
    }
  };

  const handleRevoke = async (username) => {
    if (!window.confirm(`Revocar acceso al usuario "${username}"?`)) return;
    try {
      await api.post('/auth/revoke', { username, reason: 'Revocado por admin' });
      setSuccess(`Usuario "${username}" revocado exitosamente`);
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al revocar usuario');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Administracion de Usuarios</Typography>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setOpen(true)}>
          Nuevo Usuario
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Paper sx={{ p: 2, textAlign: 'center', minWidth: 120 }}>
            <Typography variant="h4" color="primary">{stats.usuarios}</Typography>
            <Typography variant="caption">Usuarios Totales</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center', minWidth: 120 }}>
            <Typography variant="h4" color="success.main">{stats.pacientes}</Typography>
            <Typography variant="caption">Pacientes</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center', minWidth: 120 }}>
            <Typography variant="h4" color="info.main">{stats.registros}</Typography>
            <Typography variant="caption">Registros</Typography>
          </Paper>
          <Paper sx={{ p: 2, textAlign: 'center', minWidth: 120 }}>
            <Chip
              label={stats.blockchainActiva ? 'CONECTADA' : 'DESCONECTADA'}
              color={stats.blockchainActiva ? 'success' : 'default'}
              size="small"
            />
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>Blockchain</Typography>
          </Paper>
        </Box>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        Los usuarios registrados aqui reciben automaticamente una identidad X.509 en la Fabric CA con su rol embebido en el certificado.
      </Alert>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField fullWidth label="Username" margin="dense" value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <TextField fullWidth label="Password" type="password" margin="dense" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <TextField fullWidth select label="Rol" margin="dense" value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })} required>
            {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </TextField>
          <TextField fullWidth label="Nombre completo" margin="dense" value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <TextField fullWidth label="Cedula" margin="dense" value={form.cedula}
            onChange={(e) => setForm({ ...form, cedula: e.target.value })}
            required={form.role === 'paciente'} />

          {form.role !== 'paciente' && (
            <TextField fullWidth label="Departamento" margin="dense" value={form.departamento}
              onChange={(e) => setForm({ ...form, departamento: e.target.value })} />
          )}

          {form.role === 'paciente' && (
            <>
              <Alert severity="info" sx={{ mt: 1, mb: 1 }}>
                Al crear un usuario paciente, se creara automaticamente su ficha medica.
              </Alert>
              <TextField fullWidth label="Fecha de nacimiento" type="date" margin="dense"
                InputLabelProps={{ shrink: true }} inputProps={{ max: today }}
                value={form.fechaNacimiento}
                onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })} required />
              <TextField fullWidth select label="Sexo" margin="dense" value={form.sexo}
                onChange={(e) => setForm({ ...form, sexo: e.target.value })} required>
                <MenuItem value="Masculino">Masculino</MenuItem>
                <MenuItem value="Femenino">Femenino</MenuItem>
              </TextField>
              <TextField fullWidth label="Direccion" margin="dense" value={form.direccion}
                onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
              <TextField fullWidth label="Telefono" margin="dense" value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField fullWidth select label="Grupo sanguineo" margin="dense" value={form.grupoSangre}
                  onChange={(e) => setForm({ ...form, grupoSangre: e.target.value })}>
                  <MenuItem value="">—</MenuItem>
                  {GRUPOS_SANGRE.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                </TextField>
                <TextField fullWidth select label="Factor Rh" margin="dense" value={form.rhFactor}
                  onChange={(e) => setForm({ ...form, rhFactor: e.target.value })}>
                  <MenuItem value="">—</MenuItem>
                  {RH_FACTOR.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                </TextField>
              </Box>
              <TextField fullWidth label="Alergias (separadas por coma)" margin="dense"
                value={form.alergias}
                onChange={(e) => setForm({ ...form, alergias: e.target.value })} />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained"
            disabled={!form.username || !form.password || !form.role || !form.nombre ||
              (form.role === 'paciente' && (!form.cedula || !form.fechaNacimiento || !form.sexo))}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
