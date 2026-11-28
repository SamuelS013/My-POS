import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';

// Componentes
import Layout from './components/Layout';

// Páginas
import Caja from './pages/Caja';
import Ventas from './pages/Ventas';
import Creditos from './pages/Creditos';
import Reportes from './pages/Reportes';

export default function App() {
  return (
    // Envolvemos toda la aplicación con el Provider
    <AppProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/caja" replace />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/ventas" element={<Ventas />} />
          <Route path="/creditos" element={<Creditos />} />
          <Route path="/reportes" element={<Reportes />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}