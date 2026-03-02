import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import ManagementDashboard from './pages/management/managementDashboard';

function App() {
  return (
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/management" />} />
          
          <Route path="/management" element={<ManagementDashboard />} />
        </Routes>
      </div>
  );
}

export default App;