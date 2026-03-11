import { Typography, Paper, Box, Grid, Chip } from '@mui/material';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

export default function DoctorDashboard({ user }) {
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
            <Typography variant="h4" color="primary">0</Typography>
            <Typography variant="body2">Pacientes asignados</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="secondary">0</Typography>
            <Typography variant="body2">Registros creados hoy</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main">0</Typography>
            <Typography variant="body2">Permisos pendientes</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Los datos se actualizaran automaticamente cuando la red blockchain este activa
          y haya registros en el sistema.
        </Typography>
      </Paper>
    </Box>
  );
}
