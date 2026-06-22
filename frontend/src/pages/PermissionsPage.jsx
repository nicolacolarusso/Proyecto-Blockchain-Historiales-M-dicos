import { useState, useEffect } from 'react';
import { Container, Typography, Box, TextField, Button, Paper, Alert } from '@mui/material';
import PermissionManager from '../components/access/PermissionManager';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function PermissionsPage() {
  const { user } = useAuth();
  const [pacienteId, setPacienteId] = useState('');
  const [activePacienteId, setActivePacienteId] = useState('');
  const [loading, setLoading] = useState(false);

  const isPaciente = user?.role === 'paciente';

  // Si es paciente, cargar su ID automaticamente
  useEffect(() => {
    if (isPaciente) {
      (async () => {
        setLoading(true);
        try {
          const meRes = await api.get('/patients/me');
          setActivePacienteId(meRes.data.id);
        } catch (err) {
          console.error('Error al cargar perfil de paciente:', err);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  const handleSearch = () => {
    if (pacienteId) {
      setActivePacienteId(pacienteId);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Control de Acceso</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isPaciente
          ? 'Gestiona quien tiene acceso a tus registros medicos.'
          : 'Gestiona los permisos de acceso a registros de pacientes.'}
      </Typography>

      {!isPaciente && (
        <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="ID del Paciente"
            size="small"
            value={pacienteId}
            onChange={(e) => setPacienteId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ flexGrow: 1 }}
          />
          <Button variant="outlined" onClick={handleSearch}>Cargar Permisos</Button>
        </Paper>
      )}

      {isPaciente && loading && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
          Cargando tus permisos...
        </Typography>
      )}

      {activePacienteId && (
        <PermissionManager pacienteId={activePacienteId} />
      )}
    </Container>
  );
}
