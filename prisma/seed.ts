import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import readline from 'readline'

const prisma = new PrismaClient()

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

// Secure prompt function
const securePrompt = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer)
    })
  })
}

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

async function main() {
  console.log('\n========================================')
  console.log('ADMIN ACCOUNT CREATOR')
  console.log('========================================\n')

  // Check if admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  })

  if (existingAdmin) {
    console.log('⚠️  Admin account already exists!')
    console.log(`   Email: ${existingAdmin.email}`)
    console.log('   To create another admin, delete the existing one first.\n')
    rl.close()
    process.exit(0)
  }

  // Get admin email
  const email = await securePrompt('Enter admin email: ')

  if (!email || !email.includes('@')) {
    console.log('❌ Invalid email address!')
    rl.close()
    process.exit(1)
  }

  // Get admin password
  const password = await securePrompt('Enter admin password (min 8 chars): ')

  if (password.length < 8) {
    console.log('❌ Password must be at least 8 characters!')
    rl.close()
    process.exit(1)
  }

  // Confirm password
  const confirmPassword = await securePrompt('Confirm admin password: ')

  if (password !== confirmPassword) {
    console.log('❌ Passwords do not match!')
    rl.close()
    process.exit(1)
  }

  // Hash password and create admin
  const hashedPassword = await hashPassword(password)

  const admin = await prisma.user.create({
    data: {
      email: email,
      passwordHash: hashedPassword,
      fullName: 'Admin User',
      role: 'ADMIN',
    },
  })

  console.log('\n✅ Admin account created successfully!')
  console.log('========================================')
  console.log(`   Email: ${admin.email}`)
  console.log(`   Role: ${admin.role}`)
  console.log(`   ID: ${admin.id}`)
  console.log('========================================')
  console.log('\n⚠️  IMPORTANT: Save these credentials securely!')
  console.log('   Never share the password with anyone.\n')

  rl.close()
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })