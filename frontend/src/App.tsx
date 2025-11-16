import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "@/components/ui/toaster"
import { ProtectedRoute } from "@/components/ProtectedRoute"
import { Login } from "@/pages/Login"
import { Register } from "@/pages/Register"
import { Home } from "@/pages/Home"
import { ChannelView } from "@/pages/ChannelView"

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/channels/:guildId/:channelId"
            element={
              <ProtectedRoute>
                <ChannelView />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  )
}

export default App
