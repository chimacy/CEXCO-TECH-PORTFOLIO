import { Link } from 'react-router-dom'
import { useSeo } from '@/hooks/useSeo'

export default function NotFound() {
  useSeo({ title: 'Page not found', noindex: true })
  return (
    <div className="container-x flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="font-display text-8xl font-bold text-accent sm:text-9xl">404</p>
      <h1 className="mt-4 font-display text-3xl font-bold sm:text-5xl">THIS PAGE DOESN'T EXIST.</h1>
      <Link to="/" className="btn btn-primary mt-8 !px-7 !py-3">BACK TO HOME</Link>
    </div>
  )
}
