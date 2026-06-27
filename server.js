const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const bcrypt = require('bcryptjs');
const { getDB, saveDB } = require('./db');


const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);


// Pastikan folder uploads ada saat aplikasi berjalan (hanya lokal)
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!IS_VERCEL && !fsSync.existsSync(uploadsDir)) {
  fsSync.mkdirSync(uploadsDir, { recursive: true });
}


// Buat placeholder gambar default (hanya lokal)
if (!IS_VERCEL) {
  const createPlaceholderImage = (filename) => {
    const filePath = path.join(uploadsDir, filename);
    if (!fsSync.existsSync(filePath)) {
      fsSync.writeFileSync(filePath, '');
    }
  };
  ['default-avatar.png', 'default-project.png', 'default-gallery.png', 'default-certificate.png'].forEach(createPlaceholderImage);
}

// Konfigurasi Multer untuk Unggah Gambar
// Di Vercel: pakai memoryStorage (filesystem read-only)
// Di lokal: pakai diskStorage
const storage = IS_VERCEL
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, uploadsDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    });

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|webp|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  
  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Hanya diperbolehkan mengunggah file gambar (jpg, jpeg, png, webp, gif)!'));
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // limit 5MB
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || 'fajar-cv-jwt-secret-2024';
const JWT_COOKIE = 'cv_admin_token';



// Middleware Proteksi Admin (JWT)
const checkAuth = (req, res, next) => {
  const token = req.cookies[JWT_COOKIE];
  if (!token) return res.status(401).json({ error: 'Unauthorized: Silakan login terlebih dahulu.' });
  try {
    jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: Silakan login terlebih dahulu.' });
  }
};

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));


// Helper untuk menghapus file gambar lama (menghindari penumpukan sampah file)
async function deleteImage(imageUrl) {
  if (!imageUrl || imageUrl.includes('default-')) return;
  try {
    const filename = path.basename(imageUrl);
    const fullPath = path.join(uploadsDir, filename);
    await fs.unlink(fullPath);
  } catch (err) {
    console.error(`Gagal menghapus gambar lama: ${imageUrl}`, err.message);
  }
}

// ==========================================
// 1. API PUBLIK (Halaman CV Utama)
// ==========================================

// GET: Ambil semua data CV (kecuali kredensial admin dan pesan masuk)
app.get('/api/cv', async (req, res) => {
  try {
    const db = await getDB();
    const publicData = {
      personalInfo: db.personalInfo,
      projects: db.projects || [],
      gallery: db.gallery || [],
      certificates: db.certificates || [],
      education: db.education || [],
      experience: db.experience || []
    };
    res.json(publicData);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil data CV' });
  }
});


// POST: Kirim Pesan Kontak
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Nama, Email, dan Pesan wajib diisi.' });
    }
    
    const db = await getDB();
    const newMessage = {
      id: 'msg-' + Date.now(),
      name,
      email,
      subject: subject || 'Tanpa Subjek',
      message,
      date: new Date().toISOString()
    };
    
    db.messages.push(newMessage);
    await saveDB(db);
    res.json({ success: true, message: 'Pesan Anda berhasil terkirim!' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengirim pesan. Silakan coba lagi.' });
  }
});

// ==========================================
// 2. API AUTENTIKASI ADMIN
// ==========================================

// POST: Login Admin
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const db = await getDB();
    
    if (username !== db.admin.username) {
      return res.status(401).json({ error: 'Username atau password salah!' });
    }
    
    const isMatch = await bcrypt.compare(password, db.admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Username atau password salah!' });
    }
    
    // Buat JWT token
    const token = jwt.sign({ isAdmin: true }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie(JWT_COOKIE, token, {
      httpOnly: true,
      secure: IS_VERCEL,
      sameSite: IS_VERCEL ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    res.json({ success: true, message: 'Login berhasil!' });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan pada sistem saat login.' });
  }
});


// POST: Logout Admin
app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(JWT_COOKIE, { httpOnly: true, secure: IS_VERCEL, sameSite: IS_VERCEL ? 'none' : 'lax' });
  res.json({ success: true, message: 'Berhasil logout.' });
});

