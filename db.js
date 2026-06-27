const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.json');

const defaultData = {
  personalInfo: {
    name: "Fajar Ramadhan",
    title: "Full Stack Developer & UI/UX Enthusiast",
    bio: "Saya adalah mahasiswa IT yang berfokus pada pengembangan aplikasi web interaktif, modern, dan responsif. Berpengalaman dalam merancang dan mengembangkan solusi dari sisi backend hingga antarmuka pengguna yang halus.",
    avatar: "/uploads/default-avatar.png",
    email: "fajar.ramadhan@example.com",
    phone: "+62 812-3456-7890",
    location: "Bandung, Indonesia",
    skills: ["HTML5", "CSS3 / Vanilla CSS", "JavaScript (ES6+)", "Node.js", "Express.js", "PHP", "Laravel", "MySQL", "RESTful API", "UI/UX Design"],
    socials: {
      github: "https://github.com",
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
      link: "https://github.com",
      tech: "Node.js, Express, CSS3 Grid, JavaScript"
    },
    {
      id: "proj-2",
      title: "Smart Attendance Dashboard",
      description: "Sistem absensi berbasis QR Code dan geolokasi dengan dashboard analitik performa kehadiran mahasiswa secara real-time.",
      image: "/uploads/default-project.png",
      category: "Information System",
      link: "https://github.com",
      tech: "Laravel, PHP, Bootstrap, LeafletJS"
    }
  ],
  gallery: [
    {
      id: "gal-1",
      title: "UI Design Exploration",
      description: "Eksplorasi desain antarmuka dashboard admin bertema minimalis cerah.",
      image: "/uploads/default-gallery.png",
      category: "UI Design"
    },
    {
      id: "gal-2",
      title: "Workspace Setup",
      description: "Meja kerja minimalis dengan pencahayaan alami untuk produktivitas maksimal.",
      image: "/uploads/default-gallery.png",
      category: "Photography"
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
    },
    {
      id: "cert-2",
      title: "Backend Developer Professional",
      issuer: "Dicoding Indonesia",
      image: "/uploads/default-certificate.png",
      date: "2025-05-30",
      link: "https://dicoding.com"
    }
  ],
  messages: [
    {
      id: "msg-1",
      name: "Budi Santoso",
      email: "budi@example.com",
      subject: "Tawaran Kerjasama Freelance",
      message: "Halo Fajar, saya melihat portofolio Anda dan sangat tertarik dengan transisi halus yang Anda buat. Apakah Anda bersedia untuk mengerjakan proyek landing page e-commerce dalam waktu dekat?",
      date: "2026-06-27T08:30:00.000Z"
    }
  ],
  admin: {
    username: "admin",
    password: "" // Akan di-hash secara dinamis saat inisialisasi
  }
};

async function getDB() {
  try {
    const data = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Jika file tidak ada, inisialisasi database baru
      const dataToSave = { ...defaultData };
      // Hash password bawaan "admin123"
      const salt = await bcrypt.genSalt(10);
      dataToSave.admin.password = await bcrypt.hash('admin123', salt);
      
      await saveDB(dataToSave);
      return dataToSave;
    }
    throw error;
  }
}

async function saveDB(data) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  getDB,
  saveDB
};
