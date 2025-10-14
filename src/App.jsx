import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AdminPage from './pages/AdminPage'
import CheckStatusPage from './pages/CheckStatusPage'
import ValidatePage from './pages/ValidatePage'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admintte" element={<AdminPage />} />
        <Route path="/check" element={<CheckStatusPage />} />
        <Route path="/validate/:token" element={<ValidatePage />} />
      </Routes>
    </Router>
  )
}

export default App