// GET: Cek Status Login
app.get('/api/auth/check', (req, res) => {
  const token = req.cookies[JWT_COOKIE];
  if (!token) return res.json({ loggedIn: false });
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ loggedIn: true });
  } catch (e) {
    res.json({ loggedIn: false });
  }
});


// POST: Ganti Password Admin
app.post('/api/auth/change-password', checkAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Password lama dan password baru harus diisi.' });
    }
    
    const db = await getDB();
    const isMatch = await bcrypt.compare(currentPassword, db.admin.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Password lama salah!' });
    }
    
    const salt = await bcrypt.genSalt(10);
    db.admin.password = await bcrypt.hash(newPassword, salt);
    await saveDB(db);
    
    res.json({ success: true, message: 'Password berhasil diubah!' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengubah password.' });
  }
});

// ==========================================
// 3. API ADMIN CRUD
// ==========================================

// PUT: Perbarui Informasi Profil
app.put('/api/admin/profile', checkAuth, upload.single('avatar'), async (req, res) => {
  try {
    const db = await getDB();
    const { name, title, bio, email, phone, location, github, linkedin, instagram, skills } = req.body;
    
    // Perbarui data teks
    db.personalInfo.name = name || db.personalInfo.name;
    db.personalInfo.title = title || db.personalInfo.title;
    db.personalInfo.bio = bio || db.personalInfo.bio;
    db.personalInfo.email = email || db.personalInfo.email;
    db.personalInfo.phone = phone || db.personalInfo.phone;
    db.personalInfo.location = location || db.personalInfo.location;
    
    // Skill dipisahkan dengan koma di form, lalu diubah ke array
    if (skills) {
      db.personalInfo.skills = skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    
    db.personalInfo.socials = {
      github: github || '',
      linkedin: linkedin || '',
      instagram: instagram || ''
    };
    
    // Jika ada upload avatar baru
    if (req.file) {
      // Hapus avatar lama jika bukan avatar bawaan
      await deleteImage(db.personalInfo.avatar);
      db.personalInfo.avatar = `/uploads/${req.file.filename}`;
    }
    
    await saveDB(db);
    res.json({ success: true, message: 'Profil berhasil diperbarui!', data: db.personalInfo });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui profil.' });
  }
});

// --- CRUD PROYEK ---

// POST: Tambah Proyek Baru
app.post('/api/admin/projects', checkAuth, upload.single('image'), async (req, res) => {
  try {
    const db = await getDB();
    const { title, description, category, link, tech } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Judul dan deskripsi proyek wajib diisi.' });
    }
    
    const newProject = {
      id: 'proj-' + Date.now(),
      title,
      description,
      category: category || 'General',
      link: link || '',
      tech: tech || '',
      image: req.file ? `/uploads/${req.file.filename}` : '/uploads/default-project.png',
      showOnMain: req.body.showOnMain !== 'false'
    };
    
    db.projects.push(newProject);
    await saveDB(db);
    res.json({ success: true, message: 'Proyek berhasil ditambahkan!', data: newProject });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambahkan proyek baru.' });
  }
});

// PUT: Edit Proyek
app.put('/api/admin/projects/:id', checkAuth, upload.single('image'), async (req, res) => {
  try {
    const db = await getDB();
    const index = db.projects.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Proyek tidak ditemukan.' });
    }
    
    const { title, description, category, link, tech, showOnMain } = req.body;
    
    db.projects[index].title = title || db.projects[index].title;
    db.projects[index].description = description || db.projects[index].description;
    db.projects[index].category = category || db.projects[index].category;
    db.projects[index].link = link || db.projects[index].link;
    db.projects[index].tech = tech || db.projects[index].tech;
    if (showOnMain !== undefined) {
      db.projects[index].showOnMain = showOnMain !== 'false';
    }
    
    if (req.file) {
      // Hapus gambar lama jika ada
      await deleteImage(db.projects[index].image);
      db.projects[index].image = `/uploads/${req.file.filename}`;
    }
    
    await saveDB(db);
    res.json({ success: true, message: 'Proyek berhasil diperbarui!', data: db.projects[index] });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui proyek.' });
  }
});

