import { useAuth } from '../context/AuthContext';
import {
  Container, Typography, Grid, Card, CardContent, CardActionArea, Box, Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import SecurityIcon from '@mui/icons-material/Security';
import VerifiedIcon from '@mui/icons-material/Verified';

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
      roles: ['admin', 'auditor']
    }
  ];

  const visibleCards = cards.filter(c => c.roles.includes(user?.role));

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Bienvenido, {user?.nombre || user?.username}
        </Typography>
        <Chip label={`Rol: ${user?.role}`} color="primary" />
      </Box>

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

      <Box sx={{ mt: 4, p: 3, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <VerifiedIcon color="success" />
          <Typography variant="h6">Estado del Sistema</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Blockchain: Hyperledger Fabric (Fabric CA) | Backend: Node.js + Express | BD: PostgreSQL
        </Typography>
      </Box>
    </Container>
  );
}
