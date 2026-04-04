import { useState, useEffect } from 'react';
import {
  Container, Typography, Box, TextField, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Alert, CircularProgress,
  Chip, Collapse, IconButton, TablePagination, InputAdornment
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import api from '../services/api';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => { fetchPatients(); }, []);

  const fetchPatients = async () => {
    try {
      const res = await api.get('/patients');
      setPatients(res.data);
    } catch (err) {
      console.error('Error cargando pacientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return !q || p.nombre?.toLowerCase().includes(q) || p.cedula?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q);
  });

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Pacientes</Typography>
        <Alert severity="info" sx={{ py: 0 }}>
          Para registrar un paciente, ve a Usuarios y crea un usuario con rol "Paciente"
        </Alert>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <TextField
          fullWidth size="small" placeholder="Buscar por nombre, cedula o ID..."
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Nombre</strong></TableCell>
              <TableCell><strong>Cedula</strong></TableCell>
              <TableCell><strong>Sexo</strong></TableCell>
              <TableCell><strong>Tipo Sangre</strong></TableCell>
              <TableCell><strong>Blockchain</strong></TableCell>
              <TableCell><strong>Fecha Registro</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center"><CircularProgress size={24} /></TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">{search ? 'Sin resultados para la busqueda' : 'No hay pacientes registrados'}</TableCell></TableRow>
            ) : (
              paginated.map((p) => (
                <>
                  <TableRow key={p.id} hover sx={{ cursor: 'pointer' }} onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                    <TableCell>
                      <IconButton size="small">
                        {expandedId === p.id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                    <TableCell><code style={{ fontSize: 11 }}>{p.id}</code></TableCell>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell>{p.cedula}</TableCell>
                    <TableCell>{p.sexo}</TableCell>
                    <TableCell>{p.tipoSangre}</TableCell>
                    <TableCell>
                      <Chip label={p.enBlockchain ? 'Si' : 'No'} size="small" color={p.enBlockchain ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>{new Date(p.fechaRegistro).toLocaleDateString('es-VE')}</TableCell>
                  </TableRow>
                  <TableRow key={`${p.id}-detail`}>
                    <TableCell colSpan={8} sx={{ py: 0, borderBottom: expandedId === p.id ? undefined : 'none' }}>
                      <Collapse in={expandedId === p.id}>
                        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, my: 1 }}>
                          <Typography variant="subtitle2" gutterBottom>Detalle del Paciente</Typography>
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, fontSize: 13 }}>
                            <div><strong>Direccion:</strong> {p.direccion || 'N/A'}</div>
                            <div><strong>Telefono:</strong> {p.telefono || 'N/A'}</div>
                            <div><strong>Fecha Nacimiento:</strong> {p.fechaNacimiento || 'N/A'}</div>
                            <div><strong>Alergias:</strong> {(p.alergias && p.alergias.length > 0) ? p.alergias.map((a, i) => <Chip key={i} label={a} size="small" color="warning" sx={{ ml: 0.5 }} />) : 'Ninguna'}</div>
                            <div><strong>Registrado por:</strong> {p.registradoPor || 'N/A'}</div>
                            <div><strong>En Blockchain:</strong> {p.enBlockchain ? 'Si - datos inmutables en el ledger' : 'No - solo en memoria'}</div>
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div" count={filtered.length} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
          labelRowsPerPage="Filas por pagina"
        />
      </TableContainer>

    </Container>
  );
}
