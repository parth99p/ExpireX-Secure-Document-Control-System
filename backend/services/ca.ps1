# PowerShell script to create initial admin user
# Usage: .\create-admin.ps1

param(
    [string]$ApiUrl = "http://localhost:5000",
    [string]$Name = "Admin",
    [string]$Email = "admin@gmail.com",
    [string]$Password = "Admin@123"
)

$separator = "========================================"

Write-Host $separator -ForegroundColor Cyan
Write-Host "DocGuard Admin Creation Script" -ForegroundColor Cyan
Write-Host $separator -ForegroundColor Cyan
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  API URL: $ApiUrl"
Write-Host "  Name: $Name"
Write-Host "  Email: $Email"
Write-Host "  Password: [HIDDEN]"
Write-Host ""

# Prepare the request body
$body = @{
    name     = $Name
    email    = $Email
    password = $Password
} | ConvertTo-Json

Write-Host "Sending request to create admin..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod `
        -Uri "$ApiUrl/admin/create-admin" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop

    Write-Host ""
    Write-Host "SUCCESS: Admin created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
    Write-Host ""
    Write-Host "You can now log in with:" -ForegroundColor Cyan
    Write-Host "  Email: $Email"
    Write-Host "  Password: $Password"
    Write-Host ""
}
catch {
    Write-Host ""
    Write-Host "ERROR: Failed to create admin" -ForegroundColor Red
    Write-Host ""
    
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor Red
        
        try {
            $errorBody = $_.Exception.Response.Content.ToString() | ConvertFrom-Json
            Write-Host "Error Message:" -ForegroundColor Red
            Write-Host ($errorBody | ConvertTo-Json)
        }
        catch {
            Write-Host "Response: $($_.Exception.Response.Content)" -ForegroundColor Red
        }
    }
    else {
        Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Ensure the backend server is running on $ApiUrl"
    Write-Host "  2. If admin already exists, use the protected /admin/add-admin endpoint"
    Write-Host "  3. Check that the database is running and configured"
    Write-Host ""
    
    exit 1
}

Write-Host $separator -ForegroundColor Cyan
Write-Host "Script completed successfully" -ForegroundColor Cyan
Write-Host $separator -ForegroundColor Cyan