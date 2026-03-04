import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@westfield.com' },
    update: {},
    create: {
      name: 'Admin Westfield',
      email: 'admin@westfield.com',
      password: adminPassword,
      sampName: 'Admin_Westfield',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Create sample staff users
  const staffPassword = await bcrypt.hash('staff123', 12);
  const staffData = [
    { name: 'John Doe', email: 'john@westfield.com', sampName: 'John_Doe' },
    { name: 'Jane Smith', email: 'jane@westfield.com', sampName: 'Jane_Smith' },
    { name: 'Alex Rider', email: 'alex@westfield.com', sampName: 'Alex_Rider' },
    { name: 'Mike Johnson', email: 'mike@westfield.com', sampName: 'Mike_Johnson' },
    { name: 'Sarah Connor', email: 'sarah@westfield.com', sampName: 'Sarah_Connor' },
  ];

  for (const staff of staffData) {
    const user = await prisma.user.upsert({
      where: { email: staff.email },
      update: {},
      create: {
        ...staff,
        password: staffPassword,
        role: 'STAFF',
      },
    });
    console.log(`✅ Staff created: ${user.email}`);
  }

  // Initialize cash balance
  const existingBalance = await prisma.cashBalance.findFirst();
  if (!existingBalance) {
    await prisma.cashBalance.create({
      data: { balance: 0 },
    });
    console.log('✅ Cash balance initialized');
  }

  console.log('');
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('📌 Default accounts:');
  console.log('   Admin: admin@westfield.com / admin123');
  console.log('   Staff: john@westfield.com / staff123');
  console.log('          jane@westfield.com / staff123');
  console.log('          alex@westfield.com / staff123');
  console.log('          mike@westfield.com / staff123');
  console.log('          sarah@westfield.com / staff123');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
