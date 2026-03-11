import { Paper, Typography, Box, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export default function RecordAuditLog({ verificacion }) {
  if (!verificacion) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        Seleccione un registro para verificar su integridad
      </Paper>
    );
  }

  const ok = verificacion.integridadOk;

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {ok ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />}
        <Typography variant="h6">
          {ok ? 'Integridad verificada' : 'Integridad comprometida'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">Registro ID</Typography>
          <Typography variant="body2">{verificacion.registroId}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Hash almacenado en blockchain</Typography>
          <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
            {verificacion.hashAlmacenado}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">Hash calculado ahora</Typography>
          <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
            {verificacion.hashCalculado}
          </Typography>
        </Box>
        <Box sx={{ mt: 1 }}>
          <Chip
            label={ok ? 'HASHES COINCIDEN' : 'HASHES NO COINCIDEN'}
            color={ok ? 'success' : 'error'}
            icon={ok ? <CheckCircleIcon /> : <ErrorIcon />}
          />
        </Box>
      </Box>
    </Paper>
  );
}
