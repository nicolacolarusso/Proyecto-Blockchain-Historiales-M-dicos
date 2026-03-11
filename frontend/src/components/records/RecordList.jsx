import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import VerifiedIcon from '@mui/icons-material/Verified';

const tipoColor = {
  consulta: 'primary',
  emergencia: 'error',
  hospitalizacion: 'warning',
  laboratorio: 'info',
  imagen: 'secondary'
};

export default function RecordList({ records, onAudit, onVerify }) {
  if (!records || records.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        No hay registros para mostrar
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>ID</strong></TableCell>
            <TableCell><strong>Tipo</strong></TableCell>
            <TableCell><strong>Diagnostico</strong></TableCell>
            <TableCell><strong>Medico</strong></TableCell>
            <TableCell><strong>Fecha</strong></TableCell>
            <TableCell><strong>Ver.</strong></TableCell>
            <TableCell align="center"><strong>Acciones</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id} hover>
              <TableCell>
                <Chip label={r.id} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Chip label={r.tipo} size="small" color={tipoColor[r.tipo] || 'default'} />
              </TableCell>
              <TableCell sx={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.diagnostico}
              </TableCell>
              <TableCell>{r.medicoNombre || r.medicoId}</TableCell>
              <TableCell>{new Date(r.fechaCreacion).toLocaleDateString('es-VE')}</TableCell>
              <TableCell>v{r.version}</TableCell>
              <TableCell align="center">
                <Tooltip title="Ver historial (auditoria)">
                  <IconButton size="small" onClick={() => onAudit?.(r.id)}>
                    <HistoryIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Verificar integridad">
                  <IconButton size="small" onClick={() => onVerify?.(r.id)}>
                    <VerifiedIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
