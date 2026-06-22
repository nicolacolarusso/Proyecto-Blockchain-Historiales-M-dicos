import { useState, useEffect } from 'react';
import {
  Container, Typography, Button, Box, TextField, Paper, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip, IconButton, Tooltip,
  InputAdornment, FormHelperText, Grid, TablePagination
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

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
const TIPOS_CEDULA = [
  { value: 'V', label: 'V (Venezolana)' },
  { value: 'E', label: 'E (Extranjera)' }
];
const PREFIJOS_TELEFONO = [
  { value: '0412', label: '0412' },
  { value: '0414', label: '0414' },
  { value: '0416', label: '0416' },
  { value: '0424', label: '0424' },
  { value: '0426', label: '0426' },
  { value: '0212', label: '0212 (Caracas)' },
  { value: '0241', label: '0241 (Valencia)' },
  { value: '0261', label: '0261 (Maracaibo)' },
  { value: '0251', label: '0251 (Barquisimeto)' }
];

const roleColors = {
  admin: 'error', medico: 'primary', paciente: 'success',
  administrativo: 'warning', auditor: 'info',
  laboratorista: 'secondary', radiologo: 'secondary', farmacia: 'warning'
};

// Validadores
const validators = {
  username: (v) => {
    if (!v) return 'Requerido';
    if (v.length < 3 || v.length > 50) return '3-50 caracteres';
    if (!/^[a-zA-Z0-9_-]+$/.test(v)) return 'Solo letras, numeros, _ y -';
    return '';
  },
  password: (v) => {
    if (!v) return 'Requerido';
    if (v.length < 6) return 'Minimo 6 caracteres';
    const letras = (v.match(/[a-zA-Z]/g) || []).length;
    const numeros = (v.match(/[0-9]/g) || []).length;
    if (letras < 3) return 'Debe tener al menos 3 letras';
    if (numeros < 3) return 'Debe tener al menos 3 numeros';
    return '';
  },
  nombre: (v) => {
    if (!v) return 'Requerido';
    if (v.length < 2 || v.length > 100) return '2-100 caracteres';
    if (!/^[a-zA-ZaeiouAEIOUnNuU\u00E1\u00E9\u00ED\u00F3\u00FA\u00C1\u00C9\u00CD\u00D3\u00DA\u00F1\u00D1\u00FC\u00DC\s]+$/.test(v)) return 'Solo letras y espacios';
    return '';
  },
  cedulaNumero: (v) => {
    if (!v) return '';
    if (!/^\d+$/.test(v)) return 'Solo numeros';
    if (v.length < 6 || v.length > 9) return '6-9 digitos';
    return '';
  },
  telefonoNumero: (v) => {
    if (!v) return '';
    if (!/^\d+$/.test(v)) return 'Solo numeros';
    if (v.length !== 7) return 'Debe tener 7 digitos';
    return '';
  },
  departamento: (v) => {
    if (!v) return '';
    if (v.length > 50) return 'Maximo 50 caracteres';
    return '';
  },
  direccion: (v) => {
    if (!v) return '';
    if (v.length > 200) return 'Maximo 200 caracteres';
    return '';
  },
  fechaNacimiento: (v) => {
    if (!v) return 'Requerido';
    const d = new Date(v);
    const hoy = new Date();
    if (d > hoy) return 'No puede ser futuro';
    const edad = (hoy - d) / (1000 * 60 * 60 * 24 * 365.25);
    if (edad > 130) return 'Fecha invalida';
    return '';
  },
  alergias: (v) => {
    if (!v) return '';
    if (v.length > 300) return 'Maximo 300 caracteres';
    return '';
  }
};

const emptyForm = {
  username: '', password: '', role: '', nombre: '',
  cedulaTipo: 'V', cedulaNumero: '',
  departamento: '',
  fechaNacimiento: '', sexo: '', grupoSangre: '', rhFactor: '', direccion: '',
  telefonoPrefijo: '0412', telefonoNumero: '', alergias: ''
};

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({});
  const [form, setForm] = useState(emptyForm);

  // Dialog reset password
  const [resetDialog, setResetDialog] = useState({ open: false, username: '' });
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [touchedReset, setTouchedReset] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get('/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Error cargando stats:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    }
  };

  // Calcular errores de validacion
  const errores = {
    username: validators.username(form.username),
    password: validators.password(form.password),
    nombre: validators.nombre(form.nombre),
    role: form.role ? '' : 'Requerido',
    cedulaNumero: validators.cedulaNumero(form.cedulaNumero),
    departamento: validators.departamento(form.departamento),
    fechaNacimiento: form.role === 'paciente' ? validators.fechaNacimiento(form.fechaNacimiento) : '',
    sexo: form.role === 'paciente' && !form.sexo ? 'Requerido' : '',
    cedulaRequerida: form.role === 'paciente' && !form.cedulaNumero ? 'Requerida para pacientes' : '',
    telefonoNumero: validators.telefonoNumero(form.telefonoNumero),
    direccion: validators.direccion(form.direccion),
    alergias: validators.alergias(form.alergias)
  };

  const formValido = !errores.username && !errores.password && !errores.nombre && !errores.role
    && !errores.cedulaNumero && !errores.departamento
    && (form.role !== 'paciente' || (!errores.fechaNacimiento && !errores.sexo && !errores.cedulaRequerida))
    && !errores.telefonoNumero && !errores.direccion && !errores.alergias;

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!formValido) {
      setError('Corrija los errores en el formulario antes de continuar');
      setTouched({ all: true });
      return;
    }

    try {
      const payload = {
        username: form.username,
        password: form.password,
        role: form.role,
        nombre: form.nombre,
        departamento: form.departamento || undefined
      };

      // Cedula combinada
      if (form.cedulaNumero) {
        payload.cedula = `${form.cedulaTipo}-${form.cedulaNumero}`;
      }

      // Telefono combinado
      if (form.telefonoNumero) {
        payload.telefono = `${form.telefonoPrefijo}${form.telefonoNumero}`;
      }

      if (form.role === 'paciente') {
        payload.fechaNacimiento = form.fechaNacimiento;
        payload.sexo = form.sexo;
        payload.direccion = form.direccion || '';
        if (form.grupoSangre && form.rhFactor) {
          payload.tipoSangre = `${form.grupoSangre}${form.rhFactor === 'Positivo (+)' ? '+' : '-'}`;
        }
        payload.alergias = form.alergias
          ? form.alergias.split(',').map(a => a.trim()).filter(Boolean)
          : [];
      }

      const res = await api.post('/auth/register', payload);
      const msg = res.data.paciente
        ? `Usuario "${res.data.username}" creado con rol ${res.data.role} y ficha de paciente ${res.data.paciente.id}`
        : `Usuario "${res.data.username}" creado con rol ${res.data.role}`;
      setSuccess(msg);
      setOpen(false);
      setForm(emptyForm);
      setTouched({});
      fetchStats();
      fetchUsers();
    } catch (err) {
      const e = err.response?.data;
      if (e?.detalles?.length) {
        setError(e.detalles.map(d => `${d.campo}: ${d.mensaje}`).join('; '));
      } else {
        setError(e?.error || 'Error al registrar usuario');
      }
    }
  };

  const handleDelete = async (username) => {
    if (!window.confirm(`Esta seguro de eliminar al usuario "${username}"? Esta accion no se puede deshacer.`)) return;
    setError('');
    setSuccess('');
    try {
      await api.delete(`/auth/users/${username}`);
      setSuccess(`Usuario "${username}" eliminado exitosamente`);
      fetchStats();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar usuario');
    }
  };

  const openResetPassword = (username) => {
    setResetDialog({ open: true, username });
    setNewPassword('');
    setResetError('');
    setTouchedReset(false);
  };

  const handleResetPassword = async () => {
    const errorPwd = validators.password(newPassword);
    if (errorPwd) {
      setTouchedReset(true);
      setResetError(errorPwd);
      return;
    }
    try {
      await api.post(`/auth/users/${resetDialog.username}/reset-password`, { newPassword });
      setSuccess(`Contrasena de "${resetDialog.username}" actualizada exitosamente`);
      setResetDialog({ open: false, username: '' });
      setNewPassword('');
    } catch (err) {
      setResetError(err.response?.data?.error || 'Error al actualizar contrasena');
    }
  };

  const handleCloseDialog = () => {
    setOpen(false);
    setForm(emptyForm);
    setTouched({});
    setError('');
  };

  const usuariosPaginados = users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Helper para mostrar error de un campo
  const showErr = (field) => (touched[field] || touched.all) && errores[field];

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
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

      {/* Tabla de usuarios */}
      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>Usuarios Registrados</Typography>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell><strong>Username</strong></TableCell>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Rol</strong></TableCell>
              <TableCell><strong>Cedula</strong></TableCell>
              <TableCell><strong>Departamento</strong></TableCell>
              <TableCell align="center"><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuariosPaginados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No hay usuarios registrados</TableCell>
              </TableRow>
            ) : (
              usuariosPaginados.map((u) => (
                <TableRow key={u.username} hover>
                  <TableCell><code>{u.username}</code></TableCell>
                  <TableCell>{u.nombre}</TableCell>
                  <TableCell>
                    <Chip label={u.role} size="small" color={roleColors[u.role] || 'default'} />
                  </TableCell>
                  <TableCell>{u.cedula || '—'}</TableCell>
                  <TableCell>{u.departamento || '—'}</TableCell>
                  <TableCell align="center">
                    <Tooltip title="Recuperar contrasena">
                      <IconButton size="small" color="primary" onClick={() => openResetPassword(u.username)}>
                        <LockResetIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={u.username === 'admin' ? 'No se puede eliminar al admin' : u.username === currentUser?.username ? 'No puede eliminar su cuenta' : 'Eliminar usuario'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={u.username === 'admin' || u.username === currentUser?.username}
                          onClick={() => handleDelete(u.username)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {users.length > 0 && (
          <TablePagination
            component="div"
            count={users.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            rowsPerPageOptions={[5, 10, 25]}
            labelRowsPerPage="Filas por pagina"
          />
        )}
      </TableContainer>

      {/* Dialog Crear Usuario */}
      <Dialog open={open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Username *" margin="dense" value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                onBlur={() => setTouched({ ...touched, username: true })}
                error={!!showErr('username')}
                helperText={showErr('username') || '3-50 caracteres. Solo letras, numeros, _ y -'}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Contrasena *" type={showPassword ? 'text' : 'password'}
                margin="dense" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                onBlur={() => setTouched({ ...touched, password: true })}
                error={!!showErr('password')}
                helperText={showErr('password') || 'Minimo 6 caracteres, al menos 3 letras y 3 numeros'}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth select label="Rol *" margin="dense" value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                onBlur={() => setTouched({ ...touched, role: true })}
                error={!!showErr('role')}
                helperText={showErr('role') || 'Seleccione el rol del usuario'}
              >
                {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth label="Nombre completo *" margin="dense" value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                onBlur={() => setTouched({ ...touched, nombre: true })}
                error={!!showErr('nombre')}
                helperText={showErr('nombre') || '2-100 caracteres, solo letras y espacios'}
              />
            </Grid>

            <Grid item xs={4} sm={3}>
              <TextField
                fullWidth select label="Tipo Cedula" margin="dense" value={form.cedulaTipo}
                onChange={(e) => setForm({ ...form, cedulaTipo: e.target.value })}
                helperText="V o E"
              >
                {TIPOS_CEDULA.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={8} sm={9}>
              <TextField
                fullWidth label={form.role === 'paciente' ? 'Numero Cedula *' : 'Numero Cedula'}
                margin="dense" value={form.cedulaNumero}
                onChange={(e) => setForm({ ...form, cedulaNumero: e.target.value.replace(/\D/g, '') })}
                onBlur={() => setTouched({ ...touched, cedulaNumero: true, cedulaRequerida: true })}
                error={!!(showErr('cedulaNumero') || showErr('cedulaRequerida'))}
                helperText={showErr('cedulaNumero') || showErr('cedulaRequerida') || '6-9 digitos (sin puntos ni guiones)'}
                inputProps={{ maxLength: 9, inputMode: 'numeric' }}
              />
            </Grid>

            {form.role !== 'paciente' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth label="Departamento" margin="dense" value={form.departamento}
                  onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                  onBlur={() => setTouched({ ...touched, departamento: true })}
                  error={!!showErr('departamento')}
                  helperText={showErr('departamento') || 'Opcional. Maximo 50 caracteres'}
                />
              </Grid>
            )}

            <Grid item xs={4} sm={3}>
              <TextField
                fullWidth select label="Prefijo Tel." margin="dense" value={form.telefonoPrefijo}
                onChange={(e) => setForm({ ...form, telefonoPrefijo: e.target.value })}
                helperText="Operador / Ciudad"
              >
                {PREFIJOS_TELEFONO.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={8} sm={9}>
              <TextField
                fullWidth label="Numero Telefono" margin="dense" value={form.telefonoNumero}
                onChange={(e) => setForm({ ...form, telefonoNumero: e.target.value.replace(/\D/g, '') })}
                onBlur={() => setTouched({ ...touched, telefonoNumero: true })}
                error={!!showErr('telefonoNumero')}
                helperText={showErr('telefonoNumero') || 'Opcional. 7 digitos (ej: 1234567)'}
                inputProps={{ maxLength: 7, inputMode: 'numeric' }}
              />
            </Grid>

            {form.role === 'paciente' && (
              <>
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Al crear un usuario paciente, se creara automaticamente su ficha medica.
                  </Alert>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth label="Fecha de nacimiento *" type="date" margin="dense"
                    InputLabelProps={{ shrink: true }} inputProps={{ max: today }}
                    value={form.fechaNacimiento}
                    onChange={(e) => setForm({ ...form, fechaNacimiento: e.target.value })}
                    onBlur={() => setTouched({ ...touched, fechaNacimiento: true })}
                    error={!!showErr('fechaNacimiento')}
                    helperText={showErr('fechaNacimiento') || 'No puede ser futuro'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth select label="Sexo *" margin="dense" value={form.sexo}
                    onChange={(e) => setForm({ ...form, sexo: e.target.value })}
                    onBlur={() => setTouched({ ...touched, sexo: true })}
                    error={!!showErr('sexo')}
                    helperText={showErr('sexo') || 'Seleccione el sexo'}
                  >
                    <MenuItem value="Masculino">Masculino</MenuItem>
                    <MenuItem value="Femenino">Femenino</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth label="Direccion" margin="dense" value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    onBlur={() => setTouched({ ...touched, direccion: true })}
                    error={!!showErr('direccion')}
                    helperText={showErr('direccion') || 'Opcional. Maximo 200 caracteres'}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth select label="Grupo sanguineo" margin="dense" value={form.grupoSangre}
                    onChange={(e) => setForm({ ...form, grupoSangre: e.target.value })}
                    helperText="Opcional (A, B, AB, O)"
                  >
                    <MenuItem value="">—</MenuItem>
                    {GRUPOS_SANGRE.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth select label="Factor Rh" margin="dense" value={form.rhFactor}
                    onChange={(e) => setForm({ ...form, rhFactor: e.target.value })}
                    helperText="Opcional (Positivo o Negativo)"
                  >
                    <MenuItem value="">—</MenuItem>
                    {RH_FACTOR.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth label="Alergias" margin="dense" value={form.alergias}
                    onChange={(e) => setForm({ ...form, alergias: e.target.value })}
                    onBlur={() => setTouched({ ...touched, alergias: true })}
                    error={!!showErr('alergias')}
                    helperText={showErr('alergias') || 'Opcional. Separadas por coma. Ej: Penicilina, Polen'}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formValido}>
            Registrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Reset Password */}
      <Dialog open={resetDialog.open} onClose={() => setResetDialog({ open: false, username: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>Recuperar Contrasena</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Establecer nueva contrasena para el usuario <strong>{resetDialog.username}</strong>
          </Typography>
          {resetError && <Alert severity="error" sx={{ mb: 2 }}>{resetError}</Alert>}
          <TextField
            fullWidth autoFocus label="Nueva Contrasena" type={showPassword ? 'text' : 'password'}
            margin="dense" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onBlur={() => setTouchedReset(true)}
            error={touchedReset && !!validators.password(newPassword)}
            helperText={(touchedReset && validators.password(newPassword)) || 'Minimo 6 caracteres, al menos 3 letras y 3 numeros'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog({ open: false, username: '' })}>Cancelar</Button>
          <Button onClick={handleResetPassword} variant="contained" disabled={!!validators.password(newPassword)}>
            Actualizar Contrasena
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
