// Vercel serves a static dist/index.html for "/" BEFORE it applies rewrites, so link-preview crawlers never reached the
// SEO function on the home page. Renaming the file to app.html means "/" goes through the rewrites like every other page.
import fs from 'node:fs'
if (fs.existsSync('dist/index.html')) {
  fs.renameSync('dist/index.html', 'dist/app.html')
  console.log('renamed dist/index.html -> dist/app.html')
}
