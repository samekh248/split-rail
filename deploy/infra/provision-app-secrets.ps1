#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$LibDir = Join-Path $RepoRoot 'deploy\lib'
. (Join-Path $LibDir 'gcloud-invoke.ps1')
. (Join-Path $LibDir 'settlement-bucket-names.ps1')

$GcpProject = Get-RequiredEnvVar 'GCP_PROJECT'

# Application boot secrets for Cloud Run (SPLR-48). Values are added separately via:
#   gcloud secrets versions add SECRET_ID --data-file=-
# Never commit or echo secret values (Constitution VIII).

$AppSecrets = @(
    'jwt-signing-key',
    'qbo-client-id',
    'qbo-client-secret',
    'qbo-internal-trigger-key'
)

function Ensure-SecretResource {
    param([string]$SecretId)

    $describe = Invoke-GcloudRaw secrets describe $SecretId --project=$GcpProject
    if ($describe.ExitCode -eq 0) {
        Write-Host "Secret $SecretId already exists in project $GcpProject"
        return
    }

    Write-Host "Creating secret $SecretId in project $GcpProject..."
    Invoke-GcloudOrThrow secrets create $SecretId `
        --project=$GcpProject `
        --replication-policy=automatic | Out-Null
}

Write-Host 'Provisioning application Secret Manager resources (no values written)...'
foreach ($secretId in $AppSecrets) {
    Ensure-SecretResource -SecretId $secretId
}

$dbDescribe = Invoke-GcloudRaw secrets describe db-password --project=$GcpProject
if ($dbDescribe.ExitCode -eq 0) {
    Write-Host 'Secret db-password already exists (Cloud SQL deploy prerequisite).'
}
else {
    Write-Host 'NOTE: db-password not found — create and populate before production deploy (spec 053).'
}

Write-Host 'Done. Add secret versions with gcloud secrets versions add (see specs/055-gcp-secret-manager-qbo-jwt/quickstart.md).'
