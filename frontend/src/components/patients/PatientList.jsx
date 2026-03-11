import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';

export default function PatientList({ patients, onSelect }) {
  if (!patients || patients.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
        No hay pacientes registrados
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell><strong>ID</strong></TableCell>
            <TableCell><strong>Nombre</strong></TableCell>
            <TableCell><strong>Cedula</strong></TableCell>
            <TableCell><strong>Tipo Sangre</strong></TableCell>
            <TableCell><strong>Sexo</strong></TableCell>
            <TableCell><strong>Fecha Registro</strong></TableCell>
            <TableCell align="center"><strong>Acciones</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {patients.map((p) => (
            <TableRow key={p.id} hover>
              <TableCell><Chip label={p.id} size="small" variant="outlined" /></TableCell>
              <TableCell>{p.nombre}</TableCell>
              <TableCell>{p.cedula}</TableCell>
              <TableCell>{p.tipoSangre || '-'}</TableCell>
              <TableCell>{p.sexo || '-'}</TableCell>
              <TableCell>{new Date(p.fechaRegistro).toLocaleDateString('es-VE')}</TableCell>
              <TableCell align="center">
                <Tooltip title="Ver detalle">
                  <IconButton size="small" onClick={() => onSelect?.(p)}>
                    <VisibilityIcon />
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
