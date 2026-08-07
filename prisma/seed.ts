// Seed script — populate local/dev DB with sample data.
// Run with: npm run prisma:seed
//
// import { prisma } from "../src/config/prisma";
//
// async function main() {
//   // e.g. await prisma.user.createMany({ data: [...] });
// }
//
// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import readline from 'readline'

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

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
    process.exit(0)
  }

  const email = await securePrompt('Enter admin email: ')

  if (!email || !email.includes('@')) {
    console.log('❌ Invalid email address!')
    process.exit(1)
  }

  const password = await securePrompt('Enter admin password (min 8 chars): ')

  if (password.length < 8) {
    console.log('❌ Password must be at least 8 characters!')
    process.exit(1)
  }

  const confirmPassword = await securePrompt('Confirm admin password: ')

  if (password !== confirmPassword) {
    console.log('❌ Passwords do not match!')
    process.exit(1)
  }

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