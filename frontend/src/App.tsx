import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import MainLayout from './components/Layout';
import Builds from './pages/Builds';
import Feedbacks from './pages/Feedbacks';
import Dashboard from './pages/Dashboard';
import TestGroups from './pages/TestGroups';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/builds" replace />} />
        <Route path="builds" element={<Builds />} />
        <Route path="feedbacks" element={<Feedbacks />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="test-groups" element={<TestGroups />} />
      </Route>
    </Routes>
  );
};

export default App;
