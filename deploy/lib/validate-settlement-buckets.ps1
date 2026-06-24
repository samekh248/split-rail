#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$LibDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $LibDir 'settlement-bucket-names.ps1')
. (Join-Path $LibDir 'gcloud-invoke.ps1')

$GcpProject = Get-RequiredEnvVar 'GCP_PROJECT'
$EnvName = Get-RequiredEnvVar 'ENV'
Resolve-SettlementBucketNames -Env $EnvName

$MinRetentionSeconds = $ArchiveRetentionMinSeconds
$script:ValidationFailed = $false

function Write-ValidationFail {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
    $script:ValidationFailed = $true
}

function Get-RetentionPeriodSeconds {
    param($Bucket)
    $policy = $Bucket.retention_policy
    if (-not $policy) { $policy = $Bucket.retentionPolicy }
    if (-not $policy) { return $null }
    $raw = $policy.retentionPeriod
    if ($null -eq $raw) { return $null }
    $text = [string]$raw
    if ($text -match '^(\d+)s?$') { return [long]$Matches[1] }
    return $null
}

function Get-PublicAccessPrevention {
    param($Bucket)
    if ($Bucket.public_access_prevention) { return $Bucket.public_access_prevention }
    if ($Bucket.iamConfiguration -and $Bucket.iamConfiguration.publicAccessPrevention) {
        return $Bucket.iamConfiguration.publicAccessPrevention
    }
    return $null
}

$archive = Get-GcsBucketJson -BucketName $ArchiveBucket -Project $GcpProject
if (-not $archive) {
    Write-ValidationFail "FAIL: archive bucket gs://$ArchiveBucket not found or inaccessible"
}

$staging = Get-GcsBucketJson -BucketName $StagingBucket -Project $GcpProject
if (-not $staging) {
    Write-ValidationFail "FAIL: staging bucket gs://$StagingBucket not found or inaccessible"
}

if ($archive) {
    $archiveRetention = Get-RetentionPeriodSeconds -Bucket $archive
    if (-not $archiveRetention) {
        Write-ValidationFail "FAIL: archive bucket $ArchiveBucket has no retention policy"
    }
    elseif ($archiveRetention -lt $MinRetentionSeconds) {
        Write-ValidationFail ('FAIL: archive bucket {0} retention {1}s is less than required {2}s' -f $ArchiveBucket, $archiveRetention, $MinRetentionSeconds)
    }
    else {
        Write-Host "archive_retention_ok: $ArchiveBucket ($archiveRetention s)"
    }

    $pap = Get-PublicAccessPrevention -Bucket $archive
    if ($pap -ne 'enforced') {
        Write-ValidationFail "FAIL: bucket $ArchiveBucket does not enforce public access prevention"
    }
    else {
        Write-Host "public_access_ok: $ArchiveBucket"
    }

    if ($EnvName -eq 'prod') {
        $locked = $false
        if ($archive.retention_policy -and $archive.retention_policy.isLocked -eq $true) { $locked = $true }
        if ($archive.retentionPolicy -and $archive.retentionPolicy.isLocked -eq $true) { $locked = $true }
        if ($archive.retentionPolicyLocked -eq $true) { $locked = $true }
        if (-not $locked) {
            Write-Warning "prod archive bucket $ArchiveBucket retention policy is not locked (expected after CONFIRM_BUCKET_LOCK=true provision)"
        }
    }
}

if ($staging) {
    $stagingRetention = Get-RetentionPeriodSeconds -Bucket $staging
    if ($stagingRetention -and $stagingRetention -gt 0) {
        Write-ValidationFail "FAIL: staging bucket $StagingBucket must not have a retention lock"
    }
    else {
        Write-Host "staging_deletable_ok: $StagingBucket"
    }

    $pap = Get-PublicAccessPrevention -Bucket $staging
    if ($pap -ne 'enforced') {
        Write-ValidationFail "FAIL: bucket $StagingBucket does not enforce public access prevention"
    }
    else {
        Write-Host "public_access_ok: $StagingBucket"
    }
}

if ($script:ValidationFailed) {
    exit 1
}

Write-Host "Settlement bucket validation passed for ENV=$EnvName"
