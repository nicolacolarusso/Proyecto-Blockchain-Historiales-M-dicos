import { useState } from 'react';
import { Container, Typography, Box, TextField, Button, Paper, Alert } from '@mui/material';
import PermissionManager from '../components/access/PermissionManager';
import { useAuth } from '../context/AuthContext';

export default function PermissionsPage() {
  const { user } = useAuth();
  const [pacienteId, setPacienteId] = useState('');
  const [activePacienteId, setActivePacienteId] = useState('');

  // Si el usuario es paciente, buscar con su propia identidad
  const isPaciente = user?.role === 'paciente';

  const handleSearch = () => {
    if (isPaciente) {
      // El paciente gestiona sus propios permisos
      setActivePacienteId(user.username);
    } else if (pacienteId) {
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
            sx={{ flexGrow: 1 }}
          />
          <Button variant="outlined" onClick={handleSearch}>Cargar Permisos</Button>
        </Paper>
      )}

      {isPaciente && !activePacienteId && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button variant="contained" size="large" onClick={handleSearch}>
            Ver Mis Permisos
          </Button>
        </Box>
      )}

      {activePacienteId && (
        <PermissionManager pacienteId={activePacienteId} />
      )}
    </Container>
  );
}
