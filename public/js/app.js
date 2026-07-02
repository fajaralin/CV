document.addEventListener('DOMContentLoaded', () => {
  // Force scroll to top on refresh
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  // Render icon Lucide segera saat halaman dimuat (sebelum data API selesai)
  if (window.lucide) lucide.createIcons();

  // Global Data Store
  let cvData = {
    personalInfo: {},
    projects: [],
    gallery: [],
    certificates: []
  };

  // State for Lightbox
  let currentLightboxItems = [];
  let currentLightboxIndex = 0;

  const pdfIconSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="%23ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><text x="7" y="16" fill="%23ef4444" font-family="system-ui, -apple-system, sans-serif" font-size="5" font-weight="bold">PDF</text></svg>`;

  // DOM Elements
  // Path identification (Home vs Dedicated Pages)
  const isMainPage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname === '';

  const navbar = document.getElementById('navbar');
  const navLinks = document.querySelectorAll('.nav-link');
  const mobileToggle = document.getElementById('mobile-toggle');
  const mobileClose = document.getElementById('mobile-close');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileMenuLinks = document.querySelectorAll('.mobile-link');

  // Contact Form Elements
  const contactForm = document.getElementById('contact-form');
  const btnSubmitContact = document.getElementById('btn-submit-contact');
  const formResponseMsg = document.getElementById('form-response-msg');

  // Modal Elements
  const projectModal = document.getElementById('project-modal');
  const modalClose = document.getElementById('modal-close');

  // Lightbox Elements
  const lightbox = document.getElementById('lightbox');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxDesc = document.getElementById('lightbox-desc');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  // ==========================================
  // 1. FETCH & RENDER DATA
  // ==========================================

  async function loadCVData() {
    // 1. Ambil data dari cache lokal (Stale-While-Revalidate - instant load 0ms)
    const cachedData = localStorage.getItem('cv_data_cache');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        cvData = parsed;
        
        renderPersonalInfo(cvData.personalInfo);
        renderProjects(cvData.projects);
        renderGallery(cvData.gallery);
        renderCertificates(cvData.certificates);
        renderEducation(cvData.education);
        renderExperience(cvData.experience);
        
        if (window.lucide) lucide.createIcons();
        setupScrollReveal();
      } catch (err) {
        console.error('Failed to parse cached CV data:', err);
      }
    }

    // 2. Fetch data terbaru di latar belakang untuk memperbarui cache
    try {
      const response = await fetch('/api/cv');
      if (!response.ok) throw new Error('Gagal mengambil data dari server.');
      
      const newData = await response.json();
      const stringifiedNewData = JSON.stringify(newData);
      
      // Bandingkan dengan data cache. Jika ada perbedaan atau cache kosong, render ulang secara halus
      if (stringifiedNewData !== cachedData) {
        cvData = newData;
        try {
          localStorage.setItem('cv_data_cache', stringifiedNewData);
        } catch (e) {
          console.warn('Storage quota exceeded, caching skipped:', e);
        }
        
        renderPersonalInfo(cvData.personalInfo);
        renderProjects(cvData.projects);
        renderGallery(cvData.gallery);
        renderCertificates(cvData.certificates);
        renderEducation(cvData.education);
        renderExperience(cvData.experience);
        
        if (window.lucide) lucide.createIcons();
        setupScrollReveal();
      }
    } catch (error) {
      console.error('Error loading/revalidating CV data:', error);
    }
  }

  // Render Personal Info
  function renderPersonalInfo(info) {
    if (!info) return;

    // Judul & Teks Utama
    document.title = `${info.name} | Portofolio CV & Galeri`;
    
    const heroName = document.getElementById('hero-name');
    if (heroName) heroName.textContent = info.name;
    
    const footerName = document.getElementById('footer-name');
    if (footerName) footerName.textContent = info.name;
    
    const heroTitle = document.getElementById('hero-title');
    if (heroTitle) heroTitle.textContent = info.title;
    
    const heroBio = document.getElementById('hero-bio');
    if (heroBio) heroBio.textContent = info.bio;
    
    const aboutBio = document.getElementById('about-bio');
    if (aboutBio) aboutBio.textContent = info.bio;

    // Avatar Gambar
    const avatarEl = document.getElementById('hero-avatar');
    if (avatarEl && info.avatar) {
      avatarEl.src = info.avatar;
      avatarEl.alt = `Foto Profil ${info.name}`;
    }

    // Detail Kontak
    const emailEl = document.getElementById('about-email');
    if (emailEl) {
      emailEl.textContent = info.email;
      emailEl.href = `mailto:${info.email}`;
    }
    
    const aboutPhone = document.getElementById('about-phone');
    if (aboutPhone) aboutPhone.textContent = info.phone;
    
    const aboutLocation = document.getElementById('about-location');
    if (aboutLocation) aboutLocation.textContent = info.location;
    
    const contactEmail = document.getElementById('contact-card-email');
    if (contactEmail) contactEmail.textContent = info.email;
    
    const contactPhone = document.getElementById('contact-card-phone');
    if (contactPhone) contactPhone.textContent = info.phone;
    
    const contactLocation = document.getElementById('contact-card-location');
    if (contactLocation) contactLocation.textContent = info.location;

    // Media Sosial (About section)
    if (info.socials) {
      const githubBtn = document.getElementById('social-github');
      const linkedinBtn = document.getElementById('social-linkedin');
      const instagramBtn = document.getElementById('social-instagram');

      if (githubBtn) {
        if (info.socials.github) { githubBtn.href = info.socials.github; githubBtn.style.display = 'flex'; } else { githubBtn.style.display = 'none'; }
      }
      if (linkedinBtn) {
        if (info.socials.linkedin) { linkedinBtn.href = info.socials.linkedin; linkedinBtn.style.display = 'flex'; } else { linkedinBtn.style.display = 'none'; }
      }
      if (instagramBtn) {
        if (info.socials.instagram) { instagramBtn.href = info.socials.instagram; instagramBtn.style.display = 'flex'; } else { instagramBtn.style.display = 'none'; }
      }

      // Footer social links (mirror)
      const fGithub = document.getElementById('footer-social-github');
      const fLinkedin = document.getElementById('footer-social-linkedin');
      const fInstagram = document.getElementById('footer-social-instagram');
      if (fGithub && info.socials.github) fGithub.href = info.socials.github;
      if (fLinkedin && info.socials.linkedin) fLinkedin.href = info.socials.linkedin;
      if (fInstagram && info.socials.instagram) fInstagram.href = info.socials.instagram;
    }

    // Footer contact info
    const fEmailLink = document.getElementById('footer-email-link');
    if (fEmailLink) { fEmailLink.href = `mailto:${info.email}`; fEmailLink.textContent = info.email; }
    const fPhone = document.getElementById('footer-phone-text');
    if (fPhone) fPhone.textContent = info.phone;
    const fLocation = document.getElementById('footer-location-text');
    if (fLocation) fLocation.textContent = info.location;

    // Auto copyright year
    const footerYear = document.getElementById('footer-year');
    if (footerYear) footerYear.textContent = new Date().getFullYear();

    // Render Tag Keterampilan
    const skillsContainer = document.getElementById('skills-container');
    if (skillsContainer) {
      skillsContainer.innerHTML = '';
      if (info.skills && info.skills.length > 0) {
        info.skills.forEach(skill => {
          const tag = document.createElement('span');
          tag.className = 'skill-tag';
          tag.textContent = skill;
          skillsContainer.appendChild(tag);
        });
      }
    }
  }

  // Render Projects & Filter Categories
  function renderProjects(projects) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const itemsToRender = isMainPage ? projects.filter(p => p.showOnMain !== false) : projects;

    if (!itemsToRender || itemsToRender.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Belum ada proyek yang ditambahkan.</p>';
      return;
    }

    // Kumpulkan kategori proyek unik untuk filter
    const categories = new Set();
    itemsToRender.forEach(p => {
      if (p.category) categories.add(p.category);
    });

    // Render tombol filter dinamis
    const dynamicFilters = document.getElementById('dynamic-filters');
    if (dynamicFilters) {
      dynamicFilters.innerHTML = '';
      categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.setAttribute('data-filter', cat);
        btn.textContent = cat;
        dynamicFilters.appendChild(btn);
      });

      // Pasang event listener ke filter buttons
      const filterButtons = document.querySelectorAll('.filter-btn');
      filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          filterButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const filterValue = btn.getAttribute('data-filter');
          filterProjects(filterValue);
        });
      });
    }

    // Render proyek ke grid
    itemsToRender.forEach(proj => {
      const card = document.createElement('div');
      card.className = 'project-card reveal-card-3d';
      card.setAttribute('data-category', proj.category || 'General');
      card.id = proj.id;

      card.innerHTML = `
        <div class="project-img-wrapper">
          <img src="${proj.image || '/uploads/default-project.png'}" alt="${proj.title}" class="project-img" loading="lazy">
        </div>
        <div class="project-info">
          <span class="project-category">${proj.category || 'General'}</span>
          <h3 class="project-title">${proj.title}</h3>
          <p class="project-desc">${proj.description}</p>
          <div class="project-tech">Tech: ${proj.tech || 'Tidak ditentukan'}</div>
          <div class="project-card-footer">
            <button class="btn-card-details" data-id="${proj.id}">
              <span>Detail Selengkapnya</span>
              <i data-lucide="arrow-up-right" style="width: 16px; height: 16px;"></i>
            </button>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });

    // Handler Detail Proyek
    const detailButtons = grid.querySelectorAll('.btn-card-details');
    detailButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        openProjectModal(id);
      });
    });
  }

  // Filter Projects Logic
  function filterProjects(category) {
    const cards = document.querySelectorAll('.project-card');
    cards.forEach(card => {
      const cardCat = card.getAttribute('data-category');
      
      // Hapus kelas entri agar bisa teranimasi lagi
      card.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      
      setTimeout(() => {
        if (category === 'all' || cardCat === category) {
          card.style.display = 'flex';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, 50);
        } else {
          card.style.display = 'none';
        }
      }, 200);
    });
  }

  // Render Gallery Items
  function renderGallery(galleryItems) {
    const grid = document.getElementById('gallery-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const itemsToRender = isMainPage ? galleryItems.filter(g => g.showOnMain !== false) : galleryItems;

    if (!itemsToRender || itemsToRender.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Belum ada foto galeri.</p>';
      return;
    }

    itemsToRender.forEach(item => {
      const wrapper = document.createElement('div');
      wrapper.className = 'gallery-item reveal-card-3d';
      wrapper.id = item.id;

      wrapper.innerHTML = `
        <img src="${item.image}" alt="${item.title}" class="gallery-img" loading="lazy">
        <div class="gallery-overlay">
          <h4 class="gallery-item-title">${item.title}</h4>
          <span class="gallery-item-category">${item.category || 'Galeri'}</span>
        </div>
      `;

      // Event click untuk membuka Lightbox
      wrapper.addEventListener('click', () => {
        openLightbox(itemsToRender, item.id);
      });

      grid.appendChild(wrapper);
    });
  }

  // Render Certificates Items
  function renderCertificates(certs) {
    const grid = document.getElementById('certificates-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // Urutkan sertifikat: Unggulan (starred) pertama, kemudian berdasarkan tanggal terbaru
    const sorted = [...certs].sort((a, b) => {
      const aFeatured = a.showOnMain !== false;
      const bFeatured = b.showOnMain !== false;
      if (aFeatured && !bFeatured) return -1;
      if (!aFeatured && bFeatured) return 1;
      return new Date(b.date || 0) - new Date(a.date || 0);
    });

    let itemsToRender = isMainPage ? sorted.filter(c => c.showOnMain !== false) : sorted;
    if (isMainPage) {
      itemsToRender = itemsToRender.slice(0, 6);
    }

    if (!itemsToRender || itemsToRender.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">Belum ada sertifikat.</p>';
      return;
    }

    itemsToRender.forEach(cert => {
      const card = document.createElement('div');
      card.className = 'certificate-card reveal-card-3d';
      card.id = cert.id;

      const isOldPdf = cert.image && cert.image.toLowerCase().endsWith('.pdf');
      const pdfLink = cert.pdf || (isOldPdf ? cert.image : '');

      card.innerHTML = `
        <div class="cert-img-wrapper">
          ${isOldPdf ? `
            <div class="cert-pdf-placeholder" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.05); padding: 1.5rem;">
              <img src="${pdfIconSvg}" style="width: 64px; height: 64px; margin-bottom: 0.5rem;" alt="PDF Icon">
              <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-primary); text-align: center;">Dokumen PDF</span>
            </div>
          ` : `
            <img src="${cert.image || '/uploads/default-certificate.png'}" alt="${cert.title}" class="cert-img" loading="lazy">
          `}
          <div class="cert-hover-hint">
            <i data-lucide="${pdfLink ? 'external-link' : 'zoom-in'}" style="width: 20px; height: 20px; margin-right: 0.5rem;"></i> ${pdfLink ? 'Buka PDF' : 'Perbesar Sertifikat'}
          </div>
        </div>
        <div class="cert-info">
          <h3 class="cert-title">${cert.title}</h3>
          <span class="cert-issuer" style="display: flex; align-items: center; gap: 0.5rem;">
            ${cert.issuerLogo ? `<img src="${cert.issuerLogo}" style="width: 18px; height: 18px; object-fit: contain; border-radius: 4px;" alt="Logo Penerbit">` : ''}
            <span>${cert.issuer}</span>
          </span>
          <span class="cert-date">Diterbitkan: ${formatDate(cert.date)}</span>
          ${cert.link ? `
            <a href="${cert.link}" target="_blank" class="btn-cert-link">
              <span>Verifikasi Kredensial</span>
              <i data-lucide="external-link" style="width: 14px; height: 14px;"></i>
            </a>
          ` : ''}
        </div>
      `;

      // Event click gambar sertifikat untuk membuka Lightbox atau PDF
      card.querySelector('.cert-img-wrapper').addEventListener('click', () => {
        if (pdfLink) {
          window.open(pdfLink, '_blank');
        } else {
          // Hanya tampilkan gambar di lightbox (yang tidak punya pdf/pdfLink)
          const imageOnlyItems = itemsToRender.filter(item => {
            const hasPdf = item.pdf || (item.image && item.image.toLowerCase().endsWith('.pdf'));
            return !hasPdf;
          });
          openLightbox(imageOnlyItems, cert.id);
        }
      });

      grid.appendChild(card);
    });
  }

  // Render Education Items
  function renderEducation(education) {
    const container = document.getElementById('education-container');
    if (!container) return;
    container.innerHTML = '';

    if (!education || education.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Belum ada riwayat pendidikan.</p>';
      return;
    }

    education.forEach((edu) => {
      const item = document.createElement('div');
      item.className = 'education-item';
      item.innerHTML = `
        <div class="education-header-info">
          <span class="education-period">${edu.period}</span>
          <h4 class="education-school">${edu.school}</h4>
        </div>
        <h5 class="education-degree">${edu.degree}</h5>
        <p class="education-desc">${edu.description}</p>
      `;
      container.appendChild(item);
    });
  }

  // Render Experience Items
  function renderExperience(experience) {
    const container = document.getElementById('experience-container');
    if (!container) return;
    container.innerHTML = '';

    if (!experience || experience.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Belum ada riwayat pengalaman kerja.</p>';
      return;
    }

    experience.forEach((exp) => {
      const item = document.createElement('div');
      item.className = 'experience-item';
      item.innerHTML = `
        <div class="experience-header-info">
          <span class="experience-period">${exp.period}</span>
          <h4 class="experience-company">${exp.company}</h4>
        </div>
        <h5 class="experience-position">${exp.position}</h5>
        <p class="experience-desc">${exp.description}</p>
      `;
      container.appendChild(item);
    });
  }

  // Helper formatting tanggal
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ==========================================
  // 2. INTERACTIVE MODAL (Proyek)
  // ==========================================

  function openProjectModal(projectId) {
    const proj = cvData.projects.find(p => p.id === projectId);
    if (!proj) return;

    document.getElementById('modal-project-img').src = proj.image || '/uploads/default-project.png';
    document.getElementById('modal-project-category').textContent = proj.category || 'General';
    document.getElementById('modal-project-title').textContent = proj.title;
    document.getElementById('modal-project-desc').textContent = proj.description;
    document.getElementById('modal-project-tech').textContent = proj.tech || 'Tidak ditentukan';

    const linkBtn = document.getElementById('modal-project-link');
    if (proj.link) {
      linkBtn.href = proj.link;
      linkBtn.style.display = 'inline-flex';
    } else {
      linkBtn.style.display = 'none';
    }

    projectModal.classList.add('open');
    document.body.style.overflow = 'hidden'; // Kunci scroll
  }

  function closeProjectModal() {
    projectModal.classList.remove('open');
    document.body.style.overflow = ''; // Aktifkan scroll
  }

  if (modalClose && projectModal) {
    modalClose.addEventListener('click', closeProjectModal);
    projectModal.addEventListener('click', (e) => {
      if (e.target === projectModal) closeProjectModal();
    });
  }

  // ==========================================
  // 3. IMAGE LIGHTBOX (Galeri & Sertifikat)
  // ==========================================

  function openLightbox(itemList, activeId) {
    currentLightboxItems = itemList.map(item => ({
      image: item.image,
      title: item.title,
      desc: item.description || item.issuer || ''
    }));
    
    // Cari index aktif
    currentLightboxIndex = itemList.findIndex(item => item.id === activeId);
    if (currentLightboxIndex === -1) currentLightboxIndex = 0;

    updateLightboxContent();
    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function updateLightboxContent() {
    const item = currentLightboxItems[currentLightboxIndex];
    if (!item) return;

    // Set transition class
    lightboxImg.style.opacity = '0';
    lightboxImg.style.transform = 'scale(0.95)';

    setTimeout(() => {
      lightboxImg.src = item.image;
      lightboxTitle.textContent = item.title;
      lightboxDesc.textContent = item.desc;
      lightboxImg.style.opacity = '1';
      lightboxImg.style.transform = 'scale(1)';
    }, 150);

    // Sembunyikan navigasi jika hanya ada 1 item
    if (currentLightboxItems.length <= 1) {
      lightboxPrev.style.display = 'none';
      lightboxNext.style.display = 'none';
    } else {
      lightboxPrev.style.display = 'flex';
      lightboxNext.style.display = 'flex';
    }
  }

  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showPrevLightbox() {
    currentLightboxIndex = (currentLightboxIndex - 1 + currentLightboxItems.length) % currentLightboxItems.length;
    updateLightboxContent();
  }

  function showNextLightbox() {
    currentLightboxIndex = (currentLightboxIndex + 1) % currentLightboxItems.length;
    updateLightboxContent();
  }

  if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', (e) => { e.stopPropagation(); showPrevLightbox(); });
  if (lightboxNext) lightboxNext.addEventListener('click', (e) => { e.stopPropagation(); showNextLightbox(); });
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-container')) {
        closeLightbox();
      }
    });
  }

  // Keyboard navigation untuk Lightbox & Modal
  document.addEventListener('keydown', (e) => {
    if (lightbox && lightbox.classList.contains('open')) {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrevLightbox();
      if (e.key === 'ArrowRight') showNextLightbox();
    } else if (projectModal && projectModal.classList.contains('open')) {
      if (e.key === 'Escape') closeProjectModal();
    }
  });

  // ==========================================
  // 4. ANIMASI ENTRY SCROLL & SCROLL HIGHLIGHT
  // ==========================================

  function setupScrollReveal() {
    if (!isMainPage) {
      // Force all elements to be visible immediately on subpages to prevent empty screens
      document.querySelectorAll('.reveal-left, .reveal-right, .reveal-fade, .reveal-card-3d, .reveal-scale, .project-card, .gallery-item, .certificate-card, .skill-tag').forEach(el => {
        el.classList.add('visible');
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    // 1. Reveal elemen individual (about panel, contact info, dsb)
    const revealElements = document.querySelectorAll('.reveal-left, .reveal-right, .reveal-fade');
    
    const observerOptions = {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Cukup dianimasikan sekali saja
        }
      });
    }, observerOptions);

    revealElements.forEach(el => {
      revealObserver.observe(el);
    });

    // 2. Reveal kontainer grid secara berurutan (staggered delay)
    const gridContainers = document.querySelectorAll('.projects-grid, .gallery-grid, .certificates-grid, .skills-tags-container, .about-contact-cards');
    
    const gridObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const container = entry.target;
          const items = container.querySelectorAll('.project-card, .gallery-item, .certificate-card, .skill-tag, .about-contact-item');
          items.forEach((item, index) => {
            // Berikan jeda waktu (delay) berurutan ke setiap elemen anak
            item.style.transitionDelay = `${index * 80}ms`;
            item.classList.add('visible');
          });
          observer.unobserve(container); // Cukup pantau sekali saja
        }
      });
    }, { root: null, threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

    gridContainers.forEach(grid => {
      gridObserver.observe(grid);
    });
  }

  // Smooth scroll active links highlight & progress bar
  const sections = document.querySelectorAll('section');
  const scrollProgress = document.getElementById('scroll-progress');
  
  window.addEventListener('scroll', () => {
    // Update progress bar width
    if (scrollProgress) {
      const windowScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (windowScroll / height) * 100 : 0;
      scrollProgress.style.width = scrolled + '%';
    }

    let currentSection = '';
    const scrollPosition = window.scrollY + 100;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        currentSection = section.getAttribute('id');
      }
    });

    if (isMainPage && navLinks) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        const hrefAttr = link.getAttribute('href');
        if (hrefAttr && hrefAttr.startsWith('#')) {
          if (hrefAttr.substring(1) === currentSection) {
            link.classList.add('active');
          }
        }
      });
    }

    // Menurunkan tinggi navbar saat scroll
    if (navbar) {
      if (window.scrollY > 50 || !isMainPage) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    }
  });

  // ==========================================
  // 5. NAV MOBILE TOGGLE
  // ==========================================

  if (mobileToggle && mobileMenu) {
    mobileToggle.addEventListener('click', () => {
      mobileMenu.classList.add('open');
    });
  }

  if (mobileClose && mobileMenu) {
    mobileClose.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
    });
  }

  if (mobileMenuLinks && mobileMenu) {
    mobileMenuLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
      });
    });
  }

  // ==========================================
  // 6. CONTACT FORM SUBMISSION
  // ==========================================

  if (contactForm && btnSubmitContact && formResponseMsg) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('form-name').value;
      const email = document.getElementById('form-email').value;
      const subject = document.getElementById('form-subject').value;
      const message = document.getElementById('form-message').value;

      // Reset feedback
      formResponseMsg.style.display = 'none';
      formResponseMsg.className = 'form-response-msg';
      
      // UI state loading
      btnSubmitContact.disabled = true;
      const originalBtnText = btnSubmitContact.innerHTML;
      btnSubmitContact.innerHTML = '<span>Mengirim Pesan...</span><i class="lucide-loader animate-spin"></i>';
      lucide.createIcons();

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ name, email, subject, message })
        });

        const result = await response.json();

        if (response.ok) {
          formResponseMsg.textContent = result.message;
          formResponseMsg.classList.add('success');
          contactForm.reset();
        } else {
          throw new Error(result.error || 'Terjadi kesalahan saat mengirim.');
        }
      } catch (error) {
        formResponseMsg.textContent = error.message;
        formResponseMsg.classList.add('error');
      } finally {
        btnSubmitContact.disabled = false;
        btnSubmitContact.innerHTML = originalBtnText;
        lucide.createIcons();
      }
    });
  }

  // 3D Tilt Card and Blob Parallax
  function init3DTiltAndParallax() {
    // 3D Tilt effect
    const tiltCards = document.querySelectorAll('.about-info-card, .about-skills-card');
    tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const xc = rect.width / 2;
        const yc = rect.height / 2;
        
        // Tilt rotation: max 6 degrees
        const angleX = ((yc - y) / yc) * 6;
        const angleY = ((x - xc) / xc) * 6;
        
        card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) translateY(-8px)`;
        card.style.transition = 'transform 0.1s ease-out, box-shadow 0.3s ease';
        
        // Shine layer overlay mapping
        const shine = card.querySelector('.card-shine');
        if (shine) {
          const percentX = (x / rect.width) * 100;
          const percentY = (y / rect.height) * 100;
          shine.style.opacity = '1';
          shine.style.background = `radial-gradient(circle at ${percentX}% ${percentY}%, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 70%)`;
        }
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)';
        card.style.transition = 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.5s ease';
        
        const shine = card.querySelector('.card-shine');
        if (shine) {
          shine.style.opacity = '0';
        }
      });
    });

    // Blob scroll parallax
    const blobs = document.querySelectorAll('.blob');
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      if (blobs.length >= 4) {
        blobs[0].style.transform = `translate(${scrollY * 0.04}px, ${-scrollY * 0.02}px)`;
        blobs[1].style.transform = `translate(${-scrollY * 0.03}px, ${scrollY * 0.03}px)`;
        blobs[2].style.transform = `translate(${scrollY * 0.02}px, ${scrollY * 0.04}px)`;
        blobs[3].style.transform = `translate(${-scrollY * 0.025}px, ${-scrollY * 0.03}px)`;
      }
    });
  }

  // Inisialisasi Tilt & Parallax
  init3DTiltAndParallax();

  // Jalankan Aplikasi
  loadCVData();
});
