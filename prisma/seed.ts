import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { name: "Admin User", email: "admin@example.com", passwordHash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "member@example.com" },
    update: {},
    create: { name: "Member User", email: "member@example.com", passwordHash, role: "MEMBER" },
  });

  const categories = ["Meeting Room", "Equipment", "Vehicle"];
  for (const name of categories) {
    await prisma.resourceCategory.upsert({ where: { name }, update: {}, create: { name } });
  }
  const cat = Object.fromEntries(
    (await prisma.resourceCategory.findMany()).map((c) => [c.name, c.id])
  );

  const count = await prisma.resource.count();
  if (count === 0) {
    await prisma.resource.createMany({
      data: [
        { name: "Boardroom A", categoryId: cat["Meeting Room"], location: "Floor 2", capacity: 12, description: "Large room with projector" },
        { name: "Huddle Room 1", categoryId: cat["Meeting Room"], location: "Floor 1", capacity: 4, description: "Small room for quick meetings" },
        { name: "Projector Kit", categoryId: cat["Equipment"], location: "IT Store", description: "Portable projector and screen" },
        { name: "Company Van", categoryId: cat["Vehicle"], location: "Parking Lot B", capacity: 8, description: "8-seater van" },
      ],
    });
  }
  console.log("Seed complete");
}

main().finally(() => prisma.$disconnect());