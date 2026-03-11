import { useState } from 'react';
import {
  Container, Typography, Paper, TextField, Button, Box, Alert
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import HistoryIcon from '@mui/icons-material/History';

export default function AuditPage() {
  const [registroId, setRegistroId] = useState('');
  const [info, setInfo] = useState(null);

  const handleVerify = () => {
    setInfo({
      message: 'Verificacion de integridad disponible cuando la red blockchain este activa',
      status: 'info'
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>Auditoria y Trazabilidad</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Verificacion de integridad y trazabilidad de registros medicos en blockchain
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Verificar Integridad de Registro</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="ID del Registro"
            size="small"
            value={registroId}
            onChange={(e) => setRegistroId(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <Button variant="contained" startIcon={<VerifiedIcon />} onClick={handleVerify}>
            Verificar
          </Button>
          <Button variant="outlined" startIcon={<HistoryIcon />} onClick={handleVerify}>
            Ver Historial
          </Button>
        </Box>

        {info && (
          <Alert severity={info.status} sx={{ mt: 2 }}>{info.message}</Alert>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Como funciona la auditoria</Typography>
        <Typography variant="body2" paragraph>
          Cada registro medico almacenado en Hyperledger Fabric es inmutable. Cuando se actualiza un registro,
          la version anterior permanece en el historial del ledger, accesible mediante getHistoryForKey().
        </Typography>
        <Typography variant="body2" paragraph>
          El hash SHA-256 de integridad se calcula al crear el registro y se recalcula en cada consulta
          de verificacion, comparando ambos valores para detectar cualquier alteracion.
        </Typography>
        <Typography variant="body2">
          Los certificados X.509 emitidos por Fabric CA garantizan que cada accion es trazable
          al usuario que la realizo, incluyendo su rol y departamento.
        </Typography>
      </Paper>
    </Container>
  );
}
