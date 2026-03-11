import { Typography, Paper, Box, Grid } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

export default function PatientDashboard({ user }) {
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
            <Typography variant="h4" color="primary">0</Typography>
            <Typography variant="body2">Registros medicos</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">0</Typography>
            <Typography variant="body2">Permisos activos</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">0</Typography>
            <Typography variant="body2">Prescripciones</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Desde aqui podra ver su historial completo, gestionar permisos de acceso
          a medicos y verificar la integridad de sus datos en blockchain.
        </Typography>
      </Paper>
    </Box>
  );
}
