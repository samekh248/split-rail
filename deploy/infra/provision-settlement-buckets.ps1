#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$LibDir = Join-Path $RepoRoot 'deploy\lib'
. (Join-Path $LibDir 'settlement-bucket-names.ps1')
. (Join-Path $LibDir 'gcloud-invoke.ps1')

$GcpProject = Get-RequiredEnvVar 'GCP_PROJECT'
$GcpRegion = Get-RequiredEnvVar 'GCP_REGION'
$EnvName = Get-RequiredEnvVar 'ENV'
Resolve-SettlementBucketNames -Env $EnvName

if (-not $env:RUNTIME_SA_EMAIL) {
    $projectResult = Invoke-GcloudRaw projects describe $GcpProject --format='value(projectNumber)'
    if ($projectResult.ExitCode -eq 0) {
        $projectNumber = ($projectResult.Output | Select-Object -First 1).ToString().Trim()
        if ($projectNumber) {
            $env:RUNTIME_SA_EMAIL = "${projectNumber}-compute@developer.gserviceaccount.com"
        }
    }
}

function New-OrUpdateBucket {
    param([string]$Name)

    if (Test-GcsBucketExists -BucketName $Name -Project $GcpProject) {
        Write-Host "Bucket gs://$Name already exists - updating settings"
        return
    }

    Invoke-GcloudOrThrow storage buckets create "gs://$Name" `
        --project=$GcpProject `
        --location=$GcpRegion `
        --default-storage-class=STANDARD `
        --uniform-bucket-level-access `
        --public-access-prevention | Out-Null
}

function Set-ArchiveRetention {
    $json = Get-GcsBucketJson -BucketName $ArchiveBucket -Project $GcpProject
    $policy = $json.retention_policy
    if (-not $policy) { $policy = $json.retentionPolicy }
    $isLocked = $false
    if ($policy -and $policy.isLocked -eq $true) { $isLocked = $true }
    if ($json.retentionPolicyLocked -eq $true) { $isLocked = $true }

    if ($isLocked) {
        $currentPeriod = $null
        if ($policy.retentionPeriod -match '^(\d+)s?$') {
            $currentPeriod = [long]$Matches[1]
        }
        $minSeconds = $ArchiveRetentionMinSeconds
        if ($currentPeriod -and $currentPeriod -lt $minSeconds) {
            throw ('ERROR: archive bucket {0} is retention-locked with insufficient period ({1}s). Bucket Lock is irreversible - manual ops review required.' -f $ArchiveBucket, $currentPeriod)
        }
        Write-Host "Archive bucket $ArchiveBucket already retention-locked - skipping retention downgrade"
        return
    }

    Invoke-GcloudOrThrow storage buckets update "gs://$ArchiveBucket" `
        --project=$GcpProject `
        --retention-period=2555d | Out-Null
}

function Lock-ArchiveRetentionIfProd {
    if ($EnvName -ne 'prod') { return }
    if ($env:CONFIRM_BUCKET_LOCK -ne 'true') {
        Write-Host "Skipping prod bucket lock - set `$env:CONFIRM_BUCKET_LOCK='true' to apply irreversible Bucket Lock on $ArchiveBucket"
        return
    }

    $json = Get-GcsBucketJson -BucketName $ArchiveBucket -Project $GcpProject
    $policy = $json.retention_policy
    if (-not $policy) { $policy = $json.retentionPolicy }
    $isLocked = $false
    if ($policy -and $policy.isLocked -eq $true) { $isLocked = $true }
    if ($json.retentionPolicyLocked -eq $true) { $isLocked = $true }
    if ($isLocked) {
        Write-Host "Archive bucket $ArchiveBucket already locked"
        return
    }

    Write-Host "Applying irreversible Bucket Lock on $ArchiveBucket..."
    Invoke-GcloudOrThrow storage buckets update "gs://$ArchiveBucket" `
        --project=$GcpProject `
        --lock-retention-period | Out-Null
}

function Bind-BucketIam {
    param([string]$BucketName)

    if ([string]::IsNullOrWhiteSpace($env:RUNTIME_SA_EMAIL)) {
        Write-Warning "RUNTIME_SA_EMAIL not set - skipping IAM bind for gs://$BucketName"
        return
    }

    Invoke-GcloudOrThrow storage buckets add-iam-policy-binding "gs://$BucketName" `
        --project=$GcpProject `
        --member="serviceAccount:$($env:RUNTIME_SA_EMAIL)" `
        --role='roles/storage.objectAdmin' `
        --quiet | Out-Null
    Write-Host "IAM bound $($env:RUNTIME_SA_EMAIL) -> gs://$BucketName"
}

Write-Host "Provisioning settlement buckets for ENV=$EnvName..."
Write-Host "  Archive: gs://$ArchiveBucket"
Write-Host "  Staging: gs://$StagingBucket"

New-OrUpdateBucket -Name $ArchiveBucket
Set-ArchiveRetention
Lock-ArchiveRetentionIfProd

New-OrUpdateBucket -Name $StagingBucket
# Staging bucket: no retention-period or lock-retention-period (deletable for orphan cleanup)

Bind-BucketIam -BucketName $ArchiveBucket
Bind-BucketIam -BucketName $StagingBucket

$env:GCP_PROJECT = $GcpProject
$env:ENV = $EnvName
& (Join-Path $LibDir 'validate-settlement-buckets.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Settlement bucket provisioning complete for ENV=$EnvName"
