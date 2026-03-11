import {
  Paper, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip
} from '@mui/material';

export default function AccessLog({ accesos }) {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Log de Accesos</Typography>

      {(!accesos || accesos.length === 0) ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          Sin registros de acceso. El log se llenara automaticamente cuando la red blockchain este activa.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Usuario</TableCell>
                <TableCell>Tipo de Acceso</TableCell>
                <TableCell>Paciente</TableCell>
                <TableCell>Fecha/Hora</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {accesos.map((a, i) => (
                <TableRow key={a.id || i}>
                  <TableCell>{a.usuarioId}</TableCell>
                  <TableCell>
                    <Chip
                      label={a.tipoAcceso}
                      size="small"
                      color={a.tipoAcceso === 'LECTURA' ? 'info' : 'warning'}
                    />
                  </TableCell>
                  <TableCell>{a.pacienteId}</TableCell>
                  <TableCell>{new Date(a.timestamp).toLocaleString('es-VE')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
