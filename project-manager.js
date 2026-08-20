/* ============================================
   Fire Executive Pro - Project Manager
   مدیریت پروژه‌های جداگانه
   ============================================ */

const PROJECT_STORAGE_KEY = 'fireexec_projects';
const ACTIVE_PROJECT_KEY = 'fireexec_active_project';

// ─── ساختار پروژه ──
function createProject(name) {
  return {
    id: 'proj_' + Date.now(),
    name: name || 'پروژه بدون نام',
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    data: {
      calculations: {},
      ncrs: [],
      checklists: {},
      notes: '',
      photos: []
    }
  };
}

// ─── دریافت همه پروژه‌ها ───
function getAllProjects() {
  try {
    const saved = localStorage.getItem(PROJECT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('خطا در خواندن پروژه‌ها:', e);
    return [];
  }
}

// ─── ذخیره همه پروژه‌ها ──
function saveAllProjects(projects) {
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(projects));
}

// ─── پروژه فعال ───
function getActiveProjectId() {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

function setActiveProjectId(id) {
  localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

function getActiveProject() {
  const id = getActiveProjectId();
  if (!id) return null;
  const projects = getAllProjects();
  return projects.find(p => p.id === id) || null;
}

// ── ساخت پروژه جدید ───
function createNewProject(name) {
  const projects = getAllProjects();
  const newProject = createProject(name);
  projects.push(newProject);
  saveAllProjects(projects);
  setActiveProjectId(newProject.id);
  console.log('✅ پروژه جدید ساخته شد:', newProject.name);
  return newProject;
}

// ─── حذف پروژه ───
function deleteProject(id) {
  let projects = getAllProjects();
  projects = projects.filter(p => p.id !== id);
  saveAllProjects(projects);
  
  const activeId = getActiveProjectId();
  if (activeId === id) {
    if (projects.length > 0) {
      setActiveProjectId(projects[0].id);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }
  console.log('🗑 پروژه حذف شد');
}

// ─── تغییر نام پروژه ───
function renameProject(id, newName) {
  const projects = getAllProjects();
  const project = projects.find(p => p.id === id);
  if (project) {
    project.name = newName;
    project.lastModified = new Date().toISOString();
    saveAllProjects(projects);
    console.log('✏️ نام پروژه تغییر کرد:', newName);
  }
}

// ─── ذخیره داده در پروژه فعال ──
function saveToActiveProject(key, value) {
  const project = getActiveProject();
  if (!project) {
    console.warn('⚠️ پروژه فعال وجود ندارد');
    return;
  }
  project.data[key] = value;
  project.lastModified = new Date().toISOString();
  
  const projects = getAllProjects();
  const index = projects.findIndex(p => p.id === project.id);
  if (index !== -1) {
    projects[index] = project;
    saveAllProjects(projects);
  }
}

// ─── خواندن داده از پروژه فعال ───
function loadFromActiveProject(key) {
  const project = getActiveProject();
  if (!project) return null;
  return project.data[key] || null;
}

// ─── سوییچ بین پروژه‌ها ───
function switchProject(id) {
  setActiveProjectId(id);
  console.log('🔄 پروژه تغییر کرد به:', getActiveProject()?.name);
  // رفرش UI
  if (window.renderProjectList) window.renderProjectList();
  if (window.loadProjectData) window.loadProjectData();
}

// ─── نمایش لیست پروژه‌ها در UI ───
window.renderProjectList = function() {
  const container = document.getElementById('projectListContainer');
  if (!container) return;
  
  const projects = getAllProjects();
  const activeId = getActiveProjectId();
  
  if (projects.length === 0) {
    container.innerHTML = '<p style="color:#6b7280;text-align:center;padding:20px;">هنوز پروژه‌ای نساخته‌اید</p>';
    return;
  }
  
  let html = '';
  projects.forEach(project => {
    const isActive = project.id === activeId;
    const date = new Date(project.lastModified).toLocaleDateString('fa-IR');
    html += `
      <div class="project-item ${isActive ? 'active' : ''}" data-id="${project.id}">
        <div class="project-info">
          <div class="project-name">${project.name}</div>
          <div class="project-date">${date}</div>
        </div>
        <div class="project-actions">
          ${!isActive ? `<button onclick="switchProject('${project.id}')" class="btn-switch">انتخاب</button>` : '<span class="badge-active">فعال</span>'}
          <button onclick="renameProjectPrompt('${project.id}')" class="btn-edit">✏️</button>
          <button onclick="deleteProjectPrompt('${project.id}')" class="btn-delete">🗑</button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
};

// ─── تغییر نام با prompt ───
window.renameProjectPrompt = function(id) {
  const projects = getAllProjects();
  const project = projects.find(p => p.id === id);
  if (!project) return;
  
  const newName = prompt('نام جدید پروژه:', project.name);
  if (newName && newName.trim()) {
    renameProject(id, newName.trim());
    window.renderProjectList();
  }
};

// ─── حذف با تأیید ───
window.deleteProjectPrompt = function(id) {
  const projects = getAllProjects();
  const project = projects.find(p => p.id === id);
  if (!project) return;
  
  if (confirm(`آیا از حذف پروژه "${project.name}" مطمئن هستید؟\nاین عمل قابل بازگشت نیست.`)) {
    deleteProject(id);
    window.renderProjectList();
    if (window.loadProjectData) window.loadProjectData();
  }
};

// ─── ساخت پروژه جدید از UI ───
window.createNewProjectFromUI = function() {
  const name = prompt('نام پروژه جدید را وارد کنید:');
  if (name && name.trim()) {
    createNewProject(name.trim());
    window.renderProjectList();
    if (window.loadProjectData) window.loadProjectData();
  }
};

// ─── بارگذاری داده‌های پروژه در UI ───
window.loadProjectData = function() {
  const project = getActiveProject();
  if (!project) {
    console.log('️ پروژه فعال وجود ندارد');
    return;
  }
  
  console.log(' بارگذاری داده‌های پروژه:', project.name);
  
  // بارگذاری محاسبات
  if (project.data.calculations) {
    Object.keys(project.data.calculations).forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = project.data.calculations[id];
    });
  }
  
  // به‌روزرسانی نام پروژه در هدر
  const projectNameEl = document.getElementById('activeProjectName');
  if (projectNameEl) {
    projectNameEl.textContent = project.name;
  }
};

// ─── ذخیره خودکار محاسبات ───
window.saveCalculationsToProject = function() {
  const project = getActiveProject();
  if (!project) return;
  
  const calculations = {};
  document.querySelectorAll('input[type="number"], input[type="text"], select').forEach(input => {
    if (input.id) {
      calculations[input.id] = input.value;
    }
  });
  
  saveToActiveProject('calculations', calculations);
};

// ─── راه‌اندازی اولیه ───
window.addEventListener('load', () => {
  // اگر پروژه‌ای وجود ندارد، یکی پیش‌فرض بساز
  const projects = getAllProjects();
  if (projects.length === 0) {
    createNewProject('پروژه پیش‌فرض');
  }
  
  // رندر لیست پروژه‌ها
  window.renderProjectList();
  
  // بارگذاری داده‌های پروژه فعال
  window.loadProjectData();
  
  // ذخیره خودکار بعد از هر تغییر
  document.addEventListener('input', () => {
    clearTimeout(window._saveTimeout);
    window._saveTimeout = setTimeout(() => {
      window.saveCalculationsToProject();
    }, 1000);
  });
  
  console.log('✅ Project Manager آماده است');
});