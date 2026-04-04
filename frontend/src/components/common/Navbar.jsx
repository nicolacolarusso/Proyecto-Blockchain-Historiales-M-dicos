import { useState } from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, Chip,
  IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Divider
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MenuIcon from '@mui/icons-material/Menu';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const roleColors = {
    admin: 'error',
    medico: 'primary',
    paciente: 'success',
    administrativo: 'warning',
    auditor: 'info',
    laboratorista: 'secondary',
    radiologo: 'secondary',
    farmacia: 'warning'
  };

  const navItems = [
    { label: 'Dashboard', path: '/', roles: null },
    { label: 'Pacientes', path: '/patients', roles: ['admin', 'medico', 'administrativo'] },
    { label: 'Registros', path: '/records', roles: ['admin', 'medico', 'paciente'] },
    { label: 'Permisos', path: '/permissions', roles: ['admin', 'paciente'] },
    { label: 'Auditoria', path: '/audit', roles: ['admin', 'auditor'] },
    { label: 'Resultados', path: '/results', roles: ['admin', 'medico', 'laboratorista', 'radiologo', 'paciente'] },
    { label: 'Recetas', path: '/prescriptions', roles: ['admin', 'medico', 'paciente', 'farmacia'] },
    { label: 'Usuarios', path: '/admin/users', roles: ['admin'] },
  ];

  const visibleItems = navItems.filter(item => !item.roles || item.roles.includes(user?.role));

  const handleNav = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  return (
    <>
      <AppBar position="fixed">
        <Toolbar>
          {/* Hamburger - solo mobile */}
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 1, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <LocalHospitalIcon sx={{ mr: 1 }} />
          <Typography
            variant="h6"
            sx={{ flexGrow: 0, mr: 3, cursor: 'pointer', whiteSpace: 'nowrap' }}
            onClick={() => navigate('/')}
          >
            HistorialChain
          </Typography>

          {/* Nav links - solo desktop */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            {visibleItems.map(item => (
              <Button key={item.path} color="inherit" onClick={() => navigate(item.path)}>
                {item.label}
              </Button>
            ))}
          </Box>

          {/* Spacer en mobile */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }} />

          {/* User info - desktop completo, mobile solo chip */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
            <Chip
              label={user?.role?.toUpperCase()}
              color={roleColors[user?.role] || 'default'}
              size="small"
            />
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.nombre || user?.username}
            </Typography>
            <Button color="inherit" variant="outlined" size="small" onClick={logout}>
              Salir
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer mobile */}
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260 }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalHospitalIcon color="primary" />
            <Typography variant="h6">HistorialChain</Typography>
          </Box>
          <Divider />
          <List>
            {visibleItems.map(item => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton onClick={() => handleNav(item.path)}>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Chip
              label={user?.role?.toUpperCase()}
              color={roleColors[user?.role] || 'default'}
              size="small"
              sx={{ mb: 1 }}
            />
            <Typography variant="body2" color="text.secondary">
              {user?.nombre || user?.username}
            </Typography>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
