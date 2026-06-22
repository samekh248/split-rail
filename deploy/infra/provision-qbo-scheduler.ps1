#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$LibDir = Join-Path $RepoRoot 'deploy\lib'
. (Join-Path $LibDir 'qbo-scheduler-names.ps1')
. (Join-Path $LibDir 'gcloud-invoke.ps1')

$GcpProject = Get-RequiredEnvVar 'GCP_PROJECT'
$GcpRegion = Get-RequiredEnvVar 'GCP_REGION'
$EnvName = Get-RequiredEnvVar 'ENV'

Resolve-QboSchedulerNames -Env $EnvName -GcpProject $GcpProject

$ServiceName = if ($env:SERVICE_NAME) { $env:SERVICE_NAME } else { 'split-rail-api' }

$CloudRunUrl = $env:CLOUD_RUN_URL
if ([string]::IsNullOrWhiteSpace($CloudRunUrl)) {
    $CloudRunUrl = Invoke-GcloudOrThrow run services describe $ServiceName `
        --project $GcpProject `
        --region $GcpRegion `
        --format 'value(status.url)'
}

if ([string]::IsNullOrWhiteSpace($CloudRunUrl)) {
    throw 'CLOUD_RUN_URL required or resolvable from Cloud Run service'
}

$TargetUri = "$($CloudRunUrl.TrimEnd('/'))$SCHEDULER_TRIGGER_PATH"

$saDescribe = Invoke-Gcloud @(
    'iam', 'service-accounts', 'describe', $SCHEDULER_SA_EMAIL,
    '--project', $GcpProject
) 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Creating scheduler service account $SCHEDULER_SA_EMAIL..."
    Invoke-GcloudOrThrow iam service-accounts create $SCHEDULER_SA_ID `
        --project $GcpProject `
        --display-name "Split-Rail QBO Scheduler ($EnvName)" | Out-Null
} else {
    Write-Host "Scheduler service account $SCHEDULER_SA_EMAIL already exists"
}

$jobDescribe = Invoke-Gcloud @(
    'scheduler', 'jobs', 'describe', $SCHEDULER_JOB_NAME,
    '--location', $GcpRegion,
    '--project', $GcpProject
) 2>$null

$schedulerArgs = @(
    '--location', $GcpRegion,
    '--project', $GcpProject,
    '--schedule', $SCHEDULER_CRON,
    '--time-zone', $SCHEDULER_TIME_ZONE,
    '--uri', $TargetUri,
    '--http-method', $SCHEDULER_HTTP_METHOD,
    '--oidc-service-account-email', $SCHEDULER_SA_EMAIL,
    '--oidc-token-audience', $CloudRunUrl
)

if ($LASTEXITCODE -eq 0) {
    Write-Host "Updating scheduler job $SCHEDULER_JOB_NAME..."
    Invoke-GcloudOrThrow scheduler jobs update http $SCHEDULER_JOB_NAME @schedulerArgs | Out-Null
} else {
    Write-Host "Creating scheduler job $SCHEDULER_JOB_NAME..."
    Invoke-GcloudOrThrow scheduler jobs create http $SCHEDULER_JOB_NAME @schedulerArgs | Out-Null
}

$env:CLOUD_RUN_URL = $CloudRunUrl
$env:ENV = $EnvName
& (Join-Path $LibDir 'validate-qbo-scheduler.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "QBO scheduler provision complete for ENV=$EnvName"
