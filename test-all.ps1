$baseUrl = "http://localhost:4000"
$headers = @{ "Content-Type" = "application/json" }

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RANENLA API COMPLETE TEST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n[1] Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET -ErrorAction Stop
    Write-Host "✅ Health Check: $($health.message)" -ForegroundColor Green
    Write-Host "   Environment: $($health.environment)" -ForegroundColor Gray
    Write-Host "   Uptime: $([math]::Round($health.uptime, 2))s" -ForegroundColor Gray
} catch {
    Write-Host "❌ Health Check failed - Make sure server is running on port 4000" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Red
    exit 1
}

# 2. Register User
Write-Host "`n[2] Testing Registration..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$registerBody = @{
    email = "testuser${timestamp}@example.com"
    password = "TestUser@123456"
    firstName = "Test"
    lastName = "User"
} | ConvertTo-Json

try {
    $register = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerBody -Headers $headers -ErrorAction Stop
    Write-Host "✅ Registration successful!" -ForegroundColor Green
    Write-Host "   Email: $($register.data.user.email)" -ForegroundColor Gray
    Write-Host "   Name: $($register.data.user.firstName) $($register.data.user.lastName)" -ForegroundColor Gray
    Write-Host "   Role: $($register.data.user.role)" -ForegroundColor Gray
    $testEmail = $register.data.user.email
} catch {
    Write-Host "❌ Registration failed: $_" -ForegroundColor Red
}

# 3. Login
Write-Host "`n[3] Testing Login..." -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = "TestUser@123456"
} | ConvertTo-Json

try {
    $login = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -Headers $headers -ErrorAction Stop
    $accessToken = $login.data.tokens.accessToken
    $refreshToken = $login.data.tokens.refreshToken
    Write-Host "✅ Login successful!" -ForegroundColor Green
    Write-Host "   User: $($login.data.user.email)" -ForegroundColor Gray
    Write-Host "   Role: $($login.data.user.role)" -ForegroundColor Gray
    Write-Host "   Access Token: $($accessToken.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   Refresh Token: $($refreshToken.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Login failed: $_" -ForegroundColor Red
}

# 4. Get Profile (Protected)
Write-Host "`n[4] Testing Get Profile..." -ForegroundColor Yellow
$authHeaders = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

try {
    $profile = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers $authHeaders -ErrorAction Stop
    Write-Host "✅ Profile retrieved!" -ForegroundColor Green
    Write-Host "   Email: $($profile.data.email)" -ForegroundColor Gray
    Write-Host "   Name: $($profile.data.firstName) $($profile.data.lastName)" -ForegroundColor Gray
    Write-Host "   Role: $($profile.data.role)" -ForegroundColor Gray
    Write-Host "   Status: $($profile.data.status)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Profile request failed: $_" -ForegroundColor Red
}

# 5. Refresh Token
Write-Host "`n[5] Testing Refresh Token..." -ForegroundColor Yellow
$refreshBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

try {
    $refresh = Invoke-RestMethod -Uri "$baseUrl/api/auth/refresh" -Method POST -Body $refreshBody -Headers $headers -ErrorAction Stop
    Write-Host "✅ Token refreshed successfully!" -ForegroundColor Green
    Write-Host "   New Access Token: $($refresh.data.accessToken.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   New Refresh Token: $($refresh.data.refreshToken.Substring(0, 30))..." -ForegroundColor Gray
    $newAccessToken = $refresh.data.accessToken
} catch {
    Write-Host "❌ Refresh token failed: $_" -ForegroundColor Red
}

# 6. Test New Access Token
Write-Host "`n[6] Testing New Access Token..." -ForegroundColor Yellow
$newAuthHeaders = @{
    "Authorization" = "Bearer $newAccessToken"
    "Content-Type" = "application/json"
}

try {
    $profile2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers $newAuthHeaders -ErrorAction Stop
    Write-Host "✅ New access token works!" -ForegroundColor Green
    Write-Host "   Email: $($profile2.data.email)" -ForegroundColor Gray
} catch {
    Write-Host "❌ New access token failed: $_" -ForegroundColor Red
}

# 7. Logout
Write-Host "`n[7] Testing Logout..." -ForegroundColor Yellow
$logoutBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

try {
    $logout = Invoke-RestMethod -Uri "$baseUrl/api/auth/logout" -Method POST -Body $logoutBody -Headers $authHeaders -ErrorAction Stop
    Write-Host "✅ Logout successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Logout failed: $_" -ForegroundColor Red
}

# 8. Try accessing protected route after logout (should fail)
Write-Host "`n[8] Testing Protected Route After Logout..." -ForegroundColor Yellow
try {
    $failed = Invoke-RestMethod -Uri "$baseUrl/api/auth/me" -Method GET -Headers $authHeaders -ErrorAction Stop
    Write-Host "❌ Should have failed but got: $($failed.data.email)" -ForegroundColor Red
} catch {
    Write-Host "✅ Access denied as expected after logout" -ForegroundColor Green
}

# 9. Try using expired/old refresh token (should fail)
Write-Host "`n[9] Testing Expired Refresh Token..." -ForegroundColor Yellow
$oldRefreshBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

try {
    $failedRefresh = Invoke-RestMethod -Uri "$baseUrl/api/auth/refresh" -Method POST -Body $oldRefreshBody -Headers $headers -ErrorAction Stop
    Write-Host "❌ Should have failed but got: $($failedRefresh)" -ForegroundColor Red
} catch {
    Write-Host "✅ Refresh token rejected as expected" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ ALL TESTS COMPLETED!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Summary:" -ForegroundColor Yellow
Write-Host "   ✓ Health Check" -ForegroundColor Gray
Write-Host "   ✓ Registration" -ForegroundColor Gray
Write-Host "   ✓ Login" -ForegroundColor Gray
Write-Host "   ✓ Get Profile (Protected)" -ForegroundColor Gray
Write-Host "   ✓ Refresh Token" -ForegroundColor Gray
Write-Host "   ✓ New Access Token Works" -ForegroundColor Gray
Write-Host "   ✓ Logout" -ForegroundColor Gray
Write-Host "   ✓ Protected Route Access Denied After Logout" -ForegroundColor Gray
Write-Host "   ✓ Expired Refresh Token Rejected" -ForegroundColor Gray
