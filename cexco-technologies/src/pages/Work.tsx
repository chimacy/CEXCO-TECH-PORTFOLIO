import { useAsync } from '@/hooks/useAsync'
import { useSeo } from '@/hooks/useSeo'
import * as api from '@/services/api'
import { WorkArchive } from '@/components/WorkArchive'

export default function Work() {
  const sections = useAsync(api.getSections, [])
  const intro = sections.data?.find((s) => s.key === 'featured_work')?.description
  useSeo({ title: 'Work', description: intro ?? 'A curated archive of graphic design, branding, campaigns and visual projects.', path: '/work' })
  return (
    <div className="container-x pt-10 sm:pt-16 lg:pt-20">
      <header className="mb-12 grid gap-6 sm:mb-16 lg:grid-cols-12 lg:gap-x-12">
        <div className="lg:col-span-7">
          <p className="eyebrow">Archive</p>
          <h1 className="mt-4 animate-fadeUp font-display text-[clamp(3rem,13vw,4.5rem)] font-medium uppercase leading-[.92] tracking-[-0.04em] sm:text-[clamp(4rem,10vw,8rem)]">Work</h1>
        </div>
        {intro && <p className="max-w-md text-[15px] leading-relaxed text-black/60 sm:text-base lg:col-span-4 lg:col-start-9 lg:self-end">{intro}</p>}
      </header>
      <WorkArchive />
    </div>
  )
}
