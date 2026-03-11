import { useState } from 'react';
import { TextField, Button, Box, MenuItem, Alert } from '@mui/material';
import api from '../../services/api';

const GRUPOS_SANGRE = ['A', 'B', 'AB', 'O'];
const RH_FACTOR = ['Positivo (+)', 'Negativo (-)'];

export default function PatientForm({ onSuccess, onCancel }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombre: '', cedula: '', fechaNacimiento: '', sexo: '',
    direccion: '', telefono: '', grupoSangre: '', rhFactor: '', alergias: ''
  });

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
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
      onSuccess?.(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar paciente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField fullWidth label="Nombre completo" margin="dense" value={form.nombre} onChange={handleChange('nombre')} required />
      <TextField fullWidth label="Cedula" margin="dense" value={form.cedula} onChange={handleChange('cedula')} required />
      <TextField
        fullWidth label="Fecha de nacimiento" type="date" margin="dense"
        InputLabelProps={{ shrink: true }}
        inputProps={{ max: today }}
        value={form.fechaNacimiento}
        onChange={handleChange('fechaNacimiento')}
      />
      <TextField fullWidth select label="Sexo" margin="dense" value={form.sexo} onChange={handleChange('sexo')}>
        <MenuItem value="Masculino">Masculino</MenuItem>
        <MenuItem value="Femenino">Femenino</MenuItem>
      </TextField>
      <TextField fullWidth label="Direccion" margin="dense" value={form.direccion} onChange={handleChange('direccion')} />
      <TextField fullWidth label="Telefono" margin="dense" value={form.telefono} onChange={handleChange('telefono')} />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField fullWidth select label="Grupo sanguineo" margin="dense" value={form.grupoSangre} onChange={handleChange('grupoSangre')}>
          {GRUPOS_SANGRE.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
        </TextField>
        <TextField fullWidth select label="Factor Rh" margin="dense" value={form.rhFactor} onChange={handleChange('rhFactor')}>
          {RH_FACTOR.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
        </TextField>
      </Box>
      <TextField fullWidth label="Alergias (separadas por coma)" margin="dense" value={form.alergias} onChange={handleChange('alergias')} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
        {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? 'Registrando...' : 'Registrar'}
        </Button>
      </Box>
    </Box>
  );
}
