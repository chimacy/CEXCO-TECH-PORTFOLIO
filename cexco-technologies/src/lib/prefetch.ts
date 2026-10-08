import { loadSections } from '@/lib/sections'
import { loadFeatured, loadFirstPage, usedCategories } from '@/services/projects'

// Start every homepage request at the same moment the page begins loading (instead of one after another).
if (typeof window !== 'undefined' && window.location.pathname === '/') {
  const ignore = () => undefined
  void loadSections().catch(ignore)
  void usedCategories().catch(ignore)
  void loadFeatured().catch(ignore)
  if (!new URLSearchParams(window.location.search).get('category')) void loadFirstPage(undefined, 12).catch(ignore)
}
