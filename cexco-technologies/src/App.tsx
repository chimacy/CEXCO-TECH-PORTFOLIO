import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import PublicLayout from '@/layouts/PublicLayout'
import { Spinner } from '@/components/ui'
import { useAuth } from '@/lib/auth'

const Home = lazy(() => import('@/pages/Home'))
const Portfolio = lazy(() => import('@/pages/Portfolio'))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'))
const Services = lazy(() => import('@/pages/Services').then((m) => ({ default: m.ServicesList })))
const ServiceDetail = lazy(() => import('@/pages/Services').then((m) => ({ default: m.ServiceDetail })))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Request = lazy(() => import('@/pages/Request'))
const Contact = lazy(() => import('@/pages/Contact'))
const About = lazy(() => import('@/pages/About'))
const StaticPage = lazy(() => import('@/pages/StaticPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))

const AdminLayout = lazy(() => import('@/layouts/AdminLayout'))
const Login = lazy(() => import('@/pages/admin/Login'))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const Media = lazy(() => import('@/pages/admin/Media'))
const SettingsPage = lazy(() => import('@/pages/admin/Settings'))
const PortfolioList = lazy(() => import('@/pages/admin/Portfolio').then((m) => ({ default: m.PortfolioList })))
const PortfolioEditor = lazy(() => import('@/pages/admin/Portfolio').then((m) => ({ default: m.PortfolioEditor })))
const RequestsList = lazy(() => import('@/pages/admin/Requests').then((m) => ({ default: m.RequestsList })))
const RequestDetail = lazy(() => import('@/pages/admin/Requests').then((m) => ({ default: m.RequestDetail })))
const ClientsAdmin = lazy(() => import('@/pages/admin/Requests').then((m) => ({ default: m.ClientsAdmin })))
const MessagesAdmin = lazy(() => import('@/pages/admin/Requests').then((m) => ({ default: m.MessagesAdmin })))
const HomepageManager = lazy(() => import('@/pages/admin/Site').then((m) => ({ default: m.HomepageManager })))
const PagesManager = lazy(() => import('@/pages/admin/Site').then((m) => ({ default: m.PagesManager })))
const CategoriesAdmin = lazy(() => import('@/pages/admin/Content').then((m) => ({ default: m.CategoriesAdmin })))
const ServicesAdmin = lazy(() => import('@/pages/admin/Content').then((m) => ({ default: m.ServicesAdmin })))
const PricingAdmin = lazy(() => import('@/pages/admin/Content').then((m) => ({ default: m.PricingAdmin })))
const TestimonialsAdmin = lazy(() => import('@/pages/admin/Content').then((m) => ({ default: m.TestimonialsAdmin })))
const ExtrasAdmin = lazy(() => import('@/pages/admin/Content').then((m) => ({ default: m.ExtrasAdmin })))

function SuperOnly({ children }: { children: JSX.Element }) {
  const { isSuperAdmin } = useAuth()
  return isSuperAdmin ? children : <p className="py-16 text-center text-sm text-black/60">Only a SUPER_ADMIN can manage this section.</p>
}

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
          <Route path="services" element={<ServicesAdmin />} />
          <Route path="pricing" element={<PricingAdmin />} />
          <Route path="requests" element={<RequestsList />} />
          <Route path="requests/:id" element={<RequestDetail />} />
          <Route path="clients" element={<ClientsAdmin />} />
          <Route path="messages" element={<MessagesAdmin />} />
          <Route path="testimonials" element={<TestimonialsAdmin />} />
          <Route path="media" element={<Media />} />
          <Route path="homepage" element={<SuperOnly><HomepageManager /></SuperOnly>} />
          <Route path="pages" element={<SuperOnly><PagesManager /></SuperOnly>} />
          <Route path="extras" element={<SuperOnly><ExtrasAdmin /></SuperOnly>} />
          <Route path="settings" element={<SuperOnly><SettingsPage /></SuperOnly>} />
        </Route>
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="portfolio/:slug" element={<ProjectDetail />} />
          <Route path="categories/:slug" element={<Portfolio byCategory />} />
          <Route path="services" element={<Services />} />
          <Route path="services/:slug" element={<ServiceDetail />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="about" element={<About />} />
          <Route path="request" element={<Request />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<StaticPage slug="privacy" />} />
          <Route path="terms" element={<StaticPage slug="terms" />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
