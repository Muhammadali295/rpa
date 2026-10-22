import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/policy-assistant" replace />} />
        <Route path="policy-assistant" />
        <Route path="document-intelligence" />
        <Route path="*" element={<Navigate to="/policy-assistant" replace />} />
      </Route>
    </Routes>
  )
}
