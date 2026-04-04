import { useAuth } from '../context/AuthContext';
import {
  Container, Typography, Grid, Card, CardContent, CardActionArea, Box, Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import SecurityIcon from '@mui/icons-material/Security';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import DoctorDashboard from '../components/dashboard/DoctorDashboard';
import PatientDashboard from '../components/dashboard/PatientDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Pacientes',
      description: 'Gestionar registros de pacientes',
      icon: <PeopleIcon sx={{ fontSize: 48, color: 'primary.main' }} />,
      path: '/patients',
      roles: ['admin', 'medico', 'administrativo']
    },
    {
      title: 'Registros Medicos',
      description: 'Historiales clinicos en blockchain',
      icon: <DescriptionIcon sx={{ fontSize: 48, color: 'secondary.main' }} />,
      path: '/records',
      roles: ['admin', 'medico', 'paciente']
    },
    {
      title: 'Auditoria',
      description: 'Trazabilidad y verificacion de integridad',
      icon: <SecurityIcon sx={{ fontSize: 48, color: 'warning.main' }} />,
      path: '/audit',
      roles: ['admin', 'auditor', 'medico']
    }
  ];

  const visibleCards = cards.filter(c => c.roles.includes(user?.role));

  const renderRoleDashboard = () => {
    switch (user?.role) {
      case 'admin':
      case 'administrativo':
        return <AdminDashboard user={user} />;
      case 'medico':
        return <DoctorDashboard user={user} />;
      case 'paciente':
        return <PatientDashboard user={user} />;
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      {renderRoleDashboard()}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>Accesos rapidos</Typography>
        <Grid container spacing={3}>
          {visibleCards.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card.title}>
              <Card elevation={2}>
                <CardActionArea onClick={() => navigate(card.path)} sx={{ p: 2 }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                    {card.icon}
                    <Typography variant="h6" sx={{ mt: 2 }}>{card.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.description}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}
