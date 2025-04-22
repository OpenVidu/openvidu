<#
    .DESCRIPTION
        A runbook that will scale in the Media Nodes gracefully in OpenVidu

    .NOTES
        AUTHOR: Sergio Fernández Gómez
        LAST EDIT: March 24, 2025
#>
param
(
    [Parameter (Mandatory=$false)]
        [object] $WebhookData
)
$ErrorActionPreference = "stop"

if (!($WebhookData)) {
    Write-Error "This runbook is meant to be started from an Azure alert webhook only."
    exit
}

# Get the data object from WebhookData
$WebhookBody = (ConvertFrom-Json -InputObject $WebhookData.RequestBody)
# Get the info needed to identify the VM (depends on the payload schema)
$schemaId = $WebhookBody.schemaId

# Check if the schemaId is the one we can manage
if (!($schemaId -eq "Microsoft.Insights/activityLogs")) {
    Write-Error "The alert data schema - $schemaId - is not supported."
    exit 1
}

# This is the Activity Log Alert schema
$AlertContext = [object] (($WebhookBody.data).context).activityLog
$ResourceGroupName = $AlertContext.resourceGroupName
$ResourceType = $AlertContext.resourceType
$SubscriptionId = $AlertContext.subscriptionId
$ResourceName = (($AlertContext.resourceId).Split("/"))[-1]
$status = ($WebhookBody.data).status

# Check if the status is not activated to leave the runbook
if (!($status -eq "Activated")) {
    Write-Error "No action taken. Alert status: $status"
    exit 1
}
# Determine code path depending on the resourceType
if (!($ResourceType -eq "Microsoft.Compute/virtualMachineScaleSets")) {
    Write-Error "$ResourceType is not a supported resource type for this runbook."
    exit 1
}

# Ensures you do not inherit an AzContext in your runbook
Disable-AzContextAutosave -Scope Process

#Login into azure
try {
    # Connect to Azure with system-assigned managed identity
    $AzureContext = (Connect-AzAccount -Identity).context
    # set and store context
    $AzureContext = Set-AzContext -SubscriptionName $AzureContext.Subscription -DefaultProfile $AzureContext
}
catch {
    Write-Error -Message $_.Exception
    throw $_.Exception
}

#################################################################################################################
#Here the runbook is logged in azure and nothing else is done
#################################################################################################################


######################################## LOCK ##########################################
Import-Module Az.Storage
$VMSS = Get-AzVmss -ResourceGroupName $ResourceGroupName -VMScaleSetName $ResourceName
$StorageAccountName = $VMSS.Tags["storageAccount"]
$StorageAccountKey = (Get-AzStorageAccountKey -ResourceGroupName $ResourceGroupName -StorageAccountName $StorageAccountName)[0].Value
$Context = New-AzStorageContext -StorageAccountName $StorageAccountName -StorageAccountKey $StorageAccountKey
#$blob = Get-AzureStorageBlob -Context $storageContext -Container  $ContainerName -Blob $BlobName -ErrorAction Stop         
#$leaseStatus = $blob.ICloudBlob.Properties.LeaseStatus;
#If($leaseStatus -eq "Locked")
#{
#     $blob.ICloudBlob.BreakLease()
#     Write-Host "Successfully broken lease on '$BlobName' blob."
#}
$Lease = az storage blob lease acquire -b "lock.txt" -c "automation-locks" --account-name $StorageAccountName --account-key $StorageAccountKey

if (-not $Lease) {
    Write-Output "Lock is already held. Exiting."
    exit 0
}

try
{
    ######################################## CHECKS ##########################################

    #Get the timestamp of the event that triggered the runbook
    $EventTimestamp = $WebhookBody.data.context.activityLog.eventTimestamp

    $DateTag = [datetime]$VMSS.Tags["InstanceDeleteTime"]
    $DateEventTimestamp = [datetime]$EventTimeStamp

    "Checking if the event was launched before the last instance was deleted"
    if ($DateEventTimestamp -lt $DateTag) {
        Write-Output "The event was launched before the last instance was deleted. Exiting..."
        exit 1
    }
    "Done checking"


    # Get the instances and select the index 0 instance to check if runcommand is running on it and later invoke the run command
    $InstancesInVMSS = Get-AzVmssVM -ResourceGroupName $ResourceGroupName -VMScaleSetName $ResourceName
    $InstanceCount = $InstancesInVMSS.Count

    "Checking if theres more than 1 instance in the VMSS"
    if ($InstanceCount -le 1) {
        "There is only one instance in the VMSS. Exiting..."
        exit 1  # Exit the script if there is only one instance
    }


    # Check the tags in the VMSS to see if there is a tag with value TERMINATING
    "Checking TAG for TERMINATING"
    if($VMSS.Tags.Values -contains "TERMINATING"){
        "Found 'TERMINATING' tag so this runbook will not execute."
        exit 1
    }
    
    ######################################## MODIFIYING ##########################################

    $VMSS.Tags["STATUS"] = "TERMINATING"
    "Terminating not found changing TAG"
    Set-AzResource -ResourceId $VMSS.Id -Tag $VMSS.Tags -Force
    "TAG updated"

    # If no VM has been selected previously, select the VM with instance_id 0 and tag it as TERMINATING instance
    $InstanceId = $InstancesInVMSS[0].InstanceId

    "Checking if one Run Command is executing"

    # Iterate through each instance and check if RunCommand is still running
    foreach ($Instance in $InstancesInVMSS) {
        $runCommandStatus = Get-AzVmssVMRunCommand -ResourceGroupName $ResourceGroupName -VMScaleSetName $ResourceName -InstanceId $Instance.InstanceId

        # Check if the RunCommand is still running
        if ($runCommandStatus.ProvisioningState -eq "Running") {
            Write-Output "Instance $($Instance.InstanceId) is still running a command. Exiting..."
            exit 1  # Exit the script if any instance is still running the command
        }
    }
    "Done checking"

    "Sending RunCommand"
    $Token = (Get-AzAccessToken).Token
    $Uri = "https://management.azure.com/subscriptions/$SubscriptionId/resourceGroups/$ResourceGroupName/providers/Microsoft.Compute/virtualMachineScaleSets/$ResourceName/virtualMachines/$InstanceId/runCommand?api-version=2021-11-01"

    $Body = @{
      commandId = 'RunShellScript'
      script = @('sudo /usr/local/bin/stop_media_node.sh')
    } | ConvertTo-Json -Depth 3

    Invoke-RestMethod -Uri $Uri -Method POST -Headers @{ Authorization = "Bearer $Token" } -Body $Body -ContentType "application/json"
    "RunCommand sent"
} 
finally 
{
    az storage blob lease release -b "lock.txt" -c "automation-locks" --account-name $StorageAccountName --account-key $StorageAccountKey --lease-id $Lease
}