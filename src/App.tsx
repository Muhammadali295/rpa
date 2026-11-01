import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/document-intelligence" replace />} />
      <Route element={<AppShell />}>
        <Route path="policy-assistant" />
        <Route path="document-intelligence" />
      </Route>
      <Route path="*" element={<Navigate to="/document-intelligence" replace />} />
    </Routes>
  )
}