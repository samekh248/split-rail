#Requires -Version 5.1
# Apply EF Core migrations via migration bundle. Uses Cloud SQL Auth Proxy by default.
# Local smoke: $env:SKIP_CLOUD_SQL_PROXY='true'; $env:MIGRATE_CONNECTION_STRING='...'; & .\deploy\lib\migrate-bundle.ps1
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$BundlePath = if ($env:BUNDLE_PATH) { $env:BUNDLE_PATH } else { Join-Path $RepoRoot 'artifacts\efbundle' }
$ProxyPort = if ($env:CLOUDSQL_PROXY_PORT) { [int]$env:CLOUDSQL_PROXY_PORT } else { 5432 }
$proxyProcess = $null

function Build-BundleIfMissing {
    if (Test-Path -LiteralPath $BundlePath) {
        return
    }

    Write-Host 'Building EF migration bundle...'
    $ApiProject = Join-Path $RepoRoot 'apps\api\split-rail-api.csproj'
    dotnet restore $ApiProject
    if ($LASTEXITCODE -ne 0) { throw 'dotnet restore failed' }
    dotnet ef migrations bundle `
        --project $ApiProject `
        --configuration Release `
        --output $BundlePath `
        --self-contained
    if ($LASTEXITCODE -ne 0) { throw 'dotnet ef migrations bundle failed' }
}

function Invoke-MigrationBundle {
    param([string]$ConnectionString)

    $apiDir = Join-Path $RepoRoot 'apps\api'
    $bundleDir = Split-Path -Parent $BundlePath
    if (-not (Test-Path -LiteralPath $bundleDir)) {
        New-Item -ItemType Directory -Path $bundleDir -Force | Out-Null
    }

    # Self-contained EF bundles look for appsettings beside the binary and/or in cwd.
    Copy-Item -Force (Join-Path $apiDir 'appsettings.json') (Join-Path $bundleDir 'appsettings.json')
    $devSettings = Join-Path $apiDir 'appsettings.Development.json'
    if (Test-Path -LiteralPath $devSettings) {
        Copy-Item -Force $devSettings (Join-Path $bundleDir 'appsettings.Development.json')
    }

    Write-Host 'Applying migrations...'
    # Published bundles default ASPNETCORE_ENVIRONMENT to Production; force Development so
    # host bootstrap can load design-time config. --connection still overrides the database.
    $prevEnv = $env:ASPNETCORE_ENVIRONMENT
    if ([string]::IsNullOrWhiteSpace($env:ASPNETCORE_ENVIRONMENT)) {
        $env:ASPNETCORE_ENVIRONMENT = 'Development'
    }
    try {
        Push-Location $apiDir
        & $BundlePath --connection $ConnectionString
        if ($LASTEXITCODE -ne 0) { throw 'Migration bundle failed' }
    }
    finally {
        Pop-Location
        if ($null -eq $prevEnv) {
            Remove-Item Env:ASPNETCORE_ENVIRONMENT -ErrorAction SilentlyContinue
        } else {
            $env:ASPNETCORE_ENVIRONMENT = $prevEnv
        }
    }
}

function Wait-ProxyPort {
    param([int]$Port)

    for ($attempt = 1; $attempt -le 60; $attempt++) {
        $tcp = Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -WarningAction SilentlyContinue
        if ($tcp.TcpTestSucceeded) {
            Write-Host "Cloud SQL Auth Proxy ready after $attempt attempt(s)"
            return
        }
        Start-Sleep -Seconds 1
    }

    throw "Timed out waiting for Cloud SQL Auth Proxy on port $Port"
}

try {
    if ($env:SKIP_CLOUD_SQL_PROXY -eq 'true') {
        if ([string]::IsNullOrWhiteSpace($env:MIGRATE_CONNECTION_STRING)) {
            throw 'MIGRATE_CONNECTION_STRING required when SKIP_CLOUD_SQL_PROXY=true'
        }
        Build-BundleIfMissing
        Invoke-MigrationBundle -ConnectionString $env:MIGRATE_CONNECTION_STRING
        return
    }

    if ([string]::IsNullOrWhiteSpace($env:INSTANCE_CONNECTION_NAME)) {
        throw 'INSTANCE_CONNECTION_NAME required'
    }
    if ([string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) {
        throw 'DB_PASSWORD required'
    }
    if ([string]::IsNullOrWhiteSpace($env:GCP_PROJECT)) {
        throw 'GCP_PROJECT required'
    }

    Build-BundleIfMissing

    $proxyCmd = Get-Command cloud-sql-proxy -ErrorAction SilentlyContinue
    if (-not $proxyCmd) {
        throw 'cloud-sql-proxy is required. See https://cloud.google.com/sql/docs/mysql/sql-proxy'
    }

    Write-Host "Starting Cloud SQL Auth Proxy on port $ProxyPort..."
    $proxyProcess = Start-Process -FilePath $proxyCmd.Source `
        -ArgumentList @($env:INSTANCE_CONNECTION_NAME, '--port', "$ProxyPort") `
        -PassThru -NoNewWindow

    Wait-ProxyPort -Port $ProxyPort

    $migrateConnectionString = "Host=127.0.0.1;Port=$ProxyPort;Database=split-rail-db;Username=postgres;Password=$($env:DB_PASSWORD);Include Error Detail=false"
    Invoke-MigrationBundle -ConnectionString $migrateConnectionString
}
finally {
    if ($proxyProcess -and -not $proxyProcess.HasExited) {
        $proxyProcess.Kill()
        $proxyProcess.WaitForExit()
    }
}
