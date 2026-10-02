/** Public pages the admin can switch off. Hiding a page also hides its menu/footer links and its homepage section(s). */
export const TOGGLEABLE_PAGES = [
  { key: 'portfolio', label: 'Portfolio', paths: ['/portfolio', '/categories'], sections: ['featured_work', 'categories'] },
  { key: 'services', label: 'Services', paths: ['/services'], sections: ['services'] },
  { key: 'pricing', label: 'Pricing', paths: ['/pricing'], sections: ['pricing'] },
  { key: 'about', label: 'About', paths: ['/about'], sections: ['about'] },
  { key: 'contact', label: 'Contact', paths: ['/contact'], sections: ['contact'] },
] as const

type Disabled = string[] | null | undefined

export const isPageDisabled = (disabled: Disabled, key: string): boolean => !!disabled?.includes(key)

export const isPathDisabled = (disabled: Disabled, pathname: string): boolean =>
  TOGGLEABLE_PAGES.some((p) => isPageDisabled(disabled, p.key) && p.paths.some((x) => pathname === x || pathname.startsWith(`${x}/`)))

export const isSectionDisabled = (disabled: Disabled, sectionKey: string): boolean =>
  TOGGLEABLE_PAGES.some((p) => isPageDisabled(disabled, p.key) && (p.sections as readonly string[]).includes(sectionKey))
