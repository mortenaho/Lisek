# Enable GitHub Pages for this repo (main branch, /docs folder).
# Requires: gh auth login
# Run: .\scripts\enable-github-pages.ps1

$ErrorActionPreference = 'Stop'

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error 'Install GitHub CLI: https://cli.github.com/'
}

gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Log in to GitHub first:'
  gh auth login
}

Write-Host 'Enabling GitHub Pages (main /docs)...'
gh api repos/mortenaho/Lisek/pages -X POST `
  -f build_type=legacy `
  -f 'source[branch]=main' `
  -f 'source[path]=/docs'

Write-Host ''
Write-Host 'Done. Site URL (wait 1-2 min):'
Write-Host '  https://mortenaho.github.io/Lisek/'
