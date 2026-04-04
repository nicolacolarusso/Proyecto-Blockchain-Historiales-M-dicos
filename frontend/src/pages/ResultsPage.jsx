import { useState } from 'react';
import {
  Container, Typography, Paper, TextField, Button, Box, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Select, MenuItem, FormControl, InputLabel, Divider, IconButton,
  Tooltip, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const TIPOS = ['laboratorio', 'imagen', 'patologia'];
const CATEGORIAS = {
  laboratorio: ['Hematologia', 'Quimica sanguinea', 'Urinalisis', 'Inmunologia', 'Microbiologia'],
  imagen: ['Radiografia', 'Resonancia magnetica', 'Tomografia', 'Ecografia', 'Mamografia'],
  patologia: ['Biopsia', 'Citologia', 'Histopatologia']
};

export default function ResultsPage() {
  const { user } = useAuth();
  const canCreate = ['laboratorista', 'radiologo', 'medico'].includes(user?.role);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    pacienteId: '', tipo: 'laboratorio', categoria: '', descripcion: '',
    valores: '', unidades: '', referencia: '', observaciones: ''
  });
  const [searchId, setSearchId] = useState('');
  const [resultados, setResultados] = useState([]);
  const [message, setMessage] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleCreate = async () => {
    if (!form.pacienteId || !form.tipo || !form.categoria || !form.descripcion || !form.valores) {
      setMessage({ type: 'error', text: 'Complete los campos requeridos' });
      return;
    }
    try {
      const res = await api.post('/results', form);
      setMessage({ type: 'success', text: `Resultado ${res.data.id} creado exitosamente (blockchain: ${res.data.enBlockchain})` });
      setForm({ pacienteId: '', tipo: 'laboratorio', categoria: '', descripcion: '', valores: '', unidades: '', referencia: '', observaciones: '' });
      setShowForm(false);
      if (searchId === form.pacienteId) {
        setResultados([res.data, ...resultados]);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al crear resultado' });
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) return;
    try {
      const res = await api.get(`/results/patient/${searchId}`);
      setResultados(res.data);
      setPage(0);
      if (res.data.length === 0) {
        setMessage({ type: 'info', text: 'No se encontraron resultados para este paciente' });
      } else {
        setMessage(null);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al buscar' });
    }
  };

  const handleVerify = async (id) => {
    try {
      const res = await api.get(`/results/${id}/verify`);
      setMessage({
        type: res.data.integridadOk ? 'success' : 'error',
        text: `Resultado ${id}: Integridad ${res.data.integridadOk ? 'OK' : 'COMPROMETIDA'}`
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Error al verificar' });
    }
  };

  const paginatedResults = resultados.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5">Gestion de Resultados</Typography>
          <Typography variant="body2" color="text.secondary">
            Resultados de laboratorio, imagenes medicas y patologia
          </Typography>
        </Box>
        {canCreate && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowForm(!showForm)}>
            Nuevo Resultado
          </Button>
        )}
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {showForm && canCreate && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Subir Resultado</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 2 }}>
            <TextField label="ID Paciente *" size="small" value={form.pacienteId}
              onChange={(e) => setForm({ ...form, pacienteId: e.target.value })} />
            <FormControl size="small">
              <InputLabel>Tipo *</InputLabel>
              <Select value={form.tipo} label="Tipo *"
                onChange={(e) => setForm({ ...form, tipo: e.target.value, categoria: '' })}>
                {TIPOS.map(t => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small">
              <InputLabel>Categoria *</InputLabel>
              <Select value={form.categoria} label="Categoria *"
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                {(CATEGORIAS[form.tipo] || []).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Unidades" size="small" value={form.unidades}
              onChange={(e) => setForm({ ...form, unidades: e.target.value })} />
            <TextField label="Valores de Referencia" size="small" value={form.referencia}
              onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
          </Box>
          <TextField label="Descripcion *" fullWidth multiline rows={2} sx={{ mt: 2 }}
            value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <TextField label="Valores/Resultados *" fullWidth multiline rows={2} sx={{ mt: 2 }}
            value={form.valores} onChange={(e) => setForm({ ...form, valores: e.target.value })} />
          <TextField label="Observaciones" fullWidth multiline rows={2} sx={{ mt: 2 }}
            value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button variant="contained" onClick={handleCreate}
              disabled={!form.pacienteId || !form.categoria || !form.descripcion || !form.valores}>
              Guardar Resultado
            </Button>
            <Button variant="outlined" onClick={() => setShowForm(false)}>Cancelar</Button>
          </Box>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField label="Buscar por ID Paciente" size="small" value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ flexGrow: 1 }} />
        <Button variant="outlined" startIcon={<SearchIcon />} onClick={handleSearch}>Buscar</Button>
      </Paper>

      {resultados.length > 0 && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Descripcion</TableCell>
                  <TableCell>Valores</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Blockchain</TableCell>
                  <TableCell align="center">Verificar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedResults.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.id}</TableCell>
                    <TableCell>
                      <Chip label={r.tipo} size="small" color={
                        r.tipo === 'laboratorio' ? 'primary' : r.tipo === 'imagen' ? 'secondary' : 'default'
                      } />
                    </TableCell>
                    <TableCell>{r.categoria}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.descripcion}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.valores}
                    </TableCell>
                    <TableCell>{new Date(r.fechaCreacion).toLocaleDateString('es-VE')}</TableCell>
                    <TableCell>
                      <Chip label={r.enBlockchain ? 'Si' : 'No'} size="small"
                        color={r.enBlockchain ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Verificar integridad">
                        <IconButton size="small" onClick={() => handleVerify(r.id)}>
                          <VerifiedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={resultados.length} page={page}
            onPageChange={(e, p) => setPage(p)} rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setPage(0); }}
            labelRowsPerPage="Filas por pagina" />
        </Paper>
      )}
    </Container>
  );
}
