import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { DocumentIntelligencePage } from './pages/DocumentIntelligencePage'
import { PolicyAssistantPage } from './pages/PolicyAssistantPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/policy-assistant" replace />} />
        <Route path="policy-assistant" element={<PolicyAssistantPage />} />
        <Route
          path="document-intelligence"
          element={<DocumentIntelligencePage />}
        />
        <Route path="*" element={<Navigate to="/policy-assistant" replace />} />
      </Route>
    </Routes>
  )
}
