import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL || '' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 بدء تهيئة قاعدة البيانات...");

  // إنشاء مستخدم أدمن افتراضي
  const adminUsername = "admin";
  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("admin123", 12);
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        fullName: "مدير النظام",
        email: "admin@transport.com",
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`✅ تم إنشاء حساب الأدمن: ${admin.username}`);
    console.log(`   كلمة المرور: admin123`);
  } else {
    console.log(`ℹ️ حساب الأدمن موجود مسبقاً: ${existingAdmin.username}`);
  }

  // إنشاء مستخدم مدير
  const managerUsername = "manager";
  const existingManager = await prisma.user.findUnique({
    where: { username: managerUsername },
  });

  if (!existingManager) {
    const passwordHash = await bcrypt.hash("manager123", 12);
    const manager = await prisma.user.create({
      data: {
        username: managerUsername,
        fullName: "مدير العمليات",
        email: "manager@transport.com",
        passwordHash,
        role: "MANAGER",
      },
    });
    console.log(`✅ تم إنشاء حساب المدير: ${manager.username}`);
    console.log(`   كلمة المرور: manager123`);
  } else {
    console.log(`ℹ️ حساب المدير موجود مسبقاً: ${existingManager.username}`);
  }

  console.log("\n🎉 تمت التهيئة بنجاح!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("بيانات الدخول:");
  console.log("  أدمن: admin / admin123");
  console.log("  مدير: manager / manager123");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ خطأ:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
