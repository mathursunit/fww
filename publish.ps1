<#
.SYNOPSIS
  Publish SunSar Wordle v2 to GitHub from Windows 11 PowerShell.

.DESCRIPTION
  - Initializes Git if needed
  - Adds origin to https://github.com/mathursunit/fww.git (changeable via -RepoUrl)
  - Commits all changes
  - Pushes to the target branch. If the remote repo has existing commits, it will push to a new branch (v2-YYYYMMDD-HHMM) unless -ForceMain is specified.

.PARAMETER RepoUrl
  GitHub repository URL. Defaults to "https://github.com/mathursunit/fww.git".

.PARAMETER CommitMessage
  Commit message. Defaults to "SunSar Wordle v2 â€” UI + stats + share + PWA".

.PARAMETER ForceMain
  If set, will push to 'main' even if the remote already has history (may fail if there are conflicts).
#>

param(
  [string]$RepoUrl = "https://github.com/mathursunit/fww.git",
  [string]$CommitMessage = "SunSar Wordle v2 â€” UI + stats + share + PWA",
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

# 1) Ensure we're in the project folder (index.html should exist)
if (-not (Test-Path -Path ".\index.html")) {
  Write-Host "Warning: index.html not found in the current directory." -ForegroundColor Yellow
  Write-Host "Proceeding anyway... (Run this script from your project's root)"
}

# 2) Initialize Git if needed
if (-not (Test-Path ".git")) {
  git init | Out-Null
  # Default branch
  git branch -M main | Out-Null
  Write-Host "Initialized empty Git repository (main)."
}

# 3) Add .gitignore (non-destructive)
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

# 4) Configure 'origin' remote
$existing = (git remote -v) 2>$null
if ($existing -notmatch "origin") {
  git remote add origin $RepoUrl | Out-Null
  Write-Host "Added remote 'origin' -> $RepoUrl"
} else {
  Write-Host "Remote 'origin' already set."
}

# 5) Fetch remote info
git fetch origin --prune 2>$null | Out-Null

# Detect if remote is empty (no heads)
$remoteHeads = git ls-remote --heads origin
$remoteHasHistory = $false
if ($remoteHeads) { $remoteHasHistory = $true }

# 6) Stage & commit
git add -A
# Only commit if there are staged changes
$pending = git diff --cached --name-only
if (-not $pending) {
  Write-Host "No changes to commit. Continuing to push..."
} else {
  git commit -m $CommitMessage | Out-Null
  Write-Host "Committed changes."
}

# 7) Decide target branch
$targetBranch = "main"
if ($remoteHasHistory -and -not $ForceMain) {
  $ts = Get-Date -Format "yyyyMMdd-HHmm"
  $targetBranch = "v2-$ts"
  git checkout -b $targetBranch | Out-Null
  Write-Host "Remote has history; creating feature branch '$targetBranch'."
} else {
  # Ensure local branch name is 'main'
  git branch -M main | Out-Null
}

# 8) Push
Write-Host "Pushing to origin/$targetBranch ..."
git push -u origin $targetBranch
if ($LASTEXITCODE -ne 0) {
  Stop-OnError "Push failed. Try resolving by pulling or pushing to a new branch (re-run without -ForceMain)."
}

Write-Host ""
Write-Host "âœ… Done. Branch: $targetBranch" -ForegroundColor Green
Write-Host "GitHub: $RepoUrl"
if ($targetBranch -ne "main") {
  Write-Host "Next: Open a Pull Request to merge '$targetBranch' into 'main'."
}

# Optional tip for GitHub Pages
Write-Host ""
Write-Host "TIP: Enable GitHub Pages (Settings â†’ Pages â†’ Deploy from a branch â†’ main / root) for hosting." -ForegroundColor Cyan

