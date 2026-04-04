import { useState, useEffect } from 'react';
import { Typography, Paper, Box, Grid, Chip } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import api from '../../services/api';

export default function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/stats').then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <AdminPanelSettingsIcon color="error" sx={{ fontSize: 36 }} />
        <Box>
          <Typography variant="h5">Panel de Administracion</Typography>
          <Typography variant="body2" color="text.secondary">
            Bienvenido, {user?.nombre || user?.username}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary">{stats?.usuarios || 0}</Typography>
            <Typography variant="body2">Usuarios registrados</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="secondary">{stats?.pacientes || 0}</Typography>
            <Typography variant="body2">Pacientes</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">{stats?.registros || 0}</Typography>
            <Typography variant="body2">Registros medicos</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">{stats?.permisosActivos || 0}</Typography>
            <Typography variant="body2">Permisos activos</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Estado del Sistema</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Chip
            icon={stats?.blockchainActiva ? <CheckCircleIcon /> : <CancelIcon />}
            label={stats?.blockchainActiva ? 'Blockchain Conectada' : 'Blockchain Offline'}
            color={stats?.blockchainActiva ? 'success' : 'default'}
            variant="outlined"
          />
          <Chip
            icon={stats?.fabricCAActiva ? <CheckCircleIcon /> : <CancelIcon />}
            label={stats?.fabricCAActiva ? 'Fabric CA Activa' : 'Fabric CA Offline'}
            color={stats?.fabricCAActiva ? 'success' : 'default'}
            variant="outlined"
          />
        </Box>
      </Paper>
    </Box>
  );
}
