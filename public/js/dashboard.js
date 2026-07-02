document.addEventListener('DOMContentLoaded', () => {
  // Global App State
  let globalData = {
    personalInfo: {},
    projects: [],
    gallery: [],
    certificates: [],
    messages: []
  };

  let isEditingProject = false;
  let currentEditingProjectId = null;

  // Cropper.js State Variables
  let croppedAvatarBlob = null;
  let croppedProjectBlob = null;
  let croppedGalleryBlob = null;
  let croppedCertBlob = null;
  let cropperInstance = null;
  let activeCropTarget = null;
  let rawPdfFile = null; // Menyimpan berkas PDF asli yang dipilih pengguna

  const pdfIconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="%23ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><text x="7" y="16" fill="%23ef4444" font-family="system-ui, -apple-system, sans-serif" font-size="5" font-weight="bold">PDF</text></svg>`;

  // Set worker PDF.js
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
  }

  // Daftar Penerbit Populer dengan Logo Resmi (Simple Icons)
  const popularIssuers = [
    { name: 'Google', logo: 'https://cdn.simpleicons.org/google/4285F4' },
    { name: 'Microsoft', logo: 'https://cdn.simpleicons.org/microsoft/F25022' },
    { name: 'IBM', logo: 'https://cdn.simpleicons.org/ibm/052FAD' },
    { name: 'Amazon Web Services (AWS)', logo: 'https://cdn.simpleicons.org/amazonwebservices/FF9900' },
    { name: 'Dicoding Indonesia', logo: 'https://cdn.simpleicons.org/directus/646CFF' }, 
    { name: 'Coursera', logo: 'https://cdn.simpleicons.org/coursera/0056D2' },
    { name: 'Udemy', logo: 'https://cdn.simpleicons.org/udemy/A435F0' },
    { name: 'Oracle', logo: 'https://cdn.simpleicons.org/oracle/F80000' },
    { name: 'Cisco', logo: 'https://cdn.simpleicons.org/cisco/1BA0D7' },
    { name: 'Red Hat', logo: 'https://cdn.simpleicons.org/redhat/EE0000' },
    { name: 'GitHub', logo: 'https://cdn.simpleicons.org/github/181717' },
    { name: 'Alibaba Cloud', logo: 'https://cdn.simpleicons.org/alibabacloud/FF6A00' }
  ];

  // DOM Elements
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const dashboardContainer = document.getElementById('dashboard-container');
  const btnLogout = document.getElementById('btn-logout');
  const liveClock = document.getElementById('live-clock');

  // Sidebar Tabs
  const menuItems = document.querySelectorAll('.menu-item');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const tabTitle = document.getElementById('tab-title');

  // Profile Form
  const profileForm = document.getElementById('profile-form');
  const profileAvatar = document.getElementById('profile-avatar');
  const profileAvatarPreview = document.getElementById('profile-avatar-preview');
  const btnSaveProfile = document.getElementById('btn-save-profile');

  // Projects CRUD
  const btnAddProject = document.getElementById('btn-add-project');
  const projectFormModal = document.getElementById('project-form-modal');
  const projectModalClose = document.getElementById('project-modal-close');
  const projectModalCancel = document.getElementById('project-modal-cancel');
  const projectModalForm = document.getElementById('project-modal-form');
  const projectModalTitle = document.getElementById('project-modal-title');
  const formProjectImage = document.getElementById('form-project-image');
  const formProjectPreview = document.getElementById('form-project-preview');
  const projectsTableBody = document.getElementById('projects-table-body');

  // Gallery CRUD
  const btnAddGallery = document.getElementById('btn-add-gallery');
  const galleryFormModal = document.getElementById('gallery-form-modal');
  const galleryModalClose = document.getElementById('gallery-modal-close');
  const galleryModalCancel = document.getElementById('gallery-modal-cancel');
  const galleryModalForm = document.getElementById('gallery-modal-form');
  const formGalleryImage = document.getElementById('form-gallery-image');
  const formGalleryPreview = document.getElementById('form-gallery-preview');
  const galleryDashboardGrid = document.getElementById('gallery-dashboard-grid');

  // Certificates CRUD
  const btnAddCertificate = document.getElementById('btn-add-certificate');
  const certificateFormModal = document.getElementById('certificate-form-modal');
  const certificateModalClose = document.getElementById('certificate-modal-close');
  const certificateModalCancel = document.getElementById('certificate-modal-cancel');
  const certificateModalForm = document.getElementById('certificate-modal-form');
  const formCertImage = document.getElementById('form-cert-image');
  const formCertPreview = document.getElementById('form-cert-preview');
  const certificatesTableBody = document.getElementById('certificates-table-body');
  const formCertIssuer = document.getElementById('form-cert-issuer');
  const formCertIssuerLogo = document.getElementById('form-cert-issuer-logo');
  const issuerAutocompleteList = document.getElementById('issuer-autocomplete-list');

  // Bulk Certificates CRUD DOM elements
  const btnBulkCertificate = document.getElementById('btn-bulk-certificate');
  const bulkCertificateModal = document.getElementById('bulk-certificate-modal');
  const bulkModalClose = document.getElementById('bulk-modal-close');
  const bulkModalCancel = document.getElementById('bulk-modal-cancel');
  const bulkCertificateForm = document.getElementById('bulk-certificate-form');
  const formBulkIssuer = document.getElementById('form-bulk-issuer');
  const formBulkIssuerLogo = document.getElementById('form-bulk-issuer-logo');
  const bulkIssuerAutocompleteList = document.getElementById('bulk-issuer-autocomplete-list');
  const formBulkDate = document.getElementById('form-bulk-date');
  const bulkDropzone = document.getElementById('bulk-dropzone');
  const formBulkFiles = document.getElementById('form-bulk-files');
  const bulkFilesList = document.getElementById('bulk-files-list');
  const btnBulkSubmit = document.getElementById('btn-bulk-submit');
  const bulkProgressContainer = document.getElementById('bulk-progress-container');
  const bulkProgressBar = document.getElementById('bulk-progress-bar');
  const bulkProgressText = document.getElementById('bulk-progress-text');
  const bulkQueueCount = document.getElementById('bulk-queue-count');
  const formBulkFeatured = document.getElementById('form-bulk-featured');

  // Education CRUD
  const btnAddEducation = document.getElementById('btn-add-education');
  const educationFormModal = document.getElementById('education-form-modal');
  const educationModalClose = document.getElementById('education-modal-close');
  const educationModalCancel = document.getElementById('education-modal-cancel');
  const educationModalForm = document.getElementById('education-modal-form');
  const educationTableBody = document.getElementById('education-table-body');

  // Experience CRUD
  const btnAddExperience = document.getElementById('btn-add-experience');
  const experienceFormModal = document.getElementById('experience-form-modal');
  const experienceModalClose = document.getElementById('experience-modal-close');
  const experienceModalCancel = document.getElementById('experience-modal-cancel');
  const experienceModalForm = document.getElementById('experience-modal-form');
  const experienceTableBody = document.getElementById('experience-table-body');

  // Messages Inbox
  const messagesList = document.getElementById('messages-list');
  const messagesCountBadge = document.getElementById('messages-count');

  // Settings
  const changePasswordForm = document.getElementById('change-password-form');

  // Image Cropper DOM Elements
  const cropperFormModal = document.getElementById('cropper-form-modal');
  const cropperImage = document.getElementById('cropper-image');
  const btnCropSave = document.getElementById('btn-crop-save');
  const cropperModalClose = document.getElementById('cropper-modal-close');
  const cropperModalCancel = document.getElementById('cropper-modal-cancel');

  // Reusable Image Cropper Helper
  function handleImageCropper(file, aspect, targetName) {
    if (!file) return;

    activeCropTarget = targetName;
    
    // Revoke old URL if exists to avoid memory leak
    if (cropperImage.src.startsWith('blob:')) {
      URL.revokeObjectURL(cropperImage.src);
    }
    
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }

    // Set onload handler BEFORE setting the source to ensure event is captured
    cropperImage.onload = () => {
      // Tunggu modal selesai transisi pembukaan (300ms)
      setTimeout(() => {
        try {
          if (typeof Cropper === 'undefined') {
            showToast('Cropper.js library gagal dimuat. Periksa internet Anda.', 'error');
            return;
          }
          
          cropperInstance = new Cropper(cropperImage, {
            aspectRatio: (typeof aspect === 'number' && !isNaN(aspect)) ? aspect : null,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.9,
            background: true, // Latar kotak-kotak catur
            responsive: true,
            checkOrientation: false
          });
        } catch (err) {
          console.error('Cropper Init Error:', err);
        }
      }, 300);
    };

    // Tambah class mode bulat jika memotong avatar profil
    if (targetName === 'avatar') {
      cropperFormModal.classList.add('avatar-mode');
    } else {
      cropperFormModal.classList.remove('avatar-mode');
    }

    cropperImage.src = URL.createObjectURL(file);
    cropperFormModal.classList.add('open');
  }

  function closeCropperModal() {
    cropperFormModal.classList.remove('open');
    cropperFormModal.classList.remove('avatar-mode');
    if (cropperInstance) {
      cropperInstance.destroy();
      cropperInstance = null;
    }
    
    // Reset file input value yang sedang aktif agar jika memilih file yang sama bisa mentrigger event 'change' lagi
    if (activeCropTarget === 'avatar') profileAvatar.value = '';
    else if (activeCropTarget === 'project') formProjectImage.value = '';
    else if (activeCropTarget === 'gallery') formGalleryImage.value = '';
    else if (activeCropTarget === 'cert') formCertImage.value = '';
    
    activeCropTarget = null;
  }

  cropperModalClose.addEventListener('click', closeCropperModal);
  cropperModalCancel.addEventListener('click', closeCropperModal);

  btnCropSave.addEventListener('click', () => {
    if (!cropperInstance) return;

    // Ambil canvas hasil crop
    cropperInstance.getCroppedCanvas({
      imageSmoothingQuality: 'high'
    }).toBlob((blob) => {
      if (!blob) {
        showToast('Gagal memotong gambar.', 'error');
        return;
      }
      
      const croppedUrl = URL.createObjectURL(blob);
      
      if (activeCropTarget === 'avatar') {
        croppedAvatarBlob = blob;
        profileAvatarPreview.src = croppedUrl;
      } else if (activeCropTarget === 'project') {
        croppedProjectBlob = blob;
        formProjectPreview.src = croppedUrl;
      } else if (activeCropTarget === 'gallery') {
        croppedGalleryBlob = blob;
        formGalleryPreview.src = croppedUrl;
      } else if (activeCropTarget === 'cert') {
        croppedCertBlob = blob;
        formCertPreview.src = croppedUrl;
      }

      // Close modal
      cropperFormModal.classList.remove('open');
      cropperInstance.destroy();
      cropperInstance = null;
      activeCropTarget = null;
    }, 'image/jpeg', 0.9);
  });

  // ==========================================
  // 1. SESSION & LOGIN HANDSHAKE
  // ==========================================

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      
      if (data.loggedIn) {
        showDashboard();
      } else {
        showLoginForm();
      }
    } catch (err) {
      showLoginForm();
    }
  }

  function showLoginForm() {
    loginOverlay.style.display = 'flex';
    dashboardContainer.style.display = 'none';
  }

  function showDashboard() {
    loginOverlay.style.display = 'none';
    dashboardContainer.style.display = 'flex';
    loadDashboardData();
    startClock();
  }

  // Handle Login Submit
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    loginErrorMsg.style.display = 'none';
    const btnSubmit = document.getElementById('btn-login-submit');
    btnSubmit.disabled = true;
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        showDashboard();
        showToast('Login berhasil! Selamat datang.', 'success');
      } else {
        throw new Error(data.error || 'Username atau password salah.');
      }
    } catch (err) {
      loginErrorMsg.textContent = err.message;
      loginErrorMsg.style.display = 'block';
    } finally {
      btnSubmit.disabled = false;
    }
  });

  // Handle Logout
  btnLogout.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        showLoginForm();
        showToast('Anda telah keluar dari sistem.', 'success');
      }
    } catch (err) {
      showToast('Gagal logout. Silakan coba lagi.', 'error');
    }
  });

  // ==========================================
  // 2. DASHBOARD DATA HANDLING
  // ==========================================

  async function loadDashboardData() {
    try {
      // Ambil data publik CV
      const resCv = await fetch('/api/cv');
      const dataCv = await resCv.json();
      
      globalData.personalInfo = dataCv.personalInfo || {};
      globalData.projects = dataCv.projects || [];
      globalData.gallery = dataCv.gallery || [];
      globalData.certificates = dataCv.certificates || [];
      globalData.education = dataCv.education || [];
      globalData.experience = dataCv.experience || [];
      
      // Ambil pesan inbox (hanya bisa diakses setelah login)
      const resMsg = await fetch('/api/admin/messages');
      if (resMsg.ok) {
        globalData.messages = await resMsg.json();
      }

      // Populate dashboard views
      populateProfileForm(globalData.personalInfo);
      populateProjectsTable(globalData.projects);
      populateGalleryGrid(globalData.gallery);
      populateCertificatesTable(globalData.certificates);
      populateEducationTable(globalData.education);
      populateExperienceTable(globalData.experience);
      populateMessagesInbox(globalData.messages);

      // Refresh icons
      lucide.createIcons();
    } catch (err) {
      showToast('Gagal memuat data dashboard.', 'error');
    }
  }

  // Toggle item showOnMain status via PATCH API
  async function toggleItemFeatured(type, id) {
    try {
      const res = await fetch('/api/admin/toggle-featured', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message, 'success');
        loadDashboardData(); // Refresh UI
      } else {
        throw new Error(data.error || 'Gagal mengubah status.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==========================================
  // 3. PROFILE VIEW HANDLERS
  // ==========================================

  function populateProfileForm(info) {
    if (!info) return;
    document.getElementById('profile-name').value = info.name || '';
    document.getElementById('profile-title').value = info.title || '';
    document.getElementById('profile-bio').value = info.bio || '';
    document.getElementById('profile-email').value = info.email || '';
    document.getElementById('profile-phone').value = info.phone || '';
    document.getElementById('profile-location').value = info.location || '';
    document.getElementById('profile-skills').value = (info.skills || []).join(', ');
    
    if (info.avatar) {
      profileAvatarPreview.src = info.avatar;
    } else {
      profileAvatarPreview.src = '/uploads/default-avatar.png';
    }

    if (info.socials) {
      document.getElementById('profile-github').value = info.socials.github || '';
      document.getElementById('profile-linkedin').value = info.socials.linkedin || '';
      document.getElementById('profile-instagram').value = info.socials.instagram || '';
    }
  }

  // Preview profile avatar local file upload with cropper
  profileAvatar.addEventListener('change', () => {
    const file = profileAvatar.files[0];
    if (file) {
      handleImageCropper(file, 1, 'avatar');
    }
  });

  // Submit Profile Form
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnSaveProfile.disabled = true;
    
    const formData = new FormData();
    formData.append('name', document.getElementById('profile-name').value);
    formData.append('title', document.getElementById('profile-title').value);
    formData.append('bio', document.getElementById('profile-bio').value);
    formData.append('email', document.getElementById('profile-email').value);
    formData.append('phone', document.getElementById('profile-phone').value);
    formData.append('location', document.getElementById('profile-location').value);
    formData.append('skills', document.getElementById('profile-skills').value);
    formData.append('github', document.getElementById('profile-github').value);
    formData.append('linkedin', document.getElementById('profile-linkedin').value);
    formData.append('instagram', document.getElementById('profile-instagram').value);
    
    if (croppedAvatarBlob) {
      formData.append('avatar', croppedAvatarBlob, 'cropped-avatar.jpg');
    }
    
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        body: formData
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast('Profil berhasil diperbarui!', 'success');
        globalData.personalInfo = data.data;
        populateProfileForm(globalData.personalInfo);
        croppedAvatarBlob = null; // reset
      } else {
        throw new Error(data.error || 'Gagal menyimpan profil.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSaveProfile.disabled = false;
    }
  });

  // ==========================================
  // 4. PROJECTS CRUD HANDLERS
  // ==========================================

  function populateProjectsTable(projects) {
    projectsTableBody.innerHTML = '';
    
    if (projects.length === 0) {
      projectsTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Belum ada proyek. Klik Tambah Proyek Baru.</td></tr>';
      return;
    }
    
    projects.forEach(p => {
      const row = document.createElement('tr');
      const isFeatured = p.showOnMain !== false;
      row.innerHTML = `
        <td><img src="${p.image || '/uploads/default-project.png'}" class="table-img-preview" alt="Proyek"></td>
        <td><strong>${p.title}</strong></td>
        <td><span class="badge-count" style="background-color: rgba(14, 165, 233, 0.1); color: var(--color-primary); font-size: 0.8rem; padding: 0.2rem 0.6rem;">${p.category}</span></td>
        <td><small>${p.tech}</small></td>
        <td style="text-align: center;">
          <button class="btn-toggle-featured" data-id="${p.id}" style="background: none; border: none; cursor: pointer; color: ${isFeatured ? '#f59e0b' : '#cbd5e1'};" title="${isFeatured ? 'Ditampilkan di halaman utama' : 'Disembunyikan dari halaman utama'}">
            <i data-lucide="${isFeatured ? 'star' : 'star-off'}" style="width: 20px; height: 20px;"></i>
          </button>
        </td>
        <td style="text-align: center;">
          <button class="btn-action-edit" data-id="${p.id}"><i data-lucide="edit-2" style="width: 18px; height: 18px;"></i></button>
          <button class="btn-action-delete" data-id="${p.id}"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></button>
        </td>
      `;
      
      // Event buttons
      row.querySelector('.btn-toggle-featured').addEventListener('click', () => toggleItemFeatured('projects', p.id));
      row.querySelector('.btn-action-edit').addEventListener('click', () => openEditProjectModal(p.id));
      row.querySelector('.btn-action-delete').addEventListener('click', () => deleteProject(p.id));
      
      projectsTableBody.appendChild(row);
    });
  }

  // Preview form image local selection with cropper
  formProjectImage.addEventListener('change', () => {
    const file = formProjectImage.files[0];
    if (file) {
      handleImageCropper(file, 16 / 10, 'project');
    }
  });

  // Show Modal Project Add
  btnAddProject.addEventListener('click', () => {
    isEditingProject = false;
    currentEditingProjectId = null;
    croppedProjectBlob = null; // reset crop
    projectModalTitle.textContent = 'Tambah Proyek Baru';
    projectModalForm.reset();
    document.getElementById('project-id-field').value = '';
    formProjectPreview.src = '/uploads/default-project.png';
    projectFormModal.classList.add('open');
  });

  // Show Modal Project Edit
  function openEditProjectModal(id) {
    const p = globalData.projects.find(proj => proj.id === id);
    if (!p) return;

    isEditingProject = true;
    currentEditingProjectId = id;
    croppedProjectBlob = null; // reset crop
    projectModalTitle.textContent = 'Edit Proyek';
    projectModalForm.reset();
    
    document.getElementById('project-id-field').value = p.id;
    document.getElementById('form-project-title').value = p.title;
    document.getElementById('form-project-category').value = p.category;
    document.getElementById('form-project-link').value = p.link || '';
    document.getElementById('form-project-tech').value = p.tech;
    document.getElementById('form-project-desc').value = p.description;
    document.getElementById('form-project-featured').checked = p.showOnMain !== false;
    formProjectPreview.src = p.image || '/uploads/default-project.png';
    
    projectFormModal.classList.add('open');
  }

  // Close Modals Project
  function closeProjectModal() {
    projectFormModal.classList.remove('open');
    projectModalForm.reset();
    croppedProjectBlob = null;
  }
  projectModalClose.addEventListener('click', closeProjectModal);
  projectModalCancel.addEventListener('click', closeProjectModal);

  // Submit Project Form
  projectModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = projectModalForm.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;

    const formData = new FormData();
    formData.append('title', document.getElementById('form-project-title').value);
    formData.append('category', document.getElementById('form-project-category').value);
    formData.append('link', document.getElementById('form-project-link').value);
    formData.append('tech', document.getElementById('form-project-tech').value);
    formData.append('description', document.getElementById('form-project-desc').value);
    formData.append('showOnMain', document.getElementById('form-project-featured').checked);

    if (croppedProjectBlob) {
      formData.append('image', croppedProjectBlob, 'cropped-project.jpg');
    }

    const url = isEditingProject ? `/api/admin/projects/${currentEditingProjectId}` : '/api/admin/projects';
    const method = isEditingProject ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(isEditingProject ? 'Proyek berhasil diperbarui!' : 'Proyek baru berhasil ditambahkan!', 'success');
        closeProjectModal();
        loadDashboardData(); // Reload all data to refresh
      } else {
        throw new Error(data.error || 'Gagal menyimpan proyek.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSubmit.disabled = false;
    }
  });

  // Delete Project
  async function deleteProject(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus proyek ini?')) return;
    
    try {
      const res = await fetch(`/api/admin/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast('Proyek berhasil dihapus.', 'success');
        loadDashboardData();
      } else {
        throw new Error(data.error || 'Gagal menghapus proyek.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==========================================
  // 5. GALLERY CRUD HANDLERS
  // ==========================================

  function populateGalleryGrid(galleryItems) {
    galleryDashboardGrid.innerHTML = '';
    
    if (galleryItems.length === 0) {
      galleryDashboardGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada foto galeri. Klik Unggah Foto.</p>';
      return;
    }
    
    galleryItems.forEach(item => {
      const card = document.createElement('div');
      card.className = 'gallery-db-card';
      const isFeatured = item.showOnMain !== false;
      card.innerHTML = `
        <div class="gallery-db-img-wrapper">
          <img src="${item.image}" class="gallery-db-img" alt="Gallery">
        </div>
        <div class="gallery-db-info">
          <h4>${item.title}</h4>
          <span>${item.category || 'General'}</span>
        </div>
        <div class="gallery-db-footer" style="justify-content: space-between; display: flex; align-items: center; padding: 0.5rem 1rem;">
          <button class="btn-toggle-featured" data-id="${item.id}" style="background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 0.25rem; color: ${isFeatured ? '#f59e0b' : '#64748b'}; font-weight: 500;" title="${isFeatured ? 'Ditampilkan di halaman utama' : 'Disembunyikan dari halaman utama'}">
            <i data-lucide="${isFeatured ? 'star' : 'star-off'}" style="width: 18px; height: 18px;"></i>
            <span>${isFeatured ? 'Utama' : 'Galeri Saja'}</span>
          </button>
          <button class="btn-action-delete" data-id="${item.id}" style="padding: 0.25rem 0.5rem;"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i> Hapus</button>
        </div>
      `;
      
      card.querySelector('.btn-toggle-featured').addEventListener('click', () => toggleItemFeatured('gallery', item.id));
      card.querySelector('.btn-action-delete').addEventListener('click', () => deleteGalleryItem(item.id));
      galleryDashboardGrid.appendChild(card);
    });
  }

  // Local Selection Preview Galeri with cropper
  formGalleryImage.addEventListener('change', () => {
    const file = formGalleryImage.files[0];
    if (file) {
      handleImageCropper(file, NaN, 'gallery');
    }
  });

  // Show Modal Gallery
  btnAddGallery.addEventListener('click', () => {
    galleryModalForm.reset();
    croppedGalleryBlob = null; // reset crop
    formGalleryPreview.src = '/uploads/default-gallery.png';
    galleryFormModal.classList.add('open');
  });

  // Close Modal Gallery
  function closeGalleryModal() {
    galleryFormModal.classList.remove('open');
    croppedGalleryBlob = null;
  }
  galleryModalClose.addEventListener('click', closeGalleryModal);
  galleryModalCancel.addEventListener('click', closeGalleryModal);

  // Submit Gallery Item
  galleryModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = galleryModalForm.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;

    const formData = new FormData();
    formData.append('title', document.getElementById('form-gallery-title').value);
    formData.append('category', document.getElementById('form-gallery-category').value);
    formData.append('description', document.getElementById('form-gallery-desc').value);
    formData.append('showOnMain', document.getElementById('form-gallery-featured').checked);

    if (croppedGalleryBlob) {
      formData.append('image', croppedGalleryBlob, 'cropped-gallery.jpg');
    } else {
      showToast('Anda harus memilih file gambar.', 'error');
      btnSubmit.disabled = false;
      return;
    }

    try {
      const res = await fetch('/api/admin/gallery', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Foto baru berhasil diunggah!', 'success');
        closeGalleryModal();
        loadDashboardData();
      } else {
        throw new Error(data.error || 'Gagal mengunggah foto.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSubmit.disabled = false;
    }
  });

  // Delete Gallery Item
  async function deleteGalleryItem(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus foto ini dari galeri?')) return;
    
    try {
      const res = await fetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast('Foto berhasil dihapus.', 'success');
        loadDashboardData();
      } else {
        throw new Error(data.error || 'Gagal menghapus foto.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==========================================
  // 6. CERTIFICATES CRUD HANDLERS
  // ==========================================

  function populateCertificatesTable(certs) {
    certificatesTableBody.innerHTML = '';
    
    if (certs.length === 0) {
      certificatesTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Belum ada sertifikat. Klik Tambah Sertifikat Baru.</td></tr>';
      return;
    }
    
    certs.forEach(c => {
      const row = document.createElement('tr');
      const isFeatured = c.showOnMain !== false;
      const isOldPdf = c.image && c.image.toLowerCase().endsWith('.pdf');
      const previewSrc = isOldPdf ? pdfIconSvg : (c.image || '/uploads/default-certificate.png');
      const pdfLink = c.pdf || (isOldPdf ? c.image : '');
      
      row.innerHTML = `
        <td><img src="${previewSrc}" class="table-img-preview" alt="Sertifikat" style="${pdfLink ? 'cursor: pointer;' : ''}"></td>
        <td><strong>${c.title}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            ${c.issuerLogo ? `<img src="${c.issuerLogo}" style="width: 18px; height: 18px; object-fit: contain; border-radius: 2px;" alt="">` : ''}
            <span>${c.issuer}</span>
          </div>
        </td>
        <td>${formatDate(c.date)}</td>
        <td style="text-align: center;">
          <button class="btn-toggle-featured" data-id="${c.id}" style="background: none; border: none; cursor: pointer; color: ${isFeatured ? '#f59e0b' : '#cbd5e1'};" title="${isFeatured ? 'Ditampilkan di halaman utama' : 'Disembunyikan dari halaman utama'}">
            <i data-lucide="${isFeatured ? 'star' : 'star-off'}" style="width: 20px; height: 20px;"></i>
          </button>
        </td>
        <td style="text-align: center;">
          <button class="btn-action-delete" data-id="${c.id}"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></button>
        </td>
      `;
      
      if (pdfLink) {
        row.querySelector('.table-img-preview').addEventListener('click', () => {
          window.open(pdfLink, '_blank');
        });
      }
      
      row.querySelector('.btn-toggle-featured').addEventListener('click', () => toggleItemFeatured('certificates', c.id));
      row.querySelector('.btn-action-delete').addEventListener('click', () => deleteCertificate(c.id));
      certificatesTableBody.appendChild(row);
    });
  }

  // Autocomplete logic untuk Penerbit Sertifikat
  formCertIssuer.addEventListener('input', () => {
    const value = formCertIssuer.value.toLowerCase().trim();
    issuerAutocompleteList.innerHTML = '';
    
    if (!value) {
      issuerAutocompleteList.style.display = 'none';
      return;
    }
    
    const filtered = popularIssuers.filter(item => item.name.toLowerCase().includes(value));
    
    if (filtered.length === 0) {
      issuerAutocompleteList.style.display = 'none';
      return;
    }
    
    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.innerHTML = `
        <img src="${item.logo}" alt="${item.name}" class="autocomplete-logo">
        <span>${item.name}</span>
      `;
      div.addEventListener('click', () => {
        formCertIssuer.value = item.name;
        formCertIssuerLogo.value = item.logo;
        issuerAutocompleteList.innerHTML = '';
        issuerAutocompleteList.style.display = 'none';
      });
      issuerAutocompleteList.appendChild(div);
    });
    
    issuerAutocompleteList.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (e.target !== formCertIssuer && e.target !== issuerAutocompleteList) {
      issuerAutocompleteList.style.display = 'none';
    }
  });

  // Local Image Selection Preview Sertifikat with cropper or direct PDF upload
  formCertImage.addEventListener('change', () => {
    const file = formCertImage.files[0];
    if (file) {
      // Auto-fill title
      const fileName = file.name;
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
      const cleanedName = nameWithoutExt
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const capitalizedName = cleanedName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const titleInput = document.getElementById('form-cert-title');
      if (titleInput && !titleInput.value) {
        titleInput.value = capitalizedName;
      }

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        rawPdfFile = file; // Simpan file asli untuk diunggah
        
        // Tampilkan loading spinner sementara
        formCertPreview.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="60" height="60"><circle cx="12" cy="12" r="10" stroke="%2338bdf8" stroke-width="4" fill="none" stroke-dasharray="31.4" stroke-dashoffset="0"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle></svg>';

        const fileReader = new FileReader();
        fileReader.onload = async function() {
          try {
            const typedarray = new Uint8Array(this.result);
            if (typeof pdfjsLib === 'undefined') {
              showToast('PDF.js library gagal dimuat.', 'error');
              croppedCertBlob = null;
              formCertPreview.src = pdfIconSvg;
              return;
            }
            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
            const page = await pdf.getPage(1);
            
            // Render ke canvas
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            // Konversi canvas ke blob gambar
            canvas.toBlob((blob) => {
              if (blob) {
                croppedCertBlob = blob; // Thumbnail JPEG
                formCertPreview.src = URL.createObjectURL(blob); // Tampilkan pratinjau halaman 1 PDF
              } else {
                showToast('Gagal memproses gambar halaman PDF.', 'error');
                croppedCertBlob = null;
                formCertPreview.src = pdfIconSvg;
              }
            }, 'image/jpeg', 0.95);
            
          } catch (err) {
            console.error('Error rendering PDF thumbnail:', err);
            showToast('Gagal memproses pratinjau PDF.', 'error');
            croppedCertBlob = null;
            formCertPreview.src = pdfIconSvg;
          }
        };
        fileReader.readAsArrayBuffer(file);
      } else {
        rawPdfFile = null; // Bukan PDF
        handleImageCropper(file, NaN, 'cert');
      }
    }
  });

  // Show Modal Certificate
  btnAddCertificate.addEventListener('click', () => {
    certificateModalForm.reset();
    croppedCertBlob = null; // reset crop
    rawPdfFile = null;
    formCertIssuerLogo.value = '';
    formCertPreview.src = '/uploads/default-certificate.png';
    certificateFormModal.classList.add('open');
  });

  // Close Modal Certificate
  function closeCertificateModal() {
    certificateFormModal.classList.remove('open');
    croppedCertBlob = null;
    rawPdfFile = null;
  }
  certificateModalClose.addEventListener('click', closeCertificateModal);
  certificateModalCancel.addEventListener('click', closeCertificateModal);

  // Submit Certificate Item
  certificateModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = certificateModalForm.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;

    const formData = new FormData();
    formData.append('title', document.getElementById('form-cert-title').value);
    formData.append('issuer', document.getElementById('form-cert-issuer').value);
    formData.append('date', document.getElementById('form-cert-date').value);
    formData.append('link', document.getElementById('form-cert-link').value);
    formData.append('showOnMain', document.getElementById('form-cert-featured').checked);
    
    if (formCertIssuerLogo.value) {
      formData.append('issuerLogo', formCertIssuerLogo.value);
    }

    if (croppedCertBlob) {
      formData.append('image', croppedCertBlob, 'cropped-cert.jpg');
    }
    if (rawPdfFile) {
      formData.append('pdf', rawPdfFile, rawPdfFile.name || 'certificate.pdf');
    }

    try {
      const res = await fetch('/api/admin/certificates', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Sertifikat berhasil disimpan!', 'success');
        closeCertificateModal();
        loadDashboardData();
      } else {
        throw new Error(data.error || 'Gagal menyimpan sertifikat.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSubmit.disabled = false;
    }
  });

  // Delete Certificate
  async function deleteCertificate(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus sertifikat ini?')) return;
    
    try {
      const res = await fetch(`/api/admin/certificates/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast('Sertifikat berhasil dihapus.', 'success');
        loadDashboardData();
      } else {
        throw new Error(data.error || 'Gagal menghapus sertifikat.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==========================================
  // 6A_BULK. BULK CERTIFICATES HANDLERS
  // ==========================================
  let bulkQueue = []; // Holds objects: { file: File, title: string, status: 'pending'|'processing'|'success'|'error', errorMsg?: string }

  // Autocomplete untuk Bulk Issuer
  formBulkIssuer.addEventListener('input', () => {
    const value = formBulkIssuer.value.toLowerCase().trim();
    bulkIssuerAutocompleteList.innerHTML = '';
    
    if (!value) {
      bulkIssuerAutocompleteList.style.display = 'none';
      return;
    }
    
    const filtered = popularIssuers.filter(item => item.name.toLowerCase().includes(value));
    
    if (filtered.length === 0) {
      bulkIssuerAutocompleteList.style.display = 'none';
      return;
    }
    
    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = 'autocomplete-item';
      div.innerHTML = `
        <img src="${item.logo}" alt="${item.name}" class="autocomplete-logo">
        <span>${item.name}</span>
      `;
      div.addEventListener('click', () => {
        formBulkIssuer.value = item.name;
        formBulkIssuerLogo.value = item.logo;
        bulkIssuerAutocompleteList.innerHTML = '';
        bulkIssuerAutocompleteList.style.display = 'none';
      });
      bulkIssuerAutocompleteList.appendChild(div);
    });
    
    bulkIssuerAutocompleteList.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (e.target !== formBulkIssuer && e.target !== bulkIssuerAutocompleteList) {
      bulkIssuerAutocompleteList.style.display = 'none';
    }
  });

  // Open Bulk Modal
  btnBulkCertificate.addEventListener('click', () => {
    bulkCertificateForm.reset();
    bulkQueue = [];
    formBulkIssuerLogo.value = '';
    updateBulkQueueUI();
    bulkProgressContainer.style.display = 'none';
    bulkProgressBar.style.width = '0%';
    bulkProgressText.textContent = '0 dari 0 file berhasil diunggah';
    btnBulkSubmit.textContent = 'Mulai Unggah';
    btnBulkSubmit.disabled = true;
    bulkCertificateModal.classList.add('open');
  });

  // Close Bulk Modal
  function closeBulkModal() {
    bulkCertificateModal.classList.remove('open');
    bulkQueue = [];
  }
  bulkModalClose.addEventListener('click', closeBulkModal);
  bulkModalCancel.addEventListener('click', closeBulkModal);

  // Drag and drop events for dropzone
  bulkDropzone.addEventListener('click', () => {
    formBulkFiles.click();
  });

  formBulkFiles.addEventListener('change', (e) => {
    handleBulkFilesSelection(e.target.files);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    bulkDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      bulkDropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    bulkDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      bulkDropzone.classList.remove('dragover');
    }, false);
  });

  bulkDropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleBulkFilesSelection(files);
  });

  function handleBulkFilesSelection(files) {
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Generate clean title
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const cleanedName = nameWithoutExt
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const capitalizedName = cleanedName
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      // Check if duplicate in queue
      if (bulkQueue.some(item => item.file.name === file.name && item.file.size === file.size)) {
        continue;
      }

      bulkQueue.push({
        file: file,
        title: capitalizedName,
        status: 'pending'
      });
    }

    updateBulkQueueUI();
    btnBulkSubmit.disabled = bulkQueue.length === 0;
  }

  function updateBulkQueueUI() {
    bulkQueueCount.textContent = bulkQueue.length;
    bulkFilesList.innerHTML = '';

    if (bulkQueue.length === 0) {
      bulkFilesList.innerHTML = '<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1.5rem 0;">Belum ada berkas yang dipilih.</div>';
      return;
    }

    bulkQueue.forEach((item, index) => {
      const isPdf = item.file.type === 'application/pdf' || item.file.name.toLowerCase().endsWith('.pdf');
      const itemEl = document.createElement('div');
      itemEl.className = 'bulk-file-item';
      
      let statusHtml = '';
      if (item.status === 'pending') {
        statusHtml = `<span class="bulk-file-status status-pending"><i data-lucide="clock" style="width:16px; height:16px;"></i> Menunggu</span>`;
      } else if (item.status === 'processing') {
        statusHtml = `<span class="bulk-file-status status-processing"><i data-lucide="loader" class="spinner" style="width:16px; height:16px;"></i> Memproses</span>`;
      } else if (item.status === 'success') {
        statusHtml = `<span class="bulk-file-status status-success"><i data-lucide="check-circle" style="width:16px; height:16px;"></i> Sukses</span>`;
      } else if (item.status === 'error') {
        statusHtml = `<span class="bulk-file-status status-error" title="${item.errorMsg || 'Gagal'}"><i data-lucide="x-circle" style="width:16px; height:16px;"></i> Gagal</span>`;
      }

      itemEl.innerHTML = `
        <div class="bulk-file-info">
          <span class="bulk-file-name" title="${item.file.name}">${item.title}</span>
          <span class="bulk-file-meta">${isPdf ? 'PDF Document' : 'Image File'} • ${(item.file.size / (1024 * 1024)).toFixed(2)} MB</span>
        </div>
        <div>
          ${statusHtml}
        </div>
      `;
      bulkFilesList.appendChild(itemEl);
    });

    if (window.lucide) lucide.createIcons();
  }

  // Submit bulk upload form
  bulkCertificateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (bulkQueue.length === 0) return;

    // Disable all inputs
    btnBulkSubmit.disabled = true;
    bulkModalCancel.disabled = true;
    bulkDropzone.style.pointerEvents = 'none';
    formBulkIssuer.disabled = true;
    formBulkDate.disabled = true;
    formBulkFeatured.disabled = true;

    bulkProgressContainer.style.display = 'block';
    
    const defaultIssuer = formBulkIssuer.value;
    const defaultDate = formBulkDate.value || new Date().toISOString().split('T')[0];
    const defaultLogo = formBulkIssuerLogo.value;
    const showOnMainVal = formBulkFeatured.checked;

    let successCount = 0;

    for (let i = 0; i < bulkQueue.length; i++) {
      const item = bulkQueue[i];
      if (item.status === 'success') {
        successCount++;
        continue; // Skip already success
      }

      item.status = 'processing';
      updateBulkQueueUI();

      try {
        const formData = new FormData();
        formData.append('title', item.title);
        formData.append('issuer', defaultIssuer || 'Personal Certification');
        formData.append('date', defaultDate);
        formData.append('link', '');
        formData.append('showOnMain', showOnMainVal);
        if (defaultLogo) {
          formData.append('issuerLogo', defaultLogo);
        }

        const isPdf = item.file.type === 'application/pdf' || item.file.name.toLowerCase().endsWith('.pdf');
        
        if (isPdf) {
          // Generate thumbnail client-side
          const thumbnailBlob = await generatePdfThumbnail(item.file);
          if (thumbnailBlob) {
            formData.append('image', thumbnailBlob, 'thumbnail.jpg');
          }
          formData.append('pdf', item.file, item.file.name);
        } else {
          formData.append('image', item.file, item.file.name);
        }

        const res = await fetch('/api/admin/certificates', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (res.ok && data.success) {
          item.status = 'success';
          successCount++;
        } else {
          throw new Error(data.error || 'Gagal menyimpan.');
        }
      } catch (err) {
        console.error(err);
        item.status = 'error';
        item.errorMsg = err.message;
      }

      // Update progress bar
      const progressPercent = Math.round(((i + 1) / bulkQueue.length) * 100);
      bulkProgressBar.style.width = `${progressPercent}%`;
      bulkProgressText.textContent = `${successCount} dari ${bulkQueue.length} file berhasil diunggah`;
      
      updateBulkQueueUI();
    }

    // Finished
    showToast(`${successCount} sertifikat berhasil diunggah secara massal!`, 'success');
    loadDashboardData();

    // Enable inputs back
    bulkModalCancel.disabled = false;
    bulkDropzone.style.pointerEvents = 'all';
    formBulkIssuer.disabled = false;
    formBulkDate.disabled = false;
    formBulkFeatured.disabled = false;

    // Change submit button to close behavior
    btnBulkSubmit.textContent = 'Selesai';
    btnBulkSubmit.disabled = false;
    
    // We replace form listener submit temporarily or use onclick once
    const handleFinishedClose = () => {
      closeBulkModal();
      btnBulkSubmit.textContent = 'Mulai Unggah';
      btnBulkSubmit.removeEventListener('click', handleFinishedClose);
    };
    btnBulkSubmit.addEventListener('click', handleFinishedClose);
  });

  // Helper to generate PDF thumbnail asynchronously
  function generatePdfThumbnail(file) {
    return new Promise((resolve) => {
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        try {
          const typedarray = new Uint8Array(this.result);
          if (typeof pdfjsLib === 'undefined') {
            resolve(null);
            return;
          }
          const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
          const page = await pdf.getPage(1);
          
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          
          await page.render({ canvasContext: context, viewport: viewport }).promise;
          
          canvas.toBlob((blob) => {
            resolve(blob);
          }, 'image/jpeg', 0.9);
          
        } catch (err) {
          console.error('Error generating bulk PDF thumbnail:', err);
          resolve(null);
        }
      };
      fileReader.readAsArrayBuffer(file);
    });
  }

  // ==========================================
  // 6B. EDUCATION CRUD HANDLERS
  // ==========================================
  let isEditingEducation = false;
  let currentEditingEducationId = null;

  function populateEducationTable(education) {
    educationTableBody.innerHTML = '';
    
    if (!education || education.length === 0) {
      educationTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Belum ada riwayat pendidikan. Klik Tambah Pendidikan Baru.</td></tr>';
      return;
    }
    
    education.forEach(e => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${e.school}</strong></td>
        <td>${e.degree}</td>
        <td><span class="badge-count" style="background-color: rgba(139, 92, 246, 0.1); color: #8b5cf6; font-size: 0.8rem; padding: 0.2rem 0.6rem;">${e.period}</span></td>
        <td><small>${e.description}</small></td>
        <td style="text-align: center;">
          <button class="btn-action-edit" data-id="${e.id}"><i data-lucide="edit-2" style="width: 18px; height: 18px;"></i></button>
          <button class="btn-action-delete" data-id="${e.id}"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></button>
        </td>
      `;
      
      row.querySelector('.btn-action-edit').addEventListener('click', () => openEditEducationModal(e.id));
      row.querySelector('.btn-action-delete').addEventListener('click', () => deleteEducation(e.id));
      educationTableBody.appendChild(row);
    });
  }

  // Show Modal Education (Add Mode)
  btnAddEducation.addEventListener('click', () => {
    isEditingEducation = false;
    currentEditingEducationId = null;
    educationFormModal.querySelector('h3').textContent = 'Tambah Riwayat Pendidikan';
    educationFormModal.querySelector('button[type="submit"]').textContent = 'Simpan Pendidikan';
    educationModalForm.reset();
    educationFormModal.classList.add('open');
  });

  // Open Edit Education Modal
  function openEditEducationModal(id) {
    const e = globalData.education.find(edu => edu.id === id);
    if (!e) return;

    isEditingEducation = true;
    currentEditingEducationId = id;
    educationFormModal.querySelector('h3').textContent = 'Edit Riwayat Pendidikan';
    educationFormModal.querySelector('button[type="submit"]').textContent = 'Perbarui Pendidikan';
    
    document.getElementById('form-edu-school').value = e.school;
    document.getElementById('form-edu-degree').value = e.degree;
    document.getElementById('form-edu-period').value = e.period;
    document.getElementById('form-edu-desc').value = e.description;
    
    educationFormModal.classList.add('open');
  }

  // Close Modal Education
  function closeEducationModal() {
    educationFormModal.classList.remove('open');
    educationModalForm.reset();
  }
  educationModalClose.addEventListener('click', closeEducationModal);
  educationModalCancel.addEventListener('click', closeEducationModal);

  // Submit Education Item (Add or Edit)
  educationModalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = educationModalForm.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;

    const school = document.getElementById('form-edu-school').value.trim();
    const degree = document.getElementById('form-edu-degree').value.trim();
    const period = document.getElementById('form-edu-period').value.trim();
    const description = document.getElementById('form-edu-desc').value.trim();

    const url = isEditingEducation ? `/api/admin/education/${currentEditingEducationId}` : '/api/admin/education';
    const method = isEditingEducation ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ school, degree, period, description })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast(isEditingEducation ? 'Riwayat pendidikan berhasil diperbarui!' : 'Riwayat pendidikan berhasil disimpan!', 'success');
        closeEducationModal();
        loadDashboardData();
      } else {
        throw new Error(data.error || 'Gagal menyimpan riwayat pendidikan.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSubmit.disabled = false;
    }
  });

  // Delete Education
  async function deleteEducation(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus riwayat pendidikan ini?')) return;
    
    try {
      const res = await fetch(`/api/admin/education/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast('Riwayat pendidikan berhasil dihapus.', 'success');
        loadDashboardData();
      } else {
        throw new Error(data.error || 'Gagal menghapus riwayat pendidikan.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==========================================
  // 6C. EXPERIENCE CRUD HANDLERS
  // ==========================================
  let isEditingExperience = false;
  let currentEditingExperienceId = null;

  function populateExperienceTable(experience) {
    experienceTableBody.innerHTML = '';
    
    if (experience.length === 0) {
      experienceTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--slate-500); padding: 2rem;">
            Belum ada data pengalaman kerja. Klik "Tambah Pengalaman Baru" untuk menambahkan.
          </td>
        </tr>
      `;
      return;
    }
    
    experience.forEach(exp => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${exp.company}</td>
        <td>${exp.position}</td>
        <td>${exp.period}</td>
        <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${exp.description}
        </td>
        <td style="text-align: center;">
          <button class="btn-action-edit" data-id="${exp.id}" style="margin-right: 0.5rem;"><i data-lucide="edit-2" style="width: 18px; height: 18px;"></i></button>
          <button class="btn-action-delete" data-id="${exp.id}" title="Hapus"><i data-lucide="trash-2" style="width: 18px; height: 18px;"></i></button>
        </td>
      `;
      
      tr.querySelector('.btn-action-edit').addEventListener('click', () => openEditExperienceModal(exp.id));
      tr.querySelector('.btn-action-delete').addEventListener('click', () => deleteExperience(exp.id));
      experienceTableBody.appendChild(tr);
    });
    
    lucide.createIcons();
  }

  // Open Add Experience Modal (Add Mode)
  if (btnAddExperience) {
    btnAddExperience.addEventListener('click', () => {
      isEditingExperience = false;
      currentEditingExperienceId = null;
      experienceFormModal.querySelector('h3').textContent = 'Tambah Pengalaman Kerja';
      experienceFormModal.querySelector('button[type="submit"]').textContent = 'Simpan Pengalaman';
      experienceModalForm.reset();
      experienceFormModal.classList.add('open');
    });
  }

  // Open Edit Experience Modal
  function openEditExperienceModal(id) {
    const exp = globalData.experience.find(e => e.id === id);
    if (!exp) return;

    isEditingExperience = true;
    currentEditingExperienceId = id;
    experienceFormModal.querySelector('h3').textContent = 'Edit Pengalaman Kerja';
    experienceFormModal.querySelector('button[type="submit"]').textContent = 'Perbarui Pengalaman';

    document.getElementById('form-exp-company').value = exp.company;
    document.getElementById('form-exp-position').value = exp.position;
    document.getElementById('form-exp-period').value = exp.period;
    document.getElementById('form-exp-desc').value = exp.description;

    experienceFormModal.classList.add('open');
  }

  // Close Modal
  function closeExperienceModal() {
    experienceFormModal.classList.remove('open');
    experienceModalForm.reset();
  }
  if (experienceModalClose) experienceModalClose.addEventListener('click', closeExperienceModal);
  if (experienceModalCancel) experienceModalCancel.addEventListener('click', closeExperienceModal);

  // Submit Experience Form (Add or Edit)
  if (experienceModalForm) {
    experienceModalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btnSubmit = experienceModalForm.querySelector('button[type="submit"]');
      btnSubmit.disabled = true;
      
      const payload = {
        company: document.getElementById('form-exp-company').value.trim(),
        position: document.getElementById('form-exp-position').value.trim(),
        period: document.getElementById('form-exp-period').value.trim(),
        description: document.getElementById('form-exp-desc').value.trim()
      };

      const url = isEditingExperience ? `/api/admin/experience/${currentEditingExperienceId}` : '/api/admin/experience';
      const method = isEditingExperience ? 'PUT' : 'POST';
      
      try {
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(isEditingExperience ? 'Pengalaman kerja berhasil diperbarui.' : 'Pengalaman kerja berhasil ditambahkan.', 'success');
          closeExperienceModal();
          loadDashboardData();
        } else {
          throw new Error(data.error || 'Gagal menyimpan pengalaman.');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btnSubmit.disabled = false;
      }
    });
  }

  // Delete Experience
  async function deleteExperience(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus pengalaman kerja ini?')) return;
    
    try {
      const res = await fetch(`/api/admin/experience/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast('Pengalaman kerja berhasil dihapus.', 'success');
        loadDashboardData();
      } else {
        throw new Error(data.error || 'Gagal menghapus pengalaman.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==========================================
  // 7. INBOX MESSAGES VIEW HANDLERS
  // ==========================================

  function populateMessagesInbox(messages) {
    messagesList.innerHTML = '';
    
    if (messages.length === 0) {
      messagesCountBadge.style.display = 'none';
      messagesList.innerHTML = '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Kotak masuk kosong. Belum ada pesan baru.</p>';
      return;
    }

    messagesCountBadge.textContent = messages.length;
    messagesCountBadge.style.display = 'inline-block';

    messages.forEach(msg => {
      const msgItem = document.createElement('div');
      msgItem.className = 'message-item';
      msgItem.innerHTML = `
        <div class="message-header">
          <div class="message-sender">
            <h4>${msg.name}</h4>
            <span><i data-lucide="mail" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i> ${msg.email}</span>
          </div>
          <div class="message-meta">
            <span class="message-date">${formatDateWithTime(msg.date)}</span>
          </div>
        </div>
        <div class="message-subject">Subjek: ${msg.subject}</div>
        <div class="message-body">${msg.message}</div>
        <div class="message-footer">
          <button class="btn-action-delete" data-id="${msg.id}" style="font-weight: 600; font-size: 0.85rem;"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i> Hapus Pesan</button>
        </div>
      `;
      
      msgItem.querySelector('.btn-action-delete').addEventListener('click', () => deleteMessage(msg.id));
      messagesList.appendChild(msgItem);
    });
  }

  // Delete Inbox Message
  async function deleteMessage(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus pesan ini?')) return;
    
    try {
      const res = await fetch(`/api/admin/messages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok && data.success) {
        showToast('Pesan berhasil dihapus.', 'success');
        loadDashboardData();
      } else {
        throw new Error(data.error || 'Gagal menghapus pesan.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ==========================================
  // 8. SETTINGS VIEW (Password Change)
  // ==========================================

  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('settings-current-password').value;
    const newPassword = document.getElementById('settings-new-password').value;
    const confirmPassword = document.getElementById('settings-confirm-password').value;

    if (newPassword !== confirmPassword) {
      showToast('Password baru dan Konfirmasi password tidak cocok!', 'error');
      return;
    }

    const btnSubmit = changePasswordForm.querySelector('button[type="submit"]');
    btnSubmit.disabled = true;

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('Password berhasil diperbarui!', 'success');
        changePasswordForm.reset();
      } else {
        throw new Error(data.error || 'Gagal mengganti password.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btnSubmit.disabled = false;
    }
  });

  // ==========================================
  // 9. HELPERS (TOAST, CLOCK, DATE)
  // ==========================================

  // Toast Notification System
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'alert-triangle';

    toast.innerHTML = `
      <i data-lucide="${icon}" style="width: 20px; height: 20px;"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Trigger animation in
    setTimeout(() => toast.classList.add('show'), 50);

    // Fade out and remove
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // Live Clock header
  function startClock() {
    updateClock();
    setInterval(updateClock, 60000);
  }

  function updateClock() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    liveClock.textContent = `${dateStr} | ${hours}:${minutes}`;
  }

  // Date Formatting Indonesian
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateWithTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const dateFormatted = date.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    const timeFormatted = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `${dateFormatted}, ${timeFormatted}`;
  }

  // ==========================================
  // 10. TABS SWITCHING LOGIC
  // ==========================================

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const tabId = item.getAttribute('data-tab');
      
      // Active link toggling
      menuItems.forEach(mi => mi.classList.remove('active'));
      item.classList.add('active');

      // Tab page toggling
      tabPanes.forEach(pane => {
        if (pane.id === tabId) {
          pane.classList.add('active');
        } else {
          pane.classList.remove('active');
        }
      });

      // Update header title based on active tab
      const spanText = item.querySelector('span').textContent;
      tabTitle.textContent = spanText;
    });
  });

  // Keyboard escape triggers to close modal forms
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeProjectModal();
      closeGalleryModal();
      closeCertificateModal();
    }
  });

  // Parallax scrolling untuk background blobs di dashboard
  const blobs = document.querySelectorAll('.dashboard-bg-blobs .blob');
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (blobs.length >= 3) {
      blobs[0].style.transform = `translate(${scrollY * 0.03}px, ${-scrollY * 0.015}px)`;
      blobs[1].style.transform = `translate(${-scrollY * 0.02}px, ${scrollY * 0.02}px)`;
      blobs[2].style.transform = `translate(${scrollY * 0.01}px, ${scrollY * 0.03}px)`;
    }
  });

  // Run Auth handshake checks on page load
  checkAuth();
});
