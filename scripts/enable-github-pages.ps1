# Enable GitHub Pages via GitHub Actions (recommended).
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

Write-Host 'Enabling GitHub Pages (GitHub Actions)...'

$existing = gh api repos/mortenaho/Lisek/pages 2>$null
if ($LASTEXITCODE -eq 0) {
  gh api repos/mortenaho/Lisek/pages -X PUT -f build_type=workflow | Out-Null
} else {
  gh api repos/mortenaho/Lisek/pages -X POST -f build_type=workflow | Out-Null
}

Write-Host 'Triggering deploy workflow...'
gh workflow run pages.yml --ref main

Write-Host ''
Write-Host 'Done. Site URL (wait 1-2 min):'
Write-Host '  https://mortenaho.github.io/Lisek/'
Write-Host ''
Write-Host 'If deploy still fails, open Settings -> Pages and set Source to GitHub Actions.'
