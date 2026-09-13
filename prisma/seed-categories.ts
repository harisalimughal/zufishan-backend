import prisma from "../src/config/prisma";

async function main() {
  const defaultCategory = await prisma.productCategory.upsert({
    where: { slug: "general" },
    update: {},
    create: {
      name: "General",
      slug: "general",
      description: "Default marketplace category",
    },
  });

  console.log("✅ Seeded Category ID:", defaultCategory.id);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());