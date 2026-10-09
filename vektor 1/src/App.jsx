import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PlanJourney from './pages/PlanJourney'
import ActiveJourney from './pages/ActiveJourney'
import DisruptionDetails from './pages/DisruptionDetails'
import GlobalExplorer from './pages/GlobalExplorer'
import BenchmarkDashboard from './pages/BenchmarkDashboard'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/plan" element={<PlanJourney />} />
        <Route path="/active" element={<ActiveJourney />} />
        <Route path="/alert" element={<DisruptionDetails />} />
        <Route path="/globe" element={<GlobalExplorer />} />
        <Route path="/benchmark" element={<BenchmarkDashboard />} />
      </Route>
    </Routes>
  )
}
