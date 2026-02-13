# scripts/tc.ps1
# Helper para trabajar con tu API multi-tenant sin escribir UUIDs a mano.
# - Guarda contexto en: <repo>\.tc-context.json
# - Guarda alias en:    <repo>\.tc-alias.json
# Uso:
#   cd D:\tc-mantenimiento
#   . .\scripts\tc.ps1
#   Set-TcContext -CompanyId "..." -UserId "..." -BaseUrl "http://localhost:3000"
#   Set-TcAlias -Key "mt.aa.preventivo-90d" -Id "..."
#   Invoke-Tc -Method GET -Path "/maintenance-templates/@mt.aa.preventivo-90d"

Set-StrictMode -Version Latest

$script:RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$script:ContextPath = Join-Path $script:RepoRoot ".tc-context.json"
$script:AliasPath = Join-Path $script:RepoRoot ".tc-alias.json"

function ConvertTo-Hashtable {
  param([Parameter(Mandatory=$true)][object]$Obj)

  if ($Obj -is [hashtable]) { return $Obj }

  $ht = @{}
  if ($null -eq $Obj) { return $ht }

  # PSCustomObject -> hashtable
  $Obj.PSObject.Properties | ForEach-Object {
    $ht[$_.Name] = $_.Value
  }
  return $ht
}

function Get-TcContext {
  if (-not (Test-Path $script:ContextPath)) {
    throw "No existe .tc-context.json en: $script:ContextPath"
  }
  return (Get-Content $script:ContextPath -Raw | ConvertFrom-Json)
}

function Show-TcContext {
  $ctx = Get-TcContext
  Write-Host "baseUrl   : $($ctx.baseUrl)"
  Write-Host "companyId : $($ctx.companyId)"
  Write-Host "userId    : $($ctx.userId)"
  Write-Host "Archivo   : $script:ContextPath"
}

function Set-TcContext {
  param(
    [Parameter(Mandatory=$true)][string]$CompanyId,
    [Parameter(Mandatory=$true)][string]$UserId,
    [string]$BaseUrl = "http://localhost:3000"
  )

  $obj = [ordered]@{
    baseUrl   = $BaseUrl
    companyId = $CompanyId
    userId    = $UserId
  }

  ($obj | ConvertTo-Json -Depth 10) | Set-Content -Encoding UTF8 $script:ContextPath
  Write-Host "Contexto guardado en $script:ContextPath"
  Show-TcContext
}

function Get-TcHeaders {
  $ctx = Get-TcContext
  return @{
    "x-company-id" = $ctx.companyId
    "x-user-id"    = $ctx.userId
  }
}

function Get-TcAliases {
  if (-not (Test-Path $script:AliasPath)) {
    return @{}
  }
  $obj = (Get-Content $script:AliasPath -Raw | ConvertFrom-Json)
  return (ConvertTo-Hashtable $obj)
}

function Show-TcAliases {
  $map = Get-TcAliases
  if ($map.Keys.Count -eq 0) {
    Write-Host "(sin aliases) Crea uno con: Set-TcAlias -Key 'mt.aa.preventivo-90d' -Id '<uuid>'"
    return
  }

  $map.GetEnumerator() |
    Sort-Object Name |
    ForEach-Object { "{0} -> {1}" -f $_.Key, $_.Value } |
    ForEach-Object { Write-Host $_ }

  Write-Host "Archivo: $script:AliasPath"
}

function Set-TcAlias {
  param(
    [Parameter(Mandatory=$true)][string]$Key,
    [Parameter(Mandatory=$true)][string]$Id
  )

  $map = Get-TcAliases
  $map[$Key] = $Id

  ($map | ConvertTo-Json -Depth 10) | Set-Content -Encoding UTF8 $script:AliasPath
  Write-Host "Alias guardado: $Key -> $Id"
}

function Remove-TcAlias {
  param([Parameter(Mandatory=$true)][string]$Key)

  $map = Get-TcAliases
  if ($map.ContainsKey($Key)) {
    $map.Remove($Key) | Out-Null
    ($map | ConvertTo-Json -Depth 10) | Set-Content -Encoding UTF8 $script:AliasPath
    Write-Host "Alias eliminado: $Key"
  } else {
    Write-Host "Alias no existe: $Key"
  }
}

function Resolve-TcPath {
  param([Parameter(Mandatory=$true)][string]$Path)

  $map = Get-TcAliases
  $regex = [regex]'@[A-Za-z0-9\.\-_]+'
  $matches = $regex.Matches($Path)

  foreach ($m in $matches) {
    $key = $m.Value.Substring(1) # sin @
    if ($map.ContainsKey($key)) {
      $Path = $Path.Replace($m.Value, $map[$key])
    } else {
      throw "Alias no encontrado: $key. Agrega con: Set-TcAlias -Key '$key' -Id '<uuid>'"
    }
  }
  return $Path
}

function Invoke-Tc {
  param(
    [Parameter(Mandatory=$true)][ValidateSet("GET","POST","PATCH","DELETE")][string]$Method,
    [Parameter(Mandatory=$true)][string]$Path,
    [object]$Body = $null
  )

  $ctx = Get-TcContext
  $headers = Get-TcHeaders

  $resolvedPath = Resolve-TcPath $Path
  $uri = ($ctx.baseUrl.TrimEnd("/") + "/" + $resolvedPath.TrimStart("/"))

  if ($null -eq $Body) {
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
  }

  $json = $Body | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body $json
}
