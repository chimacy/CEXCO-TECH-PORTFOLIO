import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import PublicLayout from '@/layouts/PublicLayout'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/lib/auth'

const Home = lazy(() => import('@/pages/Home'))
const Work = lazy(() => import('@/pages/Work'))
const About = lazy(() => import('@/pages/About'))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const Login = lazy(() => import('@/pages/admin/Login'))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const Media = lazy(() => import('@/pages/admin/Media'))
const SettingsPage = lazy(() => import('@/pages/admin/Settings'))
const HomeEditor = lazy(() => import('@/pages/admin/HomeEditor'))
const AboutEditor = lazy(() => import('@/pages/admin/AboutEditor'))
const PortfolioList = lazy(() => import('@/pages/admin/Portfolio').then((m) => ({ default: m.PortfolioList })))
const PortfolioEditor = lazy(() => import('@/pages/admin/Portfolio').then((m) => ({ default: m.PortfolioEditor })))
const CategoriesAdmin = lazy(() => import('@/pages/admin/Content').then((m) => ({ default: m.CategoriesAdmin })))

function SuperOnly({ children }: { children: JSX.Element }) {
  const { isSuperAdmin } = useAuth()
  return isSuperAdmin ? children : <p className="py-16 text-center text-sm text-black/60">Only a SUPER_ADMIN can manage this section.</p>
}

// Links already shared with clients keep working
function LegacyProject() { const { slug = '' } = useParams(); return <Navigate to={`/work/${slug}`} replace /> }
function LegacyCategory() { const { slug = '' } = useParams(); return <Navigate to={`/work?category=${encodeURIComponent(slug)}`} replace /> }

export default function App() {
  return (
    <Suspense fallback={<Spinner className="min-h-screen" />}>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="portfolio" element={<PortfolioList />} />
          <Route path="portfolio/:id" element={<PortfolioEditor />} />
          <Route path="preview/:slug" element={<ProjectDetail preview />} />
          <Route path="categories" element={<CategoriesAdmin />} />
          <Route path="media" element={<Media />} />
          <Route path="homepage" element={<SuperOnly><HomeEditor /></SuperOnly>} />
          <Route path="about" element={<SuperOnly><AboutEditor /></SuperOnly>} />
          <Route path="settings" element={<SuperOnly><SettingsPage /></SuperOnly>} />
        </Route>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="work" element={<Work />} />
          <Route path="work/:slug" element={<ProjectDetail />} />
          <Route path="about" element={<About />} />
          <Route path="portfolio" element={<Navigate to="/work" replace />} />
          <Route path="portfolio/:slug" element={<LegacyProject />} />
          <Route path="categories/:slug" element={<LegacyCategory />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
                             }
