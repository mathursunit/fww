<#
SYNOPSIS
  Publish project to GitHub from Windows PowerShell (ASCII-safe).

DESCRIPTION
  - Initializes Git if needed
  - Adds origin to https://github.com/mathursunit/fww.git (change with -RepoUrl)
  - Commits all changes
  - Pushes to the target branch:
      * main if remote is empty
      * v2-YYYYMMDD-HHMM if remote already has history (unless -ForceMain)
PARAMETERS
  -RepoUrl         Git remote URL (HTTPS or SSH)
  -CommitMessage   Commit message
  -ForceMain       Push to main even if remote has history
#>

param(
  [string]$RepoUrl = "https://github.com/mathursunit/fww.git",
  [string]$CommitMessage = "SunSar Wordle v2 - UI + stats + share + PWA",
  [switch]$ForceMain
)

function Stop-OnError($Message){
  Write-Host "[ERROR] $Message" -ForegroundColor Red
  exit 1
}

# 0) Pre-checks
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Stop-OnError "Git is not installed or not on PATH. Install Git for Windows and retry."
}

# 1) Check we are at project root
if (-not (Test-Path -Path ".\index.html")) {
  Write-Host "Warning: index.html not found in the current directory." -ForegroundColor Yellow
  Write-Host "Proceeding anyway... run this from the project root."
}

# 2) Initialize Git if needed
if (-not (Test-Path ".git")) {
  git init | Out-Null
  git branch -M main | Out-Null
  Write-Host "Initialized empty Git repository (main)."
}

# 3) Add .gitignore if missing
$gitignore = @(
  ".DS_Store",
  "Thumbs.db",
  "*.zip",
  "node_modules/",
  "dist/"
) -join "`n"

if (-not (Test-Path ".gitignore")) {
  $gitignore | Out-File -Encoding UTF8 ".gitignore"
  Write-Host "Created .gitignore"
}

# 4) Configure origin
$existing = (git remote -v) 2>$null
if ($existing -notmatch "origin") {
  git remote add origin $RepoUrl | Out-Null
  Write-Host "Added remote 'origin' -> $RepoUrl"
} else {
  Write-Host "Remote 'origin' already set."
}

# 5) Fetch remote info
git fetch origin --prune 2>$null | Out-Null

# Detect if remote has any heads (branches)
$remoteHeads = git ls-remote --heads origin
$remoteHasHistory = $false
if ($remoteHeads) { $remoteHasHistory = $true }

# 6) Stage and commit
git add -A
$pending = git diff --cached --name-only
if (-not $pending) {
  Write-Host "No changes to commit. Continuing to push..."
} else {
  git commit -m $CommitMessage | Out-Null
  Write-Host "Committed changes."
}

# 7) Determine target branch
$targetBranch = "main"
if ($remoteHasHistory -and -not $ForceMain) {
  $ts = Get-Date -Format "yyyyMMdd-HHmm"
  $targetBranch = "v2-$ts"
  git checkout -b $targetBranch | Out-Null
  Write-Host "Remote has history; creating feature branch '$targetBranch'."
} else {
  git branch -M main | Out-Null
}

# 8) Push
Write-Host "Pushing to origin/$targetBranch ..."
git push -u origin $targetBranch
if ($LASTEXITCODE -ne 0) {
  Stop-OnError "Push failed. If the remote is not empty, try running without -ForceMain so it pushes to a new branch."
}

Write-Host ""
Write-Host "Done. Branch: $targetBranch" -ForegroundColor Green
Write-Host "GitHub: $RepoUrl"
if ($targetBranch -ne "main") {
  Write-Host "Next: Open a Pull Request to merge '$targetBranch' into 'main'."
}

# Tip for GitHub Pages
Write-Host ""
Write-Host "Tip: Enable GitHub Pages (Settings -> Pages -> Deploy from a branch -> main / root) for hosting." -ForegroundColor Cyan
