import { useState, useEffect } from 'react';
import { Typography, Paper, Box, Grid, Chip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import api from '../../services/api';

export default function PatientDashboard({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <PersonIcon color="success" sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h5">Mi Panel de Salud</Typography>
          <Typography variant="body2" color="text.secondary">
            Bienvenido, {user?.nombre || user?.username}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">{stats?.registros || 0}</Typography>
            <Typography variant="body2">Registros medicos</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">{stats?.permisosActivos || 0}</Typography>
            <Typography variant="body2">Permisos activos</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Chip
              icon={stats?.blockchainActiva ? <CheckCircleIcon /> : <CancelIcon />}
              label={stats?.blockchainActiva ? 'Blockchain Activa' : 'Modo Local'}
              color={stats?.blockchainActiva ? 'success' : 'default'}
            />
            <Typography variant="body2" sx={{ mt: 1 }}>Estado blockchain</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Desde aqui puede ver su historial medico, gestionar permisos de acceso
          a medicos y verificar la integridad de sus datos.
        </Typography>
      </Paper>
    </Box>
  );
}
