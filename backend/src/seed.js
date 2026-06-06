const bcrypt = require('bcryptjs');
const { prisma } = require('./prisma');

async function main() {
  console.log('Seeding database...');

  const adminPassword = await bcrypt.hash('admin123', 10);
  const testerPassword = await bcrypt.hash('tester123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      email: 'admin@gametest.com',
      role: 'ADMIN'
    }
  });

  const tester1 = await prisma.user.upsert({
    where: { username: 'tester1' },
    update: {},
    create: {
      username: 'tester1',
      passwordHash: testerPassword,
      email: 'tester1@gametest.com',
      role: 'TESTER'
    }
  });

  const tester2 = await prisma.user.upsert({
    where: { username: 'tester2' },
    update: {},
    create: {
      username: 'tester2',
      passwordHash: testerPassword,
      email: 'tester2@gametest.com',
      role: 'TESTER'
    }
  });

  const storyGroup = await prisma.testGroup.upsert({
    where: { name: '主线剧情组' },
    update: {},
    create: {
      name: '主线剧情组',
      description: '专注于游戏主线剧情测试的测试组'
    }
  });

  const perfGroup = await prisma.testGroup.upsert({
    where: { name: '性能压测组' },
    update: {},
    create: {
      name: '性能压测组',
      description: '专注于游戏性能和压力测试的测试组'
    }
  });

  await prisma.userTestGroup.upsert({
    where: {
      userId_testGroupId: {
        userId: tester1.id,
        testGroupId: storyGroup.id
      }
    },
    update: {},
    create: {
      userId: tester1.id,
      testGroupId: storyGroup.id,
      assignedBy: admin.id
    }
  });

  await prisma.userTestGroup.upsert({
    where: {
      userId_testGroupId: {
        userId: tester2.id,
        testGroupId: perfGroup.id
      }
    },
    update: {},
    create: {
      userId: tester2.id,
      testGroupId: perfGroup.id,
      assignedBy: admin.id
    }
  });

  console.log('Seed data created successfully!');
  console.log('Admin: admin / admin123');
  console.log('Tester1: tester1 / tester123 (主线剧情组)');
  console.log('Tester2: tester2 / tester123 (性能压测组)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
