# Invoke gcloud from PowerShell without stderr becoming terminating errors.

function Invoke-GcloudRaw {
    param(
        [Parameter(Mandatory, ValueFromRemainingArguments = $true)]
        [string[]]$GcloudArgs
    )

    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = & gcloud @GcloudArgs 2>&1
        return [PSCustomObject]@{
            ExitCode = $LASTEXITCODE
            Output   = $output
        }
    }
    finally {
        $ErrorActionPreference = $prev
    }
}

function Test-GcsBucketExists {
    param(
        [string]$BucketName,
        [string]$Project
    )

    $result = Invoke-GcloudRaw storage buckets describe "gs://$BucketName" --project=$Project
    return ($result.ExitCode -eq 0)
}

function Get-GcsBucketJson {
    param(
        [string]$BucketName,
        [string]$Project
    )

    $result = Invoke-GcloudRaw storage buckets describe "gs://$BucketName" --project=$Project --format=json
    if ($result.ExitCode -ne 0) {
        return $null
    }

    $text = ($result.Output | ForEach-Object { "$_" }) -join "`n"
    if ([string]::IsNullOrWhiteSpace($text)) {
        return $null
    }

    return $text | ConvertFrom-Json
}

function Invoke-GcloudOrThrow {
    param(
        [Parameter(Mandatory, ValueFromRemainingArguments = $true)]
        [string[]]$GcloudArgs
    )

    $result = Invoke-GcloudRaw @GcloudArgs
    if ($result.ExitCode -ne 0) {
        $message = ($result.Output | ForEach-Object { "$_" }) -join "`n"
        $message = $message.Trim()
        if ($message) {
            throw $message
        }
        throw "gcloud failed with exit code $($result.ExitCode)"
    }

    return $result.Output
}
