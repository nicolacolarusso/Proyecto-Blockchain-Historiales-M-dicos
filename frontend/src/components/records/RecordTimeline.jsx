import { Paper, Typography, Box, Chip, Divider } from '@mui/material';
import UpdateIcon from '@mui/icons-material/Update';

export default function RecordTimeline({ historial }) {
  if (!historial || historial.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        Sin historial de cambios disponible.
        El historial completo estara disponible cuando la red blockchain este activa.
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Historial de Cambios (Blockchain)</Typography>
      {historial.map((entry, index) => (
        <Box key={entry.txId || index}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.5 }}>
            <UpdateIcon color={index === 0 ? 'primary' : 'disabled'} sx={{ mt: 0.5 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" fontWeight="bold">
                  {index === 0 ? 'Version actual' : `Version ${historial.length - index}`}
                </Typography>
                <Chip
                  label={entry.isDelete ? 'Eliminado' : 'Modificado'}
                  size="small"
                  color={entry.isDelete ? 'error' : 'info'}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" display="block">
                TX: {entry.txId}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(entry.timestamp).toLocaleString('es-VE')}
              </Typography>
            </Box>
          </Box>
          {index < historial.length - 1 && <Divider />}
        </Box>
      ))}
    </Paper>
  );
}
