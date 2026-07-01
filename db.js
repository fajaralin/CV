const bcrypt = require('bcryptjs');

// ============================================================
// DB ADAPTER: Upstash Redis (production) | File JSON (local dev)
// ============================================================

const IS_VERCEL = !!(process.env.VERCEL || process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const USE_REDIS = !!(REDIS_URL && REDIS_TOKEN);

// Helper: bersihkan tanda kutip yang mungkin ikut tersimpan di env var Vercel
function cleanEnv(val) {
  if (!val) return val;
  return val.replace(/^["']|["']$/g, '').trim();
}

let redis = null;
if (USE_REDIS) {
  const { Redis } = require('@upstash/redis');
  redis = new Redis({
    url: cleanEnv(REDIS_URL),
    token: cleanEnv(REDIS_TOKEN),
  });
}

// ---------- File JSON setup (local dev or fallback on Vercel) ----------
const fs = require('fs').promises;
const path = require('path');
const DB_PATH = path.join(__dirname, 'data.json');

// ---------- Default data ----------
const defaultData = {
  personalInfo: {
    name: "Muhammad Fajar Alin Faza",
    title: "Full Stack Developer & UI/UX Enthusiast",
    bio: "Saya adalah mahasiswa IT yang berfokus pada pengembangan aplikasi web interaktif, modern, dan responsif. Berpengalaman dalam merancang dan mengembangkan solusi dari sisi backend hingga antarmuka pengguna yang halus.",
    avatar: "/uploads/default-avatar.png",
    email: "fajaralinofficial@gmail.com",
    phone: "+62 838-0706-7589",
    location: "Kendal, Indonesia",
    skills: ["HTML5", "CSS3 / Vanilla CSS", "JavaScript (ES6+)", "Node.js", "Express.js", "PHP", "Laravel", "MySQL", "RESTful API", "UI/UX Design"],
    socials: {
      github: "https://github.com/fajaralin",
      linkedin: "https://linkedin.com",
      instagram: "https://instagram.com"
    }
  },
  projects: [
    {
      id: "proj-1",
      title: "Interactive CV Creator",
      description: "Aplikasi web untuk membuat CV interaktif dengan transisi halus dan panel admin intuitif untuk pengelolaan data portofolio secara real-time.",
      image: "/uploads/default-project.png",
      category: "Web Application",
      link: "https://github.com/fajaralin",
      tech: "Node.js, Express, CSS3 Grid, JavaScript"
    }
  ],
  gallery: [
    {
      id: "gal-1",
      title: "UI Design Exploration",
      description: "Eksplorasi desain antarmuka dashboard admin bertema minimalis cerah.",
      image: "/uploads/default-gallery.png",
      category: "UI Design"
    }
  ],
  certificates: [
    {
      id: "cert-1",
      title: "Belajar Membuat Aplikasi Web dengan React",
      issuer: "Dicoding Indonesia",
      image: "/uploads/default-certificate.png",
      date: "2025-04-12",
      link: "https://dicoding.com"
    }
  ],
  education: [
    {
      id: "edu-1",
      school: "Universitas Negeri Semarang",
      major: "Teknik Informatika",
      year: "2022 - Sekarang",
      description: "Mahasiswa S1 Teknik Informatika dengan fokus pada pengembangan web dan sistem informasi."
    }
  ],
  experience: [
    {
      id: "exp-1",
      company: "Freelance Developer",
      role: "Full Stack Web Developer",
      year: "2023 - Sekarang",
      description: "Membangun berbagai proyek web untuk klien individu dan UMKM, mulai dari landing page hingga sistem informasi lengkap."
    }
  ],
  messages: [],
  admin: {
    username: "admin",
    password: ""
  }
};

async function getDB() {
  if (USE_REDIS) {
    let data = await redis.get('cvdb');
    if (!data) {
      const salt = await bcrypt.genSalt(10);
      defaultData.admin.password = await bcrypt.hash('admin123', salt);
      await redis.set('cvdb', JSON.stringify(defaultData));
      return defaultData;
    }
    return typeof data === 'string' ? JSON.parse(data) : data;
  } else {
    try {
      const raw = await fs.readFile(DB_PATH, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') {
        const dataToSave = { ...defaultData };
        const salt = await bcrypt.genSalt(10);
        dataToSave.admin.password = await bcrypt.hash('admin123', salt);
        if (!IS_VERCEL) {
          await saveDB(dataToSave);
        }
        return dataToSave;
      }
      throw error;
    }
  }
}

async function saveDB(data) {
  if (USE_REDIS) {
    await redis.set('cvdb', JSON.stringify(data));
  } else {
    if (IS_VERCEL) {
      throw new Error('Database is read-only on Vercel. Please configure Upstash Redis in your Vercel project environment variables to enable saving data.');
    }
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  }
}

module.exports = { getDB, saveDB };
