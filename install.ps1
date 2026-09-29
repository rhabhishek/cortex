<#
.SYNOPSIS
  Cortex installer for Windows (PowerShell equivalent of install.sh).
.DESCRIPTION
  Ensures Node.js >= 18 (installs via winget or choco if missing), then hands off
  to the one-command wizard `node bin/cortex.mjs setup`, which scaffolds a vault,
  captures credentials into DPAPI-encrypted secure storage + your $PROFILE,
  installs the Copilot adapter (all built-in tools), wires MCP servers, and runs
  doctor. Safe + idempotent — re-run anytime.
.EXAMPLE
  ./install.ps1
#>
[CmdletBinding()]
param([Parameter(ValueFromRemainingArguments = $true)] $Rest)

$ErrorActionPreference = 'Stop'
$MinNodeMajor = 18
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

function Get-NodeMajor {
  try {
    $v = (& node -v) 2>$null
    if ($v -match '^v(\d+)') { return [int]$Matches[1] }
  } catch {}
  return 0
}

function Install-Node {
  Write-Host "Node >= $MinNodeMajor not found — installing..." -ForegroundColor Yellow
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
    choco install nodejs-lts -y
  } else {
    Write-Error "No winget or choco found. Install Node >= $MinNodeMajor manually: https://nodejs.org/"
    exit 1
  }
  # Refresh PATH for the current session so `node` resolves without a new shell.
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
              [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

function Ensure-Node {
  if ((Get-Command node -ErrorAction SilentlyContinue) -and (Get-NodeMajor) -ge $MinNodeMajor) {
    Write-Host ("OK Node " + (& node -v)) -ForegroundColor Green
    return
  }
  Install-Node
  if (-not (Get-Command node -ErrorAction SilentlyContinue) -or (Get-NodeMajor) -lt $MinNodeMajor) {
    Write-Error "Node install did not succeed. Install Node >= $MinNodeMajor manually: https://nodejs.org/"
    exit 1
  }
  Write-Host ("OK Node " + (& node -v)) -ForegroundColor Green
}

Ensure-Node
& node (Join-Path $ScriptDir 'bin/cortex.mjs') setup @Rest
exit $LASTEXITCODE
