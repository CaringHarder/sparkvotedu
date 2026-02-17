/**
 * Promote a teacher to admin role.
 *
 * Usage:
 *   npx tsx scripts/promote-admin.ts user@example.com
 *
 * Requires DATABASE_URL in .env.local
 */

import dotenv from 'dotenv'
import { PrismaClient } from '../prisma/generated/prisma/index.js'
import { PrismaPg } from '@prisma/adapter-pg'

dotenv.config({ path: '.env.local' })

const email = process.argv[2]

if (!email) {
  console.log('Usage: npx tsx scripts/promote-admin.ts <email>')
  console.log('Example: npx tsx scripts/promote-admin.ts teacher@school.edu')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const teacher = await prisma.teacher.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  })

  if (!teacher) {
    console.error(`No teacher found with email: ${email}`)
    process.exit(1)
  }

  if (teacher.role === 'admin') {
    console.log(`${teacher.email} is already an admin.`)
    process.exit(0)
  }

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: { role: 'admin' },
  })

  console.log(`Promoted ${teacher.name ?? teacher.email} to admin role.`)
}

main()
  .catch((error) => {
    console.error('Failed to promote teacher:', error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
