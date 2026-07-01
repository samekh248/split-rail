#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

function Resolve-QboSchedulerNames {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Env,

        [Parameter(Mandatory = $true)]
        [string]$GcpProject
    )

    switch ($Env) {
        'dev' {
            $script:SCHEDULER_JOB_NAME = 'split-rail-qbo-sync-dev'
            $script:SCHEDULER_SA_ID = 'split-rail-qbo-scheduler-dev'
        }
        'prod' {
            $script:SCHEDULER_JOB_NAME = 'split-rail-qbo-sync-prod'
            $script:SCHEDULER_SA_ID = 'split-rail-qbo-scheduler-prod'
        }
        default {
            throw "Invalid ENV '$Env': must be dev or prod"
        }
    }

    $script:SCHEDULER_SA_EMAIL = "$($script:SCHEDULER_SA_ID)@$GcpProject.iam.gserviceaccount.com"
}

$script:SCHEDULER_CRON = '*/15 * * * *'
$script:SCHEDULER_TIME_ZONE = 'UTC'
$script:SCHEDULER_HTTP_METHOD = 'POST'
$script:SCHEDULER_TRIGGER_PATH = '/api/internal/qbo-sync-trigger'

Export-ModuleMember -Function Resolve-QboSchedulerNames
