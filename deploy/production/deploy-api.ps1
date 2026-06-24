#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$LibDir = Join-Path $RepoRoot 'deploy\lib'
. (Join-Path $LibDir 'settlement-bucket-names.ps1')
. (Join-Path $LibDir 'gcloud-invoke.ps1')

$GcpProject = Get-RequiredEnvVar 'GCP_PROJECT'
$GcpRegion = Get-RequiredEnvVar 'GCP_REGION'
$Image = Get-RequiredEnvVar 'IMAGE'

$ServiceName = if ($env:SERVICE_NAME) { $env:SERVICE_NAME } else { 'split-rail-api' }
$BundlePath = Join-Path $RepoRoot 'artifacts\efbundle'
$ProdInstance = 'split-rail:us-central1:split-rail-db-prod'

Write-Host 'Validating settlement archive buckets before deploy...'
$env:ENV = 'prod'
& (Join-Path $LibDir 'validate-settlement-buckets.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Validating QBO scheduler job before deploy...'
$env:ENV = 'prod'
if ([string]::IsNullOrWhiteSpace($env:CLOUD_RUN_URL)) {
    $env:CLOUD_RUN_URL = Invoke-GcloudOrThrow run services describe $ServiceName `
        --project $GcpProject `
        --region $GcpRegion `
        --format 'value(status.url)'
}
& (Join-Path $LibDir 'validate-qbo-scheduler.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host 'Building migration bundle...'
dotnet ef migrations bundle `
    --project (Join-Path $RepoRoot 'apps\api\split-rail-api.csproj') `
    --configuration Release `
    --output $BundlePath `
    --self-contained
if ($LASTEXITCODE -ne 0) { throw 'dotnet ef migrations bundle failed' }

Write-Host 'Applying migrations to production database...'
$env:INSTANCE_CONNECTION_NAME = $ProdInstance
$env:GCP_PROJECT = $GcpProject
$env:BUNDLE_PATH = $BundlePath
# DB_PASSWORD for the migration step must be fetched before running this script, e.g.:
#   $env:DB_PASSWORD = (gcloud secrets versions access latest --secret=db-password --project=$env:GCP_PROJECT)
# Never embed cleartext passwords in this script (Constitution VIII).
if ([string]::IsNullOrWhiteSpace($env:DB_PASSWORD)) {
    throw 'DB_PASSWORD required for migration step — fetch from Secret Manager before running'
}

& (Join-Path $LibDir 'migrate-bundle.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$SettlementEnv = 'SettlementArchive__BucketName=split-rail-settlements-prod,SettlementArchive__StagingBucketName=split-rail-settlements-staging-prod,SettlementArchive__RetentionYears=7,SettlementArchive__EnforceRetentionValidation=true'
$SchedulerSaEmail = "split-rail-qbo-scheduler-prod@$GcpProject.iam.gserviceaccount.com"
$QboSchedulerEnv = "QboSync__SchedulerServiceAccountEmail=$SchedulerSaEmail,QboSync__SchedulerTokenAudience=$($env:CLOUD_RUN_URL)"
$SetSecrets = 'DB_PASSWORD=db-password:latest,Jwt__Secret=jwt-signing-key:latest,QBO_CLIENT_ID=qbo-client-id:latest,QBO_CLIENT_SECRET=qbo-client-secret:latest'

Write-Host "Deploying Cloud Run API service $ServiceName..."
Invoke-GcloudOrThrow run deploy $ServiceName `
    --image $Image `
    --region $GcpRegion `
    --project $GcpProject `
    --add-cloudsql-instances=$ProdInstance `
    --set-secrets=$SetSecrets `
    --set-env-vars "ASPNETCORE_ENVIRONMENT=Production,$SettlementEnv,$QboSchedulerEnv" `
    --quiet | Out-Null

Write-Host 'Production API deploy complete.'
