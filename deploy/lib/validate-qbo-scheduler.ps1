#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$LibDir = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $LibDir 'qbo-scheduler-names.ps1')
. (Join-Path $LibDir 'gcloud-invoke.ps1')

$GcpProject = Get-RequiredEnvVar 'GCP_PROJECT'
$GcpRegion = Get-RequiredEnvVar 'GCP_REGION'
$EnvName = Get-RequiredEnvVar 'ENV'
$CloudRunUrl = Get-RequiredEnvVar 'CLOUD_RUN_URL'

Resolve-QboSchedulerNames -Env $EnvName -GcpProject $GcpProject

$TargetUri = "$($CloudRunUrl.TrimEnd('/'))$SCHEDULER_TRIGGER_PATH"
$Failures = 0

function Test-Check {
    param(
        [string]$Label,
        [bool]$Ok
    )
    if ($Ok) {
        Write-Host "${Label}_ok"
    } else {
        Write-Host "${Label}_FAIL" -ForegroundColor Red
        $script:Failures++
    }
}

$jobJson = Invoke-Gcloud @(
    'scheduler', 'jobs', 'describe', $SCHEDULER_JOB_NAME,
    '--location', $GcpRegion,
    '--project', $GcpProject,
    '--format', 'json'
) 2>$null

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($jobJson)) {
    Write-Host 'scheduler_job_missing_FAIL' -ForegroundColor Red
    exit 1
}

$job = $jobJson | ConvertFrom-Json
$httpTarget = $job.httpTarget
if (-not $httpTarget) { $httpTarget = $job.http_target }

$schedule = $job.schedule
$uri = $httpTarget.uri
$httpMethod = $httpTarget.httpMethod
if (-not $httpMethod) { $httpMethod = $httpTarget.http_method }

$oidc = $httpTarget.oidcToken
if (-not $oidc) { $oidc = $httpTarget.oidc_token }

$oidcSa = $oidc.serviceAccountEmail
if (-not $oidcSa) { $oidcSa = $oidc.service_account_email }

$oidcAud = $oidc.audience

Test-Check -Label 'schedule' -Ok ($schedule -eq $SCHEDULER_CRON)
Test-Check -Label 'uri' -Ok ($uri -eq $TargetUri)
Test-Check -Label 'http_method' -Ok ($httpMethod -eq $SCHEDULER_HTTP_METHOD)
Test-Check -Label 'oidc_sa' -Ok ($oidcSa -eq $SCHEDULER_SA_EMAIL)
Test-Check -Label 'oidc_audience' -Ok ($oidcAud -eq $CloudRunUrl)

if ($Failures -gt 0) {
    Write-Host "validate-qbo-scheduler: $Failures check(s) failed for ENV=$EnvName" -ForegroundColor Red
    exit 1
}

Write-Host "validate-qbo-scheduler: all checks passed for ENV=$EnvName"
