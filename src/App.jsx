import { Routes, Route, Navigate } from 'react-router-dom';
import WeatherPage from './pages/weather/WeatherPage';
import RainPage from './pages/rain/RainPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WeatherPage />} />
      <Route path="/chuva" element={<RainPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
