import { AppBar, Toolbar, Typography, Button, Box, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roleColors = {
    admin: 'error',
    medico: 'primary',
    paciente: 'success',
    administrativo: 'warning',
    auditor: 'info'
  };

  return (
    <AppBar position="fixed">
      <Toolbar>
        <LocalHospitalIcon sx={{ mr: 1 }} />
        <Typography variant="h6" sx={{ flexGrow: 0, mr: 3, cursor: 'pointer' }} onClick={() => navigate('/')}>
          HistorialChain
        </Typography>

        <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
          <Button color="inherit" onClick={() => navigate('/')}>Dashboard</Button>
          {['admin', 'medico', 'administrativo'].includes(user?.role) && (
            <Button color="inherit" onClick={() => navigate('/patients')}>Pacientes</Button>
          )}
          {['admin', 'medico', 'paciente'].includes(user?.role) && (
            <Button color="inherit" onClick={() => navigate('/records')}>Registros</Button>
          )}
          {['admin', 'auditor'].includes(user?.role) && (
            <Button color="inherit" onClick={() => navigate('/audit')}>Auditoria</Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Chip
            label={user?.role?.toUpperCase()}
            color={roleColors[user?.role] || 'default'}
            size="small"
          />
          <Typography variant="body2">{user?.nombre || user?.username}</Typography>
          <Button color="inherit" variant="outlined" size="small" onClick={logout}>
            Salir
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
