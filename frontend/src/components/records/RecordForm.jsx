import { useState } from 'react';
import { TextField, Button, Box, MenuItem, Alert } from '@mui/material';
import api from '../../services/api';

const TIPOS_REGISTRO = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'emergencia', label: 'Emergencia' },
  { value: 'hospitalizacion', label: 'Hospitalizacion' },
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'imagen', label: 'Imagen Medica' },
];

export default function RecordForm({ pacienteId, onSuccess, onCancel }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    pacienteId: pacienteId || '',
    tipo: '',
    diagnostico: '',
    tratamiento: '',
    notas: ''
  });

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/records', form);
      onSuccess?.(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField fullWidth label="ID del Paciente" margin="dense" value={form.pacienteId} onChange={handleChange('pacienteId')} required />
      <TextField fullWidth select label="Tipo de registro" margin="dense" value={form.tipo} onChange={handleChange('tipo')} required>
        {TIPOS_REGISTRO.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
      </TextField>
      <TextField fullWidth label="Diagnostico" margin="dense" multiline rows={3} value={form.diagnostico} onChange={handleChange('diagnostico')} required />
      <TextField fullWidth label="Tratamiento" margin="dense" multiline rows={2} value={form.tratamiento} onChange={handleChange('tratamiento')} />
      <TextField fullWidth label="Notas adicionales" margin="dense" multiline rows={2} value={form.notas} onChange={handleChange('notas')} />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
        {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
        <Button type="submit" variant="contained" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Registro'}
        </Button>
      </Box>
    </Box>
  );
}
