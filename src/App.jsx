import { Routes, Route } from 'react-router-dom';
import WeatherPage from './pages/weather/WeatherPage';
import RainPage from './pages/rain/RainPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WeatherPage />} />
      <Route path="/chuva" element={<RainPage />} />
    </Routes>
  );
}
