import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, "../prisma/schema.prisma");

const target = process.argv[2]?.toLowerCase();

if (!target || (target !== "postgres" && target !== "postgresql" && target !== "sqlite")) {
  console.log("Usage: node scripts/switch-db.mjs [postgres | sqlite]");
  process.exit(1);
}

let content = fs.readFileSync(schemaPath, "utf-8");

if (target === "postgres" || target === "postgresql") {
  content = content.replace(/provider\s*=\s*"sqlite"/g, 'provider = "postgresql"');
  fs.writeFileSync(schemaPath, content, "utf-8");
  console.log("✅ Switched prisma/schema.prisma to provider = 'postgresql'");
  console.log("👉 Set DATABASE_URL to your PostgreSQL connection string (Vercel Postgres, Neon, Supabase, etc.)");
} else {
  content = content.replace(/provider\s*=\s*"postgresql"/g, 'provider = "sqlite"');
  fs.writeFileSync(schemaPath, content, "utf-8");
  console.log("✅ Switched prisma/schema.prisma to provider = 'sqlite'");
  console.log("👉 Set DATABASE_URL=\"file:./dev.db\" for local development");
}