// DELETE: Hapus Proyek
app.delete('/api/admin/projects/:id', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    const index = db.projects.findIndex(p => p.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Proyek tidak ditemukan.' });
    }
    
    // Hapus gambar terkait dari server
    await deleteImage(db.projects[index].image);
    
    db.projects.splice(index, 1);
    await saveDB(db);
    res.json({ success: true, message: 'Proyek berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus proyek.' });
  }
});

// --- CRUD GALERI ---

// POST: Tambah Item Galeri Baru
app.post('/api/admin/gallery', checkAuth, upload.single('image'), async (req, res) => {
  try {
    const db = await getDB();
    const { title, description, category } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'File gambar wajib diunggah untuk galeri.' });
    }
    
    const newGalleryItem = {
      id: 'gal-' + Date.now(),
      title: title || 'Tanpa Judul',
      description: description || '',
      category: category || 'General',
      image: `/uploads/${req.file.filename}`,
      showOnMain: req.body.showOnMain !== 'false'
    };
    
    db.gallery.push(newGalleryItem);
    await saveDB(db);
    res.json({ success: true, message: 'Item galeri berhasil ditambahkan!', data: newGalleryItem });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambahkan item galeri baru.' });
  }
});

// DELETE: Hapus Item Galeri
app.delete('/api/admin/gallery/:id', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    const index = db.gallery.findIndex(g => g.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Item galeri tidak ditemukan.' });
    }
    
    await deleteImage(db.gallery[index].image);
    db.gallery.splice(index, 1);
    
    await saveDB(db);
    res.json({ success: true, message: 'Item galeri berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus item galeri.' });
  }
});

// --- CRUD SERTIFIKAT ---

// POST: Tambah Sertifikat Baru
app.post('/api/admin/certificates', checkAuth, upload.single('image'), async (req, res) => {
  try {
    const db = await getDB();
    const { title, issuer, date, link } = req.body;
    
    if (!title || !issuer) {
      return res.status(400).json({ error: 'Nama sertifikat dan penerbit wajib diisi.' });
    }
    
    const newCertificate = {
      id: 'cert-' + Date.now(),
      title,
      issuer,
      date: date || new Date().toISOString().split('T')[0],
      link: link || '',
      image: req.file ? `/uploads/${req.file.filename}` : '/uploads/default-certificate.png',
      showOnMain: req.body.showOnMain !== 'false'
    };
    
    db.certificates.push(newCertificate);
    await saveDB(db);
    res.json({ success: true, message: 'Sertifikat berhasil ditambahkan!', data: newCertificate });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambahkan sertifikat baru.' });
  }
});

// DELETE: Hapus Sertifikat
app.delete('/api/admin/certificates/:id', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    const index = db.certificates.findIndex(c => c.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Sertifikat tidak ditemukan.' });
    }
    
    await deleteImage(db.certificates[index].image);
    db.certificates.splice(index, 1);
    
    await saveDB(db);
    res.json({ success: true, message: 'Sertifikat berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus sertifikat.' });
  }
});// --- CRUD PENDIDIKAN ---

// POST: Tambah Riwayat Pendidikan Baru
app.post('/api/admin/education', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    const { school, degree, period, description } = req.body;
    
    if (!school || !degree || !period || !description) {
      return res.status(400).json({ error: 'Semua field pendidikan wajib diisi.' });
    }
    
    const newEdu = {
      id: 'edu-' + Date.now(),
      school,
      degree,
      period,
      description
    };
    
    if (!db.education) db.education = [];
    db.education.push(newEdu);
    await saveDB(db);
    res.json({ success: true, message: 'Riwayat pendidikan berhasil ditambahkan!', data: newEdu });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambahkan riwayat pendidikan.' });
  }
});

// DELETE: Hapus Riwayat Pendidikan
app.delete('/api/admin/education/:id', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    if (!db.education) return res.status(404).json({ error: 'Pendidikan tidak ditemukan.' });
    
    const index = db.education.findIndex(e => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Riwayat pendidikan tidak ditemukan.' });
    }
    
    db.education.splice(index, 1);
    await saveDB(db);
    res.json({ success: true, message: 'Riwayat pendidikan berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus riwayat pendidikan.' });
  }
});

