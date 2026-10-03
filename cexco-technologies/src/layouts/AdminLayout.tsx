import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2, FolderTree, Home, Image as ImageIcon, ImagePlus, LayoutDashboard, LogOut, Menu, Plus, Settings, User, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useSettings } from '@/lib/settings'
import { Modal, Spinner } from '@/components/ui'
import { cn } from '@/utils/format'

interface Item { to: string; label: string; icon: typeof Home; end?: boolean; superOnly?: boolean }
const GROUPS: { title?: string; items: Item[] }[] = [
  { items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }] },
  { title: 'Portfolio', items: [
    { to: '/admin/portfolio', label: 'All Projects', icon: ImageIcon, end: true }, { to: '/admin/portfolio/new', label: 'Add Project', icon: Plus },
    { to: '/admin/categories', label: 'Categories', icon: FolderTree }] },
  { title: 'Site', items: [
    { to: '/admin/homepage', label: 'Homepage', icon: Home, superOnly: true }, { to: '/admin/about', label: 'About', icon: User, superOnly: true },
    { to: '/admin/media', label: 'Media Library', icon: ImagePlus }, { to: '/admin/settings', label: 'Settings', icon: Settings, superOnly: true }] },
]

export default function AdminLayout() {
  const { session, role, loading, signOut, isSuperAdmin } = useAuth()
  const { settings } = useSettings()
  const [open, setOpen] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname, loc.search])
  useEffect(() => { document.title = `Admin | ${settings?.brand_name ?? ''}` }, [settings?.brand_name])

  if (loading) return <Spinner className="min-h-screen" />
  if (!session) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />
  if (!role) return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-bold">No admin access</h1>
      <p className="mt-2 max-w-md text-sm text-black/60">{session.user.email} is signed in but has not been granted an admin role. See the README to run <code>make_admin</code>.</p>
      <button className="btn btn-primary mt-6" onClick={() => void signOut()}>Sign out</button>
    </main>
  )

  const doSignOut = async () => {
    setSigningOut(true)
    try { await signOut() } finally { setSigningOut(false); setConfirmOut(false) }
  }

  const nav = (
    <nav aria-label="Admin" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
      {GROUPS.map((g, i) => (
        <div key={i}>
          {g.title && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">{g.title}</p>}
          {g.items.filter((it) => !it.superOnly || isSuperAdmin).map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white', isActive && !it.to.includes('?') && 'bg-white/15 text-white')}>
              <it.icon className="h-4 w-4" aria-hidden /> {it.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
  const side = (
    <div className="flex h-full flex-col bg-ink text-white">
      <div className="flex h-16 items-center justify-between px-5 font-display font-bold"><span className="truncate">{settings?.brand_name}</span></div>
      {nav}
      <div className="border-t border-white/10 p-3 text-xs">
        <p className="truncate px-3 text-white/50">{session.user.email} · {role}</p>
        <Link to="/" target="_blank" className="mt-2 block rounded-xl px-3 py-2 text-white/70 hover:bg-white/10">View site ↗</Link>
        <button onClick={() => { setOpen(false); setConfirmOut(true) }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-white/70 hover:bg-white/10"><LogOut className="h-4 w-4" /> Logout</button>
      </div>
    </div>
  )
  return (
    <div className="min-h-screen bg-[#f3f3ef] lg:pl-64">
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{side}</aside>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} /><div className="absolute inset-y-0 left-0 w-72 max-w-[85%]">{side}</div></div>}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-black/10 bg-white px-4 lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Open navigation"><Menu className="h-6 w-6" /></button>
        <span className="font-display font-semibold">{settings?.brand_name}</span>
        {open && <button className="ml-auto" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>}
      </header>
      <main className="mx-auto max-w-6xl px-[35px] py-6 sm:py-8"><Outlet /></main>
      <Modal open={confirmOut} onClose={() => !signingOut && setConfirmOut(false)} title="Sign out?"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setConfirmOut(false)} disabled={signingOut}>Stay signed in</button>
          <button className="btn btn-primary" onClick={() => void doSignOut()} disabled={signingOut}>{signingOut && <Loader2 className="h-4 w-4 animate-spin" />}Sign out</button>
        </>}>
        <p className="text-sm text-black/70">You will need to sign in again to manage {settings?.brand_name ?? 'the site'}.</p>
      </Modal>
    </div>
  )
    }
