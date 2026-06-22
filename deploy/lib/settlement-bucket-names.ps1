# Shared bucket name resolution for settlement archive IaC (spec 054).
# Dot-source from provision/validate scripts — do not run directly.

function Resolve-SettlementBucketNames {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [ValidateSet('dev', 'preview', 'prod')]
        [string]$Env
    )

    switch ($Env) {
        'dev' {
            $script:ArchiveBucket = 'split-rail-settlements-dev'
            $script:StagingBucket = 'split-rail-settlements-staging-dev'
        }
        'preview' {
            $script:ArchiveBucket = 'split-rail-settlements-preview'
            $script:StagingBucket = 'split-rail-settlements-staging-preview'
        }
        'prod' {
            $script:ArchiveBucket = 'split-rail-settlements-prod'
            $script:StagingBucket = 'split-rail-settlements-staging-prod'
        }
    }
}

function Get-RequiredEnvVar {
    param([string]$Name)
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "${Name} required"
    }
    return $value
}

# Minimum archive retention seconds; matches gcloud --retention-period=2555d (7 years).
$script:ArchiveRetentionMinSeconds = [long]220708800
