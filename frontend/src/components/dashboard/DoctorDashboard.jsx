import { useState, useEffect } from 'react';
import { Typography, Paper, Box, Grid } from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import api from '../../services/api';

export default function DoctorDashboard({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <MedicalServicesIcon color="primary" sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h5">Panel del Medico</Typography>
          <Typography variant="body2" color="text.secondary">
            Bienvenido, Dr. {user?.nombre || user?.username}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">{stats?.pacientes || 0}</Typography>
            <Typography variant="body2">Pacientes en sistema</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="secondary">{stats?.registrosHoy || 0}</Typography>
            <Typography variant="body2">Registros creados hoy</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">{stats?.permisosActivos || 0}</Typography>
            <Typography variant="body2">Permisos activos</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Desde aqui puede consultar pacientes, crear registros medicos y verificar
          la integridad de los datos almacenados en blockchain.
        </Typography>
      </Paper>
    </Box>
  );
}