// PUT: Perbarui Riwayat Pendidikan
app.put('/api/admin/education/:id', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    const { school, degree, period, description } = req.body;
    
    if (!school || !degree || !period || !description) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }
    
    const index = db.education.findIndex(e => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Riwayat pendidikan tidak ditemukan.' });
    }
    
    db.education[index] = {
      id: req.params.id,
      school,
      degree,
      period,
      description
    };
    
    await saveDB(db);
    res.json({ success: true, message: 'Riwayat pendidikan berhasil diperbarui!', data: db.education[index] });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui riwayat pendidikan.' });
  }
});


// --- CRUD PENGALAMAN KERJA ---

// POST: Tambah Pengalaman Kerja Baru
app.post('/api/admin/experience', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    const { position, company, period, description } = req.body;
    
    if (!position || !company || !period || !description) {
      return res.status(400).json({ error: 'Semua field pengalaman kerja wajib diisi.' });
    }
    
    const newExp = {
      id: 'exp-' + Date.now(),
      position,
      company,
      period,
      description
    };
    
    if (!db.experience) db.experience = [];
    db.experience.push(newExp);
    await saveDB(db);
    res.json({ success: true, message: 'Pengalaman kerja berhasil ditambahkan!', data: newExp });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menambahkan pengalaman kerja.' });
  }
});

// DELETE: Hapus Pengalaman Kerja
app.delete('/api/admin/experience/:id', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    if (!db.experience) return res.status(404).json({ error: 'Pengalaman tidak ditemukan.' });
    
    const index = db.experience.findIndex(e => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Pengalaman kerja tidak ditemukan.' });
    }
    
    db.experience.splice(index, 1);
    await saveDB(db);
    res.json({ success: true, message: 'Pengalaman kerja berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus pengalaman kerja.' });
  }
});

// PUT: Perbarui Pengalaman Kerja
app.put('/api/admin/experience/:id', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    const { position, company, period, description } = req.body;
    
    if (!position || !company || !period || !description) {
      return res.status(400).json({ error: 'Semua field wajib diisi.' });
    }
    
    const index = db.experience.findIndex(e => e.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Pengalaman kerja tidak ditemukan.' });
    }
    
    db.experience[index] = {
      id: req.params.id,
      position,
      company,
      period,
      description
    };
    
    await saveDB(db);
    res.json({ success: true, message: 'Pengalaman kerja berhasil diperbarui!', data: db.experience[index] });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui pengalaman kerja.' });
  }
});



// PATCH: Toggle showOnMain status for projects, gallery, or certificates
app.patch('/api/admin/toggle-featured', checkAuth, async (req, res) => {
  try {
    const { type, id } = req.body; // type is 'projects', 'gallery', or 'certificates'
    if (!type || !id) {
      return res.status(400).json({ error: 'Type dan ID wajib diisi.' });
    }
    
    const db = await getDB();
    if (!db[type]) {
      return res.status(400).json({ error: 'Tipe data tidak valid.' });
    }
    
    const index = db[type].findIndex(item => item.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Item tidak ditemukan.' });
    }
    
    // Toggle status showOnMain (default is true if undefined)
    const currentStatus = db[type][index].showOnMain !== false;
    db[type][index].showOnMain = !currentStatus;
    
    await saveDB(db);
    res.json({ success: true, message: 'Status tampilan berhasil diubah!', showOnMain: db[type][index].showOnMain });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengubah status tampilan.' });
  }
});

// --- PESAN MASUK ---

// GET: Ambil Pesan Masuk
app.get('/api/admin/messages', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    // Kembalikan pesan yang diurutkan dari terbaru ke terlama
    const sortedMessages = [...db.messages].sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(sortedMessages);
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil pesan masuk.' });
  }
});

// DELETE: Hapus Pesan Masuk
app.delete('/api/admin/messages/:id', checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    const index = db.messages.findIndex(m => m.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Pesan tidak ditemukan.' });
    }
    
    db.messages.splice(index, 1);
    await saveDB(db);
    res.json({ success: true, message: 'Pesan berhasil dihapus!' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus pesan.' });
  }
});

// Jalankan server lokal ATAU export untuk Vercel
if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server CV berjalan aktif di http://localhost:${PORT}`);
  });
}

module.exports = app;
