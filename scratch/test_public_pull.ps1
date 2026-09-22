$headers = @{
    "bypass-tunnel-reminder" = "true"
    "X-Sync-Secret" = "AKfycbylAaHN1h43Q0FcdQTmoBJ44457TPz7B7djsjkb8RbrfVJkDehXwwJP1cRq7XsueVG6"
    "Accept" = "application/json"
}

$res = Invoke-RestMethod -Uri "https://petite-fans-send.loca.lt/api/v1/google-sheets/pull" -Method Post -Headers $headers
Write-Host "Success:" $res.data.success
Write-Host "Total Records:" $res.data.totalRecords
Write-Host "Tables Count:" ($res.data.tables.PSObject.Properties.Name.Count)
