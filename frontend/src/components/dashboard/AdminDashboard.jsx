import { Typography, Paper, Box, Grid } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

export default function AdminDashboard({ user }) {
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
            <Typography variant="h4" color="primary">0</Typography>
            <Typography variant="body2">Usuarios registrados</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="secondary">0</Typography>
            <Typography variant="body2">Pacientes</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">0</Typography>
            <Typography variant="body2">Registros totales</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">0</Typography>
            <Typography variant="body2">Certificados Fabric CA</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Panel de administracion del sistema. Gestione usuarios, pacientes y
          monitoree el estado de la red blockchain Hyperledger Fabric.
        </Typography>
      </Paper>
    </Box>
  );
}
