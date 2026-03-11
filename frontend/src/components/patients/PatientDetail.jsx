import {
  Paper, Typography, Grid, Chip, Box, Divider
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';

export default function PatientDetail({ patient }) {
  if (!patient) return null;

  const fields = [
    { label: 'ID', value: patient.id },
    { label: 'Cedula', value: patient.cedula },
    { label: 'Fecha de Nacimiento', value: patient.fechaNacimiento || '-' },
    { label: 'Sexo', value: patient.sexo || '-' },
    { label: 'Tipo de Sangre', value: patient.tipoSangre || '-' },
    { label: 'Direccion', value: patient.direccion || '-' },
    { label: 'Telefono', value: patient.telefono || '-' },
  ];

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <PersonIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h6">{patient.nombre}</Typography>
          <Typography variant="body2" color="text.secondary">
            Registrado: {new Date(patient.fechaRegistro).toLocaleDateString('es-VE')}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      <Grid container spacing={2}>
        {fields.map(({ label, value }) => (
          <Grid item xs={12} sm={6} key={label}>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
            <Typography variant="body1">{value}</Typography>
          </Grid>
        ))}
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary">Alergias</Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
            {patient.alergias?.length > 0
              ? patient.alergias.map((a, i) => <Chip key={i} label={a} size="small" color="warning" />)
              : <Typography variant="body2">Sin alergias registradas</Typography>
            }
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
}
