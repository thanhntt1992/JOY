/**
 * JoyGames HR Portal - Storage & Data Service
 * Xử lý lưu trữ bền vững (LocalStorage), CRUD, tính toán thống kê và kiểm tra tính đầy đủ hồ sơ
 */

const STORAGE_KEY = 'joygames_hr_employees_v1';
const PROJECTS_KEY = 'joygames_hr_projects_v1';
const THEME_KEY = 'joygames_hr_theme';

const HRStorage = {
  // Khởi tạo dữ liệu
  init() {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      this.resetToDefaults();
    }
    if (!localStorage.getItem(PROJECTS_KEY)) {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(JOYGAMES_PROJECTS));
    }
  },

  // ==========================================
  // QUẢN LÝ DỰ ÁN GAME & MÃ DỰ ÁN (PROJECT CODE)
  // ==========================================
  getProjectList() {
    try {
      const raw = localStorage.getItem('joygames_hr_projects_meta_v1');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error loading projects meta', e);
    }
    localStorage.setItem('joygames_hr_projects_meta_v1', JSON.stringify(JOYGAMES_PROJECTS_DATA));
    return JOYGAMES_PROJECTS_DATA;
  },

  getProjectCode(name) {
    if (!name) return 'PRJ';
    const list = this.getProjectList();
    const found = list.find(p => p.name === name || p.code === name);
    if (found && found.code) return found.code;
    // Tự sinh mã từ các chữ cái đầu
    const clean = name.replace(/[()]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    const code = parts.map(w => w[0]).join('').toUpperCase();
    return code || 'PRJ';
  },

  // Lấy danh sách tên toàn bộ các dự án game JoyGames (tương thích ngược)
  getProjects() {
    try {
      const saved = localStorage.getItem(PROJECTS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading projects', e);
    }
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(JOYGAMES_PROJECTS));
    return JOYGAMES_PROJECTS;
  },

  // Thêm tựa game / dự án mới với Mã Dự Án
  addProject(name, code, phase = 'Production (Sprint)') {
    const projects = this.getProjects();
    const trimmedName = name.trim();
    const finalCode = (code || this.getProjectCode(trimmedName)).toUpperCase().trim();

    if (trimmedName && !projects.includes(trimmedName)) {
      projects.push(trimmedName);
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }

    const metaList = this.getProjectList();
    const existingIdx = metaList.findIndex(p => p.code === finalCode || p.name === trimmedName);
    if (existingIdx >= 0) {
      metaList[existingIdx].code = finalCode;
      metaList[existingIdx].phase = phase;
    } else {
      metaList.push({
        code: finalCode,
        name: trimmedName,
        phase: phase || 'Production (Sprint)'
      });
    }
    localStorage.setItem('joygames_hr_projects_meta_v1', JSON.stringify(metaList));

    return { code: finalCode, name: trimmedName, phase };
  },

  // Reset về dữ liệu mẫu JoyGames
  resetToDefaults() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(JOYGAMES_PROJECTS));
    return INITIAL_EMPLOYEES;
  },

  // Lấy toàn bộ danh sách nhân viên
  getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const list = data ? JSON.parse(data) : [];
      return list.map(emp => {
        if (!emp.workType) {
          emp.workType = emp.id === 'JG-0005' ? 'Remote' : (emp.id === 'JG-0012' ? 'Part Time' : 'Full Time');
        }
        if (!emp.company) {
          emp.company = emp.id === 'JG-0006' ? 'JoyPlay Mobile (TP.HCM)' : 'JoyGames Studio (Hà Nội)';
        }
        if (!emp.education) {
          if (emp.level === 'Intern' || emp.id === 'JG-0004') emp.education = 'Cao đẳng';
          else if (emp.id === 'JG-0010') emp.education = 'Trung học phổ thông';
          else if (emp.id === 'JG-0008') emp.education = 'Trung cấp';
          else emp.education = 'Đại học';
        }
        if (!emp.maritalStatus) {
          emp.maritalStatus = ['JG-0001', 'JG-0002', 'JG-0009', 'JG-0006'].includes(emp.id) ? 'Đã có gia đình' : 'Độc thân';
        }
        return emp;
      });
    } catch (e) {
      console.error('Error loading employees:', e);
      return [];
    }
  },

  // Lấy nhân viên theo ID
  getById(id) {
    const list = this.getAll();
    return list.find(emp => emp.id === id) || null;
  },

  // Tự động tạo mã nhân viên tiếp theo: JG-0013, JG-0014,...
  generateNextId() {
    const list = this.getAll();
    let maxNum = 0;
    list.forEach(emp => {
      const match = emp.id.match(/JG-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    const nextNum = maxNum + 1;
    return `JG-${String(nextNum).padStart(4, '0')}`;
  },

  // Lưu hoặc cập nhật nhân viên
  save(employee) {
    const list = this.getAll();
    const existingIndex = list.findIndex(e => e.id === employee.id);

    if (existingIndex >= 0) {
      // Cập nhật
      list[existingIndex] = { ...list[existingIndex], ...employee };
    } else {
      // Tạo mới
      if (!employee.id) {
        employee.id = this.generateNextId();
      }
      if (!employee.documents) employee.documents = [];
      if (!employee.milestones) employee.milestones = [
        { date: employee.joinDate || new Date().toISOString().split('T')[0], title: 'Gia nhập JoyGames', desc: `Vị trí ${employee.position || 'Nhân viên'}` }
      ];
      list.unshift(employee);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return employee;
  },

  // Xóa nhân viên
  delete(id) {
    let list = this.getAll();
    list = list.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  },

  // Điều chuyển / Xoay tua dự án nhân sự và lưu vào lịch sử công tác (Milestones)
  rotateProject(empId, { newProject, rotationType, newRole, reason, startDate }) {
    const list = this.getAll();
    const emp = list.find(e => e.id === empId);
    if (!emp) return false;

    const oldProject = emp.gameProject || 'Chưa gán';
    const effectiveDate = startDate || new Date().toISOString().split('T')[0];

    if (!emp.milestones) emp.milestones = [];
    emp.milestones.unshift({
      date: effectiveDate,
      title: `Điều chuyển dự án: ${oldProject} ➔ ${newProject}`,
      desc: `Hình thức: ${rotationType || 'Chuyển dự án'}. Vai trò mới: ${newRole || emp.position}. Lý do: ${reason || 'Theo kế hoạch sản xuất JoyGames'}`
    });

    emp.gameProject = newProject;
    if (newRole && newRole.trim()) {
      emp.position = newRole.trim();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return emp;
  },

  // Thêm tài liệu số vào hồ sơ
  addDocument(empId, doc) {
    const list = this.getAll();
    const emp = list.find(e => e.id === empId);
    if (!emp) return false;

    if (!emp.documents) emp.documents = [];
    doc.id = 'doc-' + Date.now();
    doc.uploadDate = new Date().toISOString().split('T')[0];
    if (!doc.status) doc.status = 'verified';

    emp.documents.push(doc);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return doc;
  },

  // Xóa tài liệu khỏi hồ sơ
  removeDocument(empId, docId) {
    const list = this.getAll();
    const emp = list.find(e => e.id === empId);
    if (!emp || !emp.documents) return false;

    emp.documents = emp.documents.filter(d => d.id !== docId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return true;
  },

  // Kiểm tra tình trạng hoàn thiện hồ sơ của 1 nhân viên
  checkDocumentStatus(emp) {
    if (!emp || !emp.documents) return { isComplete: false, missing: DOCUMENT_TYPES.filter(t => t.required), count: 0, total: 5 };

    const docTypesPresent = new Set(emp.documents.map(d => d.type));
    const mandatory = DOCUMENT_TYPES.filter(t => t.required);
    const missing = mandatory.filter(m => !docTypesPresent.has(m.key));

    return {
      isComplete: missing.length === 0,
      missing: missing,
      completedCount: mandatory.length - missing.length,
      mandatoryCount: mandatory.length,
      percentage: Math.round(((mandatory.length - missing.length) / mandatory.length) * 100)
    };
  },

  // Thống kê toàn diện hệ thống JoyGames HR
  getStatistics() {
    const list = this.getAll();
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12

    let totalActive = 0;
    let totalProbation = 0;
    let totalIntern = 0;
    let completeDocsCount = 0;
    let missingDocsEmployees = [];
    let expiringContracts = [];
    let birthdays = [];

    const deptMap = {};
    const projectMap = {};

    list.forEach(emp => {
      // Trạng thái làm việc
      if (emp.status === 'Đang làm việc') totalActive++;
      if (emp.status === 'Thử việc' || emp.contractType === 'Thử việc') totalProbation++;
      if (emp.contractType === 'Thực tập sinh' || emp.level === 'Intern') totalIntern++;

      // Phòng ban
      const dept = emp.department || 'Khác';
      deptMap[dept] = (deptMap[dept] || 0) + 1;

      // Dự án Game
      const proj = emp.gameProject || 'Chung';
      projectMap[proj] = (projectMap[proj] || 0) + 1;

      // Kiểm tra hồ sơ tài liệu
      const docCheck = this.checkDocumentStatus(emp);
      if (docCheck.isComplete) {
        completeDocsCount++;
      } else {
        missingDocsEmployees.push({
          id: emp.id,
          fullName: emp.fullName,
          department: emp.department,
          position: emp.position,
          avatar: emp.avatar,
          missing: docCheck.missing,
          percentage: docCheck.percentage
        });
      }

      // Kiểm tra hợp đồng sắp hết hạn (trong vòng 45 ngày)
      if (emp.contractEnd && emp.contractEnd !== 'Không thời hạn') {
        const endDate = new Date(emp.contractEnd);
        const diffTime = endDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 45) {
          expiringContracts.push({
            id: emp.id,
            fullName: emp.fullName,
            department: emp.department,
            contractType: emp.contractType,
            contractEnd: emp.contractEnd,
            daysLeft: diffDays
          });
        }
      }

      // Sinh nhật trong tháng
      if (emp.birthDate) {
        const bDate = new Date(emp.birthDate);
        if (bDate.getMonth() + 1 === currentMonth) {
          birthdays.push({
            id: emp.id,
            fullName: emp.fullName,
            birthDate: emp.birthDate,
            day: bDate.getDate(),
            department: emp.department,
            avatar: emp.avatar
          });
        }
      }
    });

    birthdays.sort((a, b) => a.day - b.day);
    expiringContracts.sort((a, b) => a.daysLeft - b.daysLeft);

    const docCompletenessRate = list.length > 0 ? Math.round((completeDocsCount / list.length) * 100) : 0;

    return {
      total: list.length,
      active: totalActive,
      probation: totalProbation,
      intern: totalIntern,
      docCompletenessRate,
      completeDocsCount,
      missingDocsEmployees,
      expiringContracts,
      birthdays,
      currentMonth,
      byDepartment: deptMap,
      byProject: projectMap
    };
  },

  // Xuất file JSON sao lưu
  exportBackupJSON() {
    const list = this.getAll();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(list, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `JoyGames_HR_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },

  // Nhập dữ liệu từ file JSON
  importBackupJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return { success: true, count: parsed.length };
      }
      return { success: false, error: 'Dữ liệu không phải là danh sách nhân sự hợp lệ' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  // Xuất file CSV danh sách nhân viên JoyGames
  exportToCSV() {
    const list = this.getAll();
    if (!list.length) return;

    const headers = [
      'Mã NV', 'Họ Và Tên', 'Giới Tính', 'Ngày Sinh', 'Số Điện Thoại',
      'Email Công Ty', 'Số CCCD', 'Phòng Ban', 'Chức Vụ', 'Cấp Bậc',
      'Dự Án Phụ Trách', 'Ngày Vào Làm', 'Loại Hợp Đồng', 'Mức Lương (VNĐ)', 'Trạng Thái'
    ];

    const rows = list.map(e => [
      `"${e.id}"`,
      `"${e.fullName}"`,
      `"${e.gender}"`,
      `"${e.birthDate}"`,
      `"${e.phone}"`,
      `"${e.workEmail}"`,
      `"'${e.idCard}"`, // Force text
      `"${e.department}"`,
      `"${e.position}"`,
      `"${e.level}"`,
      `"${e.gameProject}"`,
      `"${e.joinDate}"`,
      `"${e.contractType}"`,
      `"${e.baseSalary || 0}"`,
      `"${e.status}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `DanhSachNhanSu_JoyGames_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  // ================================================================
  // TELEGRAM 2FA & AUTH CONFIGURATION
  // ================================================================
  getTelegramConfig() {
    const raw = localStorage.getItem('joygames_hr_telegram_cfg');
    if (!raw) return { botToken: '', chatId: '' };
    try {
      return JSON.parse(raw);
    } catch (e) {
      return { botToken: '', chatId: '' };
    }
  },

  saveTelegramConfig(cfg) {
    localStorage.setItem('joygames_hr_telegram_cfg', JSON.stringify(cfg));
  },

  isAuthenticated() {
    const raw = sessionStorage.getItem('joygames_hr_auth_session');
    if (!raw) return false;
    try {
      const sess = JSON.parse(raw);
      return !!(sess && sess.token);
    } catch (e) {
      return false;
    }
  },

  getSession() {
    const raw = sessionStorage.getItem('joygames_hr_auth_session');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  setSession(email, token) {
    const sess = {
      email: email || 'hr@joygames.vn',
      token: token || 'session-' + Date.now(),
      loginAt: new Date().toISOString()
    };
    sessionStorage.setItem('joygames_hr_auth_session', JSON.stringify(sess));
    return sess;
  },

  clearSession() {
    sessionStorage.removeItem('joygames_hr_auth_session');
  }
};

// Khởi chạy lưu trữ ban đầu
HRStorage.init();

