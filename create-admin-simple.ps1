# Simple Admin Creation

Set-Location "D:\ranenla-backend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CREATING ADMIN USER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Get email from user
$email = Read-Host -Prompt "Enter admin email"
if (-not $email) {
    $email = "ADMINsigma@ranenla.com"
}

# Get password from user
$securePassword = Read-Host -Prompt "Enter admin password" -AsSecureString
$password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword))

if (-not $password) {
    $password = "RANeNlA#$987"
}

# Run the seed script with the values
$env:ADMIN_EMAIL = $email
$env:ADMIN_PASSWORD = $password

# Use a simple Node.js script to create admin
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const email = process.env.ADMIN_EMAIL || 'ADMINsigma@ranenla.com';
    const password = process.env.ADMIN_PASSWORD || 'RANeNlA#$987';
    
    const existingAdmin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });
    
    if (existingAdmin) {
        console.log('✅ Admin already exists!');
        console.log('   Email:', existingAdmin.email);
        process.exit(0);
    }
    
    const hash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
        data: {
            email: email,
            passwordHash: hash,
            fullName: 'Admin User',
            role: 'ADMIN',
        }
    });
    
    console.log('✅ Admin created successfully!');
    console.log('   Email:', admin.email);
    console.log('   Password:', password);
}

main()
    .catch((e) => {
        console.error('❌ Error:', e.message);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ DONE!" -ForegroundColor Green
