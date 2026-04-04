import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import RecordsPage from './pages/RecordsPage';
import AuditPage from './pages/AuditPage';
import PermissionsPage from './pages/PermissionsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ResultsPage from './pages/ResultsPage';
import PrescriptionsPage from './pages/PrescriptionsPage';
import { Box, CircularProgress } from '@mui/material';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <>
      {user && <Navbar />}
      <Box sx={{ pt: user ? 8 : 0 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/patients" element={<ProtectedRoute><PatientsPage /></ProtectedRoute>} />
          <Route path="/records" element={<ProtectedRoute><RecordsPage /></ProtectedRoute>} />
          <Route path="/audit" element={<ProtectedRoute><AuditPage /></ProtectedRoute>} />
          <Route path="/permissions" element={<ProtectedRoute><PermissionsPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
          <Route path="/prescriptions" element={<ProtectedRoute><PrescriptionsPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Box>
    </>
  );
}
