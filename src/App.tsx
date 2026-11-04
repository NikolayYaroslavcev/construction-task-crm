import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { AuthProvider, useAuth } from '@/lib/auth'
import { AllTasks } from '@/pages/AllTasks'
import { Employees } from '@/pages/Employees'
import { Login } from '@/pages/Login'
import { MyTasks } from '@/pages/MyTasks'
import { ObjectPage } from '@/pages/ObjectPage'
import { Objects } from '@/pages/Objects'
import { TaskPage } from '@/pages/TaskPage'

function RequireAuth() {
  const { profile, loading } = useAuth()
  if (loading) return <div className="min-h-screen" />
  return profile ? <Outlet /> : <Navigate to="/login" replace />
}

// UI convenience only: the data on these screens is protected by RLS regardless
function ManagerOnly({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  return profile?.role === 'manager' ? children : <Navigate to="/my" replace />
}

function Home() {
  const { profile } = useAuth()
  return <Navigate to={profile?.role === 'executor' ? '/my' : '/tasks?status=review'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="objects" element={<Objects />} />
              <Route path="objects/:id" element={<ObjectPage />} />
              <Route path="tasks/:id" element={<TaskPage />} />
              <Route path="my" element={<MyTasks />} />
              <Route
                path="tasks"
                element={
                  <ManagerOnly>
                    <AllTasks />
                  </ManagerOnly>
                }
              />
              <Route
                path="employees"
                element={
                  <ManagerOnly>
                    <Employees />
                  </ManagerOnly>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
