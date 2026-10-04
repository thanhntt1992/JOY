/**
 * JoyGames HR Portal - Application Controller
 * Quản lý giao diện, bộ lọc đa tiêu chí, tra cứu chuyên sâu, modal 360° và kho tài liệu số
 */

const JoyApp = {
  currentPage: 'dashboard',
  viewMode: 'card', // 'card' hoặc 'table'
  filterPill: 'all',
  currentEmployeeId: null,
  activeDetailTab: 'personal',
  cachedEmployees: [],

  // Khởi động ứng dụng
  init() {
    this.initTheme();
    this.initEventListeners();
    this.initDateMasks();
    this.initSalaryFormatting();
    this.populateFilterDropdowns();
    this.refreshAll();
    this.initRouter();
    this.initAuth();
  },

  // Quản lý theme Sáng / Tối
  initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeIcon(savedTheme);

    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
        this.updateThemeIcon(newTheme);
        this.showToast(`Đã chuyển sang giao diện ${newTheme === 'dark' ? 'Tối' : 'Sáng'}`, 'info');
      });
    }
  },

  updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    }
  },

  // Sự kiện lắng nghe
  initEventListeners() {
    // Menu mobile toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('appSidebar');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Thanh tìm kiếm nhanh trên Header
    const globalSearch = document.getElementById('globalSearchInput');
    if (globalSearch) {
      globalSearch.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (this.currentPage !== 'employees') {
          this.switchPage('employees', false);
        }
        const filterInput = document.getElementById('filterKeyword');
        if (filterInput) {
          filterInput.value = val;
          this.syncEmployeeFilterToUrl();
          this.renderEmployeesList();
        }
      });
    }

    // Các bộ lọc tại Danh sách nhân sự
    const filterKeyword = document.getElementById('filterKeyword');
    if (filterKeyword) filterKeyword.addEventListener('input', () => {
      this.syncEmployeeFilterToUrl();
      this.renderEmployeesList();
    });

    const filterDept = document.getElementById('filterDept');
    if (filterDept) filterDept.addEventListener('change', () => {
      this.syncEmployeeFilterToUrl();
      this.renderEmployeesList();
    });

    const filterProject = document.getElementById('filterProject');
    if (filterProject) filterProject.addEventListener('change', () => {
      this.syncEmployeeFilterToUrl();
      this.renderEmployeesList();
    });

    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) filterStatus.addEventListener('change', () => {
      this.syncEmployeeFilterToUrl();
      this.renderEmployeesList();
    });

    // Lưu ý: Đã loại bỏ hoàn toàn sự kiện đóng modal khi click ra ngoài overlay
    // Theo yêu cầu: Popup chỉ được đóng khi bấm dấu X hoặc nút Hủy/Đóng ở cuối popup
  },

  // Chuyển đổi định dạng ngày: ISO (YYYY-MM-DD) sang VN (dd/mm/yyyy)
  formatVnDate(dateStr) {
    if (!dateStr || dateStr === 'Không thời hạn') return dateStr || '';
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  },

  // Chuyển đổi định dạng ngày: VN (dd/mm/yyyy) sang ISO (YYYY-MM-DD)
  toIsoDate(vnStr) {
    if (!vnStr || vnStr === 'Không thời hạn') return vnStr || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(vnStr)) return vnStr;
    const parts = vnStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return vnStr;
  },

  // Mở trình chọn ngày từ nút calendar icon
  openCalendarFor(inputId) {
    const textInput = document.getElementById(inputId);
    const picker = document.getElementById(`picker_${inputId}`);
    if (picker) {
      if (textInput && textInput.value) {
        const iso = this.toIsoDate(textInput.value.trim());
        if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
          picker.value = iso;
        }
      }
      if (typeof picker.showPicker === 'function') {
        picker.showPicker();
      } else {
        picker.focus();
      }
    }
  },

  // Đồng bộ ngày đã chọn từ picker về input dd/mm/yyyy
  syncPickerToText(inputId, isoVal) {
    const textInput = document.getElementById(inputId);
    if (textInput && isoVal) {
      textInput.value = this.formatVnDate(isoVal);
    }
  },

  // Tự động định dạng ngày dd/mm/yyyy khi gõ
  initDateMasks() {
    document.querySelectorAll('.date-mask').forEach(input => {
      input.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').slice(0, 8);
        if (val.length >= 5) {
          e.target.value = `${val.slice(0, 2)}/${val.slice(2, 4)}/${val.slice(4)}`;
        } else if (val.length >= 3) {
          e.target.value = `${val.slice(0, 2)}/${val.slice(2)}`;
        } else {
          e.target.value = val;
        }
      });
    });
  },

  // Tự động định dạng mức lương (ví dụ: 1.000.000 đ) khi đang gõ hoặc đã nhập
  initSalaryFormatting() {
    const salaryInput = document.getElementById('formBaseSalary');
    if (!salaryInput) return;

    salaryInput.addEventListener('input', (e) => {
      const raw = e.target.value.replace(/\D/g, '');
      if (!raw) {
        e.target.value = '';
        return;
      }
      const num = parseInt(raw, 10);
      e.target.value = num.toLocaleString('vi-VN') + ' đ';
    });
  },

  // Điền danh sách phòng ban và dự án vào các thẻ select
  populateFilterDropdowns() {
    const projects = HRStorage.getProjects();
    const fillSelect = (selectId, items, defaultLabel) => {
      const select = document.getElementById(selectId);
      if (!select) return;
      select.innerHTML = `<option value="">${defaultLabel}</option>`;
      items.forEach(item => {
        if (selectId.toLowerCase().includes('project')) {
          const code = HRStorage.getProjectCode(item);
          const label = (code && code !== 'ALL') ? `[${code}] ${item}` : item;
          select.innerHTML += `<option value="${item}">${label}</option>`;
        } else {
          select.innerHTML += `<option value="${item}">${item}</option>`;
        }
      });
    };

    fillSelect('filterDept', JOYGAMES_DEPARTMENTS, 'Tất cả Phòng Ban');
    fillSelect('filterProject', projects, 'Tất cả Dự Án Game');
    fillSelect('formDepartment', JOYGAMES_DEPARTMENTS, '-- Chọn Phòng Ban --');
    fillSelect('formGameProject', projects, '-- Chọn Dự Án Game --');
    fillSelect('advSearchDept', JOYGAMES_DEPARTMENTS, '-- Tất cả Phòng Ban --');
    fillSelect('advSearchProject', projects, '-- Tất cả Dự Án --');
    fillSelect('rotateNewProject', projects, '-- Chọn Dự Án Tiếp Nhận --');

    // Bộ lọc trên Dashboard Tổng Quan
    fillSelect('dashFilterCompany', JOYGAMES_COMPANIES, 'Tất cả');
    fillSelect('dashFilterDept', JOYGAMES_DEPARTMENTS, 'Tất cả');
    fillSelect('dashFilterPosition', ['Giám đốc', 'Phó giám đốc', 'Trưởng bộ phận', 'Trưởng nhóm', 'Nhân viên'], 'Tất cả');

    // Dropdown loại tài liệu tải lên
    const docTypeSelect = document.getElementById('uploadDocType');
    if (docTypeSelect) {
      docTypeSelect.innerHTML = DOCUMENT_TYPES.map(t => `<option value="${t.key}">${t.label}${t.required ? ' (Bắt buộc)' : ''}</option>`).join('');
    }
  },

  // Khởi tạo hệ thống định tuyến URL Sạch (HTML5 History API: /dashboard, /employees, /projects...)
  initRouter() {
    // Tương thích ngược: nếu người dùng truy cập link cũ có dấu # (ví dụ: /#/documents)
    if (window.location.hash) {
      const cleanPath = window.location.hash.replace(/^#\/?/, '/');
      history.replaceState(null, '', cleanPath);
    }

    // Bắt sự kiện bấm vào các thẻ link nội bộ <a> để chuyển trang mượt mà không reload trang
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      const href = link.getAttribute('href');
      if (!href) return;
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('blob:')) {
        return;
      }
      if (href.startsWith('#')) return;

      e.preventDefault();
      this.navigateTo(href);
    });

    // Lắng nghe sự kiện người dùng bấm nút Quay lại (Back) hoặc Tiến tới (Forward)
    window.addEventListener('popstate', () => {
      this.handleCurrentRoute();
    });

    // Kích hoạt đọc route hiện tại
    this.handleCurrentRoute();
  },

  // Điều hướng đến URL mới
  navigateTo(urlPath) {
    const currentFull = window.location.pathname + window.location.search;
    if (currentFull !== urlPath) {
      history.pushState(null, '', urlPath);
    }
    this.handleCurrentRoute();
  },

  // Xử lý và đọc URL hiện tại
  handleCurrentRoute() {
    const path = window.location.pathname.replace(/^\/+/, '').trim();
    const parts = path.split('/').filter(Boolean);
    const page = parts[0] || 'dashboard';
    const subId = parts[1] || null;
    const queryParams = new URLSearchParams(window.location.search || '');

    const validPages = ['dashboard', 'employees', 'search', 'documents', 'projects', 'settings'];
    const targetPage = validPages.includes(page) ? page : 'dashboard';

    // Áp dụng bộ lọc từ query params nếu là trang employees
    if (targetPage === 'employees') {
      this.applyEmployeeFiltersFromParams(queryParams);
    }

    this.switchPage(targetPage, false);

    // Nếu URL có kèm ID nhân sự (ví dụ: /employees/JG-2023-001)
    if (targetPage === 'employees' && subId) {
      setTimeout(() => {
        this.openEmployeeDetail(subId, false);
      }, 120);
    } else {
      const detailModal = document.getElementById('modalEmpDetail');
      if (detailModal && detailModal.classList.contains('active')) {
        detailModal.classList.remove('active');
      }
    }
  },

  // Chuyển trang (Tab View) và đồng bộ đường dẫn URL trên thanh địa chỉ
  switchPage(pageId, updateUrl = true) {
    const validPages = ['dashboard', 'employees', 'search', 'documents', 'projects', 'settings'];
    if (!validPages.includes(pageId)) pageId = 'dashboard';

    this.currentPage = pageId;

    if (updateUrl) {
      if (pageId === 'employees') {
        this.syncEmployeeFilterToUrl();
      } else {
        const targetUrl = `/${pageId}`;
        if (window.location.pathname !== targetUrl) {
          history.pushState(null, '', targetUrl);
        }
      }
    }

    // Sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('data-page') === pageId);
    });

    // Content view active state
    document.querySelectorAll('.page-view').forEach(view => {
      view.classList.remove('active');
    });

    const targetView = document.getElementById(`view-${pageId}`);
    if (targetView) targetView.classList.add('active');

    // Đóng sidebar mobile
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) sidebar.classList.remove('open');

    // Render nội dung tương ứng
    if (pageId === 'dashboard') this.renderDashboard();
    if (pageId === 'employees') this.renderEmployeesList();
    if (pageId === 'documents') this.renderDocumentsAudit();
    if (pageId === 'projects') this.renderProjectsGrid();
    if (pageId === 'settings') this.loadTelegramSettingsUI();
  },

  // Làm mới toàn bộ dữ liệu giao diện
  refreshAll() {
    this.cachedEmployees = HRStorage.getAll();
    const stats = HRStorage.getStatistics();

    // Cập nhật badge số lượng trên sidebar
    const navEmpCount = document.getElementById('navEmpCount');
    if (navEmpCount) navEmpCount.textContent = stats.total;

    const navMissingBadge = document.getElementById('navMissingDocBadge');
    if (navMissingBadge) {
      navMissingBadge.textContent = `${stats.missingDocsEmployees.length} Thiếu`;
      navMissingBadge.style.display = stats.missingDocsEmployees.length > 0 ? 'inline-flex' : 'none';
    }

    if (this.currentPage === 'dashboard') this.renderDashboard();
    if (this.currentPage === 'employees') this.renderEmployeesList();
    if (this.currentPage === 'documents') this.renderDocumentsAudit();
    if (this.currentPage === 'projects') this.renderProjectsGrid();
  },

  // ==========================================
  // RENDER VIEW 1: DASHBOARD
  // ==========================================
  // DASHBOARD INTERACTIVE 6-CHART SUITE & FILTERS
  // ==========================================

  // Lắng nghe thay đổi bộ lọc trên Dashboard
  handleDashboardFilterChange() {
    const statusSelect = document.getElementById('dashFilterStatus');
    const dot = document.getElementById('dashStatusDot');
    if (statusSelect && dot) {
      const val = statusSelect.value;
      if (val === 'active') dot.style.background = '#22c55e';
      else if (val === 'Thử việc') dot.style.background = '#eab308';
      else if (val === 'Đã nghỉ việc') dot.style.background = '#ef4444';
      else dot.style.background = '#94a3b8';
    }
    this.renderDashboard();
  },

  // Đặt lại các bộ lọc trên Dashboard
  resetDashboardFilters() {
    const elCompany = document.getElementById('dashFilterCompany');
    const elDept = document.getElementById('dashFilterDept');
    const elPos = document.getElementById('dashFilterPosition');
    const elStatus = document.getElementById('dashFilterStatus');
    const dot = document.getElementById('dashStatusDot');

    if (elCompany) elCompany.value = '';
    if (elDept) elDept.value = '';
    if (elPos) elPos.value = '';
    if (elStatus) elStatus.value = 'active';
    if (dot) dot.style.background = '#22c55e';

    this.renderDashboard();
    this.showToast('Đã đặt lại bộ lọc Dashboard về mặc định!', 'info');
  },

  // Render 6 biểu đồ thống kê chuyên sâu & bộ lọc
  renderDashboard() {
    const allEmployees = HRStorage.getAll();
    const stats = HRStorage.getStatistics();

    // Đọc giá trị 4 bộ lọc trên đầu Dashboard
    const selCompany = (document.getElementById('dashFilterCompany')?.value || '').trim();
    const selDept = (document.getElementById('dashFilterDept')?.value || '').trim();
    const selPos = (document.getElementById('dashFilterPosition')?.value || '').trim();
    const selStatus = (document.getElementById('dashFilterStatus')?.value || 'active').trim();

    // Lọc danh sách nhân sự
    const filtered = allEmployees.filter(emp => {
      if (selCompany && emp.company !== selCompany) return false;
      if (selDept && emp.department !== selDept) return false;
      if (selPos) {
        if (!emp.position.toLowerCase().includes(selPos.toLowerCase()) && emp.level !== selPos) {
          return false;
        }
      }
      if (selStatus === 'active') {
        if (emp.status !== 'Đang làm việc' && emp.status !== 'Thử việc') return false;
      } else if (selStatus !== 'all') {
        if (emp.status !== selStatus) return false;
      }
      return true;
    });

    const total = filtered.length;

    // 1. BIỂU ĐỒ 1: Loại công việc (Horizontal Bar - Mint Green)
    const chartWorkType = document.getElementById('chartWorkType');
    if (chartWorkType) {
      if (!total) {
        chartWorkType.innerHTML = `<div class="empty-state" style="padding: 20px; font-size: 13px;">Không có dữ liệu phù hợp</div>`;
      } else {
        const types = ['Full Time', 'Part Time', 'Remote'];
        chartWorkType.innerHTML = `
          <div class="hbar-chart-container">
            ${types.map(t => {
              const count = filtered.filter(e => (e.workType || 'Full Time') === t).length;
              const pct = (count / total * 100).toFixed(1);
              return `
                <div class="hbar-row">
                  <span class="hbar-label">${t}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill hbar-fill-teal" style="width: ${pct}%;"></div>
                  </div>
                  <span class="hbar-value">${pct.replace('.', ',')}%</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }

    // 2. BIỂU ĐỒ 2: Số nhân viên theo từng phòng ban (Horizontal Bar - Soft Pink)
    const chartDept = document.getElementById('chartDeptBreakdown');
    if (chartDept) {
      if (!total) {
        chartDept.innerHTML = `<div class="empty-state" style="padding: 20px; font-size: 13px;">Không có dữ liệu phù hợp</div>`;
      } else {
        const deptCounts = {};
        filtered.forEach(e => {
          const d = e.department || 'Khác';
          deptCounts[d] = (deptCounts[d] || 0) + 1;
        });

        // Sắp xếp giảm dần theo số lượng
        const sortedDepts = Object.keys(deptCounts).sort((a, b) => deptCounts[b] - deptCounts[a]);
        const maxDeptCount = Math.max(...Object.values(deptCounts), 1);

        chartDept.innerHTML = `
          <div class="hbar-chart-container" style="max-height: 220px; overflow-y: auto; padding-right: 4px;">
            ${sortedDepts.map(d => {
              const count = deptCounts[d];
              const pct = Math.max((count / maxDeptCount * 100), 8);
              // Rút gọn tên hiển thị nếu quá dài
              const shortName = d.replace(/\s*\([^)]*\)/g, '').trim();
              return `
                <div class="hbar-row">
                  <span class="hbar-label" title="${d}">${shortName}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill hbar-fill-pink" style="width: ${pct}%;"></div>
                  </div>
                  <span class="hbar-value">${count}</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }

    // 3. BIỂU ĐỒ 3: Chức vụ (Horizontal Bar - Soft Lavender Purple)
    const chartPos = document.getElementById('chartPositionBreakdown');
    if (chartPos) {
      if (!total) {
        chartPos.innerHTML = `<div class="empty-state" style="padding: 20px; font-size: 13px;">Không có dữ liệu phù hợp</div>`;
      } else {
        const roleCategories = [
          { key: 'Giám đốc', match: e => e.position.includes('Giám đốc') || e.position.includes('Director') || e.level === 'Director' },
          { key: 'Phó giám đốc', match: e => e.position.includes('Phó giám đốc') || e.position.includes('Vice') },
          { key: 'Trưởng bộ phận', match: e => e.position.includes('Trưởng bộ phận') || e.position.includes('Head') },
          { key: 'Trưởng nhóm', match: e => e.position.includes('Trưởng nhóm') || e.position.includes('Lead') || e.level === 'Lead' },
          { key: 'Nhân viên', match: e => !e.position.includes('Giám đốc') && !e.position.includes('Director') && !e.position.includes('Trưởng') && !e.position.includes('Lead') }
        ];

        const roleCounts = roleCategories.map(r => ({
          label: r.key,
          count: filtered.filter(r.match).length
        }));

        const maxRoleCount = Math.max(...roleCounts.map(r => r.count), 1);

        chartPos.innerHTML = `
          <div class="hbar-chart-container">
            ${roleCounts.map(r => {
              const pct = r.count > 0 ? Math.max((r.count / maxRoleCount * 100), 8) : 0;
              return `
                <div class="hbar-row">
                  <span class="hbar-label">${r.label}</span>
                  <div class="hbar-track">
                    <div class="hbar-fill hbar-fill-purple" style="width: ${pct}%;"></div>
                  </div>
                  <span class="hbar-value">${r.count}</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }

    // 4. BIỂU ĐỒ 4: Học vấn (Vertical Column Chart with numbers on top)
    const chartEdu = document.getElementById('chartEducationBreakdown');
    if (chartEdu) {
      if (!total) {
        chartEdu.innerHTML = `<div class="empty-state" style="padding: 20px; font-size: 13px;">Không có dữ liệu phù hợp</div>`;
      } else {
        const eduLevels = ['Trung học phổ thông', 'Đại học', 'Cao đẳng', 'Trung cấp'];
        const eduCounts = eduLevels.map(lvl => ({
          label: lvl,
          count: filtered.filter(e => (e.education || 'Đại học') === lvl).length
        }));

        const maxEdu = Math.max(...eduCounts.map(e => e.count), 1);

        chartEdu.innerHTML = `
          <div class="vcol-chart-container">
            ${eduCounts.map(e => {
              const height = e.count > 0 ? Math.max(Math.round((e.count / maxEdu) * 130), 16) : 4;
              return `
                <div class="vcol-item">
                  <span class="vcol-value">${e.count}</span>
                  <div class="vcol-bar" style="height: ${height}px;"></div>
                </div>
              `;
            }).join('')}
          </div>
          <div class="vcol-labels-row">
            ${eduCounts.map(e => `<span class="vcol-label">${e.label}</span>`).join('')}
          </div>
        `;
      }
    }

    // 5. BIỂU ĐỒ 5: Nhóm độ tuổi (Donut Chart with Percentages)
    const chartAge = document.getElementById('chartAgeGroups');
    if (chartAge) {
      if (!total) {
        chartAge.innerHTML = `<div class="empty-state" style="padding: 20px; font-size: 13px;">Không có dữ liệu phù hợp</div>`;
      } else {
        const currentYear = new Date().getFullYear();
        let age18_30 = 0;
        let age31_40 = 0;
        let age41_50 = 0;
        let age50Plus = 0;

        filtered.forEach(e => {
          let age = 26; // Default
          if (e.birthDate) {
            const birthYear = parseInt(e.birthDate.slice(0, 4), 10);
            if (!isNaN(birthYear) && birthYear > 1940) {
              age = currentYear - birthYear;
            }
          }
          if (age <= 30) age18_30++;
          else if (age <= 40) age31_40++;
          else if (age <= 50) age41_50++;
          else age50Plus++;
        });

        const ageSlices = [
          { label: '18 - 30', count: age18_30, color: '#93c5fd' },
          { label: '31 - 40', count: age31_40, color: '#f87171' },
          { label: '41 - 50', count: age41_50, color: '#cbd5e1' },
          { label: '> 50', count: age50Plus, color: '#fbbf24' }
        ].filter(s => s.count > 0);

        ageSlices.forEach(s => {
          s.pct = (s.count / total * 100).toFixed(1);
        });

        chartAge.innerHTML = this.createDonutSvg(ageSlices, total);
      }
    }

    // 6. BIỂU ĐỒ 6: Tình trạng hôn nhân (Donut Chart with Percentages)
    const chartMarital = document.getElementById('chartMaritalBreakdown');
    if (chartMarital) {
      if (!total) {
        chartMarital.innerHTML = `<div class="empty-state" style="padding: 20px; font-size: 13px;">Không có dữ liệu phù hợp</div>`;
      } else {
        const singleCount = filtered.filter(e => (e.maritalStatus || 'Độc thân') === 'Độc thân').length;
        const marriedCount = total - singleCount;

        const maritalSlices = [
          { label: 'Độc thân', count: singleCount, color: '#fed7aa', pct: (singleCount / total * 100).toFixed(1) },
          { label: 'Đã có gia đình', count: marriedCount, color: '#a7f3d0', pct: (marriedCount / total * 100).toFixed(1) }
        ];

        chartMarital.innerHTML = this.createDonutSvg(maritalSlices, total);
      }
    }

    // Cảnh báo hành động & Tổng quan dự án bên dưới
    const alertsList = document.getElementById('dashboardAlertsList');
    if (alertsList) {
      let alertsHtml = '';
      if (stats.expiringContracts.length > 0) {
        stats.expiringContracts.forEach(c => {
          alertsHtml += `
            <div class="action-item-card">
              <div>
                <div class="action-item-title">HĐ Lao Động Sắp Hết Hạn (${c.daysLeft} ngày nữa)</div>
                <div class="action-item-desc">${c.fullName} - ${c.department} (Hạn: ${c.contractEnd})</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="JoyApp.openEmployeeDetail('${c.id}')">Xem</button>
            </div>
          `;
        });
      }
      if (stats.missingDocsEmployees.length > 0) {
        const topMissing = stats.missingDocsEmployees.slice(0, 3);
        topMissing.forEach(m => {
          const missingNames = m.missing.map(x => x.label).join(', ');
          alertsHtml += `
            <div class="action-item-card warning">
              <div>
                <div class="action-item-title">Chưa nộp đủ hồ sơ (${m.percentage}%)</div>
                <div class="action-item-desc">${m.fullName} thiếu: ${missingNames}</div>
              </div>
              <button class="btn btn-secondary btn-sm" onclick="JoyApp.openEmployeeDetail('${m.id}')">Bổ sung</button>
            </div>
          `;
        });
      }
      if (!alertsHtml) {
        alertsHtml = `
          <div class="empty-state" style="padding: 20px;">
            <span class="material-symbols-outlined empty-state-icon" style="font-size: 32px; color: var(--joy-accent-green);">check_circle</span>
            <div style="font-size: 13.5px; color: var(--text-muted);">Mọi hồ sơ và hợp đồng đều đang trong trạng thái tối ưu!</div>
          </div>
        `;
      }
      alertsList.innerHTML = alertsHtml;
    }

    const projectGrid = document.getElementById('projectStatCards');
    if (projectGrid) {
      projectGrid.innerHTML = Object.keys(stats.byProject).map(proj => {
        const count = stats.byProject[proj];
        return `
          <div class="stat-card" style="padding: 16px; cursor: pointer;" onclick="JoyApp.filterByProject('${proj}')">
            <div class="stat-content">
              <span class="stat-label" style="font-size: 11px;">Dự Án / Studio</span>
              <span style="font-family: var(--font-heading); font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">${proj}</span>
              <span class="badge badge-game" style="align-self: flex-start;">${count} Thành viên</span>
            </div>
            <div class="stat-icon-wrap" style="width: 42px; height: 42px; font-size: 20px;">
              <span class="material-symbols-outlined">sports_esports</span>
            </div>
          </div>
        `;
      }).join('');
    }
  },

  // Hàm tạo SVG Donut Chart cho Nhóm độ tuổi và Tình trạng hôn nhân
  createDonutSvg(slices, total) {
    if (!total || !slices.length) return '';
    const size = 150;
    const radius = 55;
    const cx = 75;
    const cy = 75;
    const circumference = 2 * Math.PI * radius; // ~345.57

    let accumulatedOffset = 0;
    let paths = '';

    slices.forEach(slice => {
      const p = parseFloat(slice.pct) / 100;
      const strokeDash = p * circumference;
      const strokeDasharray = `${strokeDash} ${circumference - strokeDash}`;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += strokeDash;

      paths += `
        <circle cx="${cx}" cy="${cy}" r="${radius}"
          fill="transparent"
          stroke="${slice.color}"
          stroke-width="26"
          stroke-dasharray="${strokeDasharray}"
          stroke-dashoffset="${strokeDashoffset}"
          transform="rotate(-90 ${cx} ${cy})"
          style="transition: stroke-dasharray 0.6s ease;"
        >
          <title>${slice.label}: ${slice.count} người (${slice.pct}%)</title>
        </circle>
      `;
    });

    return `
      <div class="donut-chart-box">
        <div class="donut-svg-wrap" style="width: ${size}px; height: ${size}px;">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="${cx}" cy="${cy}" r="${radius}" fill="transparent" stroke="rgba(255,255,255,0.06)" stroke-width="26" />
            ${paths}
          </svg>
        </div>
        <div class="donut-legend">
          ${slices.map(s => `
            <div class="donut-legend-item">
              <span class="donut-legend-color" style="background: ${s.color};"></span>
              <span><strong>${s.label}:</strong> ${s.pct.replace('.', ',')}%</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  filterByProject(projectName) {
    this.switchPage('employees', false);
    const select = document.getElementById('filterProject');
    if (select) {
      select.value = projectName;
      this.syncEmployeeFilterToUrl();
      this.renderEmployeesList();
    }
  },

  // ==========================================
  // RENDER VIEW 2: EMPLOYEES DIRECTORY
  // ==========================================
  setViewMode(mode) {
    this.viewMode = mode;
    document.getElementById('viewModeCardBtn')?.classList.toggle('active', mode === 'card');
    document.getElementById('viewModeTableBtn')?.classList.toggle('active', mode === 'table');
    this.syncEmployeeFilterToUrl();
    this.renderEmployeesList();
  },

  setPillFilter(type) {
    this.filterPill = type;
    document.querySelectorAll('.filter-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-pill-type') === type);
    });
    this.syncEmployeeFilterToUrl();
    this.renderEmployeesList();
  },

  // Đồng bộ trạng thái bộ lọc danh sách nhân sự lên URL
  syncEmployeeFilterToUrl() {
    if (this.currentPage !== 'employees') return;
    const params = new URLSearchParams();

    const keyword = (document.getElementById('filterKeyword')?.value || '').trim();
    const dept = document.getElementById('filterDept')?.value || '';
    const proj = document.getElementById('filterProject')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';

    if (keyword) params.set('q', keyword);
    if (dept) params.set('dept', dept);
    if (proj) params.set('project', proj);
    if (status) params.set('status', status);
    if (this.filterPill && this.filterPill !== 'all') params.set('pill', this.filterPill);
    if (this.viewMode && this.viewMode !== 'card') params.set('view', this.viewMode);

    const queryString = params.toString();
    const targetUrl = '/employees' + (queryString ? `?${queryString}` : '');
    
    if (window.location.pathname + window.location.search !== targetUrl) {
      history.replaceState(null, '', targetUrl);
    }
  },

  // Áp dụng trạng thái bộ lọc từ Query Parameters trên URL (sau khi F5 hoặc mở link)
  applyEmployeeFiltersFromParams(params) {
    if (!params) return;

    // 1. Filter Pill
    const pill = params.get('pill');
    this.filterPill = pill || 'all';
    document.querySelectorAll('.filter-pill').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-pill-type') === this.filterPill);
    });

    // 2. View Mode (Card / Table)
    const view = params.get('view');
    if (view && (view === 'card' || view === 'table')) {
      this.viewMode = view;
    } else {
      this.viewMode = 'card';
    }
    document.getElementById('viewModeCardBtn')?.classList.toggle('active', this.viewMode === 'card');
    document.getElementById('viewModeTableBtn')?.classList.toggle('active', this.viewMode === 'table');

    // 3. Keyword
    const q = params.get('q');
    const keywordInput = document.getElementById('filterKeyword');
    if (keywordInput) keywordInput.value = q || '';

    // 4. Phòng ban
    const dept = params.get('dept');
    const deptSelect = document.getElementById('filterDept');
    if (deptSelect && dept) deptSelect.value = dept;

    // 5. Dự án Game
    const proj = params.get('project');
    const projSelect = document.getElementById('filterProject');
    if (projSelect && proj) projSelect.value = proj;

    // 6. Trạng thái
    const status = params.get('status');
    const statusSelect = document.getElementById('filterStatus');
    if (statusSelect && status) statusSelect.value = status;
  },

  getFilteredEmployees() {
    let list = HRStorage.getAll();
    const keyword = (document.getElementById('filterKeyword')?.value || '').toLowerCase().trim();
    const dept = document.getElementById('filterDept')?.value || '';
    const proj = document.getElementById('filterProject')?.value || '';
    const status = document.getElementById('filterStatus')?.value || '';

    // Cập nhật số đếm trên các pills
    const allCount = list.length;
    let completeCount = 0;
    let missingCount = 0;
    let probationCount = 0;
    let leadCount = 0;

    list.forEach(emp => {
      const docCheck = HRStorage.checkDocumentStatus(emp);
      if (docCheck.isComplete) completeCount++;
      else missingCount++;

      if (emp.status === 'Thử việc' || emp.contractType === 'Thử việc' || emp.contractType === 'Thực tập sinh') probationCount++;
      if (emp.level === 'Lead' || emp.level === 'Director') leadCount++;
    });

    const updatePill = (id, count) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    };
    updatePill('pillCountAll', allCount);
    updatePill('pillCountComplete', completeCount);
    updatePill('pillCountMissing', missingCount);
    updatePill('pillCountProbation', probationCount);
    updatePill('pillCountLead', leadCount);

    // Lọc theo keyword
    if (keyword) {
      list = list.filter(emp => {
        return (
          emp.fullName.toLowerCase().includes(keyword) ||
          emp.id.toLowerCase().includes(keyword) ||
          (emp.workEmail && emp.workEmail.toLowerCase().includes(keyword)) ||
          (emp.phone && emp.phone.includes(keyword)) ||
          (emp.idCard && emp.idCard.includes(keyword)) ||
          (emp.position && emp.position.toLowerCase().includes(keyword))
        );
      });
    }

    // Lọc theo phòng ban
    if (dept) list = list.filter(emp => emp.department === dept);

    // Lọc theo dự án
    if (proj) list = list.filter(emp => emp.gameProject === proj);

    // Lọc theo trạng thái
    if (status) list = list.filter(emp => emp.status === status);

    // Lọc theo Pill
    if (this.filterPill === 'complete') {
      list = list.filter(emp => HRStorage.checkDocumentStatus(emp).isComplete);
    } else if (this.filterPill === 'missing') {
      list = list.filter(emp => !HRStorage.checkDocumentStatus(emp).isComplete);
    } else if (this.filterPill === 'probation') {
      list = list.filter(emp => emp.status === 'Thử việc' || emp.contractType === 'Thử việc' || emp.contractType === 'Thực tập sinh');
    } else if (this.filterPill === 'lead') {
      list = list.filter(emp => emp.level === 'Lead' || emp.level === 'Director');
    }

    return list;
  },

  renderEmployeesList() {
    const container = document.getElementById('employeesContainer');
    if (!container) return;

    const list = this.getFilteredEmployees();

    if (list.length === 0) {
      container.innerHTML = `
        <div class="card empty-state">
          <span class="material-symbols-outlined empty-state-icon">search_off</span>
          <div class="empty-state-title">Không tìm thấy hồ sơ nhân sự nào</div>
          <p style="font-size: 13.5px; color: var(--text-muted);">Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại các bộ lọc bên trên</p>
        </div>
      `;
      return;
    }

    if (this.viewMode === 'card') {
      // Card View
      container.innerHTML = `
        <div class="employee-card-grid">
          ${list.map(emp => {
            const docStatus = HRStorage.checkDocumentStatus(emp);
            const statusBadgeClass = emp.status === 'Đang làm việc' ? 'badge-active' : (emp.status === 'Thử việc' ? 'badge-probation' : 'badge-danger');
            const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=FF4B2B&color=fff&size=128`;

            return `
              <div class="emp-card" onclick="JoyApp.openEmployeeDetail('${emp.id}')">
                <div class="emp-card-header">
                  <img class="emp-avatar-large" src="${emp.avatar || fallbackAvatar}" alt="${emp.fullName}" onerror="this.src='${fallbackAvatar}'" />
                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    <span class="badge ${statusBadgeClass}">${emp.status}</span>
                    <span class="badge badge-game">${emp.gameProject || 'JoyGames'}</span>
                  </div>
                </div>

                <div class="emp-card-body">
                  <div style="display: flex; align-items: baseline; gap: 8px;">
                    <span class="emp-card-name">${emp.fullName}</span>
                    <span style="font-size: 12px; font-weight: 700; color: var(--joy-primary);">${emp.id}</span>
                  </div>
                  <div class="emp-card-role">${emp.position || 'Nhân viên'}</div>

                  <div class="emp-card-meta">
                    <div class="emp-meta-item">
                      <span class="material-symbols-outlined icon">domain</span>
                      <span>${emp.department}</span>
                    </div>
                    <div class="emp-meta-item">
                      <span class="material-symbols-outlined icon">mail</span>
                      <span>${emp.workEmail || 'Chưa cập nhật email'}</span>
                    </div>
                    <div class="emp-meta-item">
                      <span class="material-symbols-outlined icon">call</span>
                      <span>${emp.phone || 'Chưa cập nhật SĐT'}</span>
                    </div>
                  </div>
                </div>

                <div class="emp-card-footer">
                  <div class="doc-status-pill" style="color: ${docStatus.isComplete ? 'var(--joy-accent-green)' : 'var(--joy-accent-red)'}">
                    <span class="material-symbols-outlined" style="font-size: 16px;">
                      ${docStatus.isComplete ? 'verified' : 'pending_actions'}
                    </span>
                    <span>${docStatus.isComplete ? 'Đủ hồ sơ số (100%)' : `Thiếu ${docStatus.missing.length} giấy tờ`}</span>
                  </div>
                  <span class="badge badge-outline" style="font-size: 11px;">Cấp: ${emp.level || 'Middle'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    } else {
      // Table View
      container.innerHTML = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nhân Viên</th>
                <th>Phòng Ban &amp; Dự Án</th>
                <th>Vị Trí &amp; Cấp Bậc</th>
                <th>Hợp Đồng &amp; Lương</th>
                <th>Hồ Sơ Số</th>
                <th>Trạng Thái</th>
                <th style="text-align: right;">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(emp => {
                const docStatus = HRStorage.checkDocumentStatus(emp);
                const statusBadgeClass = emp.status === 'Đang làm việc' ? 'badge-active' : (emp.status === 'Thử việc' ? 'badge-probation' : 'badge-danger');
                const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=FF4B2B&color=fff&size=80`;

                return `
                  <tr onclick="JoyApp.openEmployeeDetail('${emp.id}')">
                    <td>
                      <div class="user-cell">
                        <img class="user-avatar" src="${emp.avatar || fallbackAvatar}" alt="${emp.fullName}" onerror="this.src='${fallbackAvatar}'" />
                        <div class="user-name-wrap">
                          <span class="user-name">${emp.fullName}</span>
                          <span class="user-id">${emp.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: var(--text-main);">${emp.department}</div>
                      <span class="badge badge-game" style="font-size: 11px; padding: 2px 6px;">${emp.gameProject}</span>
                    </td>
                    <td>
                      <div style="font-weight: 500;">${emp.position}</div>
                      <span class="badge badge-outline" style="font-size: 11px;">${emp.level}</span>
                    </td>
                    <td>
                      <div style="font-size: 12.5px;">${emp.contractType}</div>
                      <div style="font-weight: 700; color: var(--joy-primary); font-size: 12px;">${(emp.baseSalary || 0).toLocaleString('vi-VN')} đ</div>
                    </td>
                    <td>
                      <span class="badge ${docStatus.isComplete ? 'badge-active' : 'badge-danger'}">
                        ${docStatus.isComplete ? '✅ Đủ 100%' : `⚠️ Thiếu ${docStatus.missing.length}`}
                      </span>
                    </td>
                    <td>
                      <span class="badge ${statusBadgeClass}">${emp.status}</span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); JoyApp.openEmployeeDetail('${emp.id}')">
                        <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span> Chi tiết
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }
  },

  // ==========================================
  // RENDER VIEW 3: ADVANCED SEARCH
  // ==========================================
  performAdvSearch() {
    const sId = (document.getElementById('advSearchId')?.value || '').toLowerCase().trim();
    const sName = (document.getElementById('advSearchName')?.value || '').toLowerCase().trim();
    const sIdCard = (document.getElementById('advSearchIdCard')?.value || '').trim();
    const sContact = (document.getElementById('advSearchContact')?.value || '').toLowerCase().trim();
    const sDept = document.getElementById('advSearchDept')?.value || '';
    const sProj = document.getElementById('advSearchProject')?.value || '';
    const sContract = document.getElementById('advSearchContract')?.value || '';
    const sDocStatus = document.getElementById('advSearchDocStatus')?.value || '';

    let list = HRStorage.getAll();

    if (sId) list = list.filter(e => e.id.toLowerCase().includes(sId));
    if (sName) list = list.filter(e => e.fullName.toLowerCase().includes(sName));
    if (sIdCard) list = list.filter(e => e.idCard && e.idCard.includes(sIdCard));
    if (sContact) {
      list = list.filter(e =>
        (e.phone && e.phone.includes(sContact)) ||
        (e.workEmail && e.workEmail.toLowerCase().includes(sContact)) ||
        (e.personalEmail && e.personalEmail.toLowerCase().includes(sContact))
      );
    }
    if (sDept) list = list.filter(e => e.department === sDept);
    if (sProj) list = list.filter(e => e.gameProject === sProj);
    if (sContract) list = list.filter(e => e.contractType && e.contractType.includes(sContract));

    // Bộ lọc chuyên sâu theo tình trạng hồ sơ
    if (sDocStatus) {
      if (sDocStatus === 'complete') {
        list = list.filter(e => HRStorage.checkDocumentStatus(e).isComplete);
      } else if (sDocStatus === 'missing') {
        list = list.filter(e => !HRStorage.checkDocumentStatus(e).isComplete);
      } else if (sDocStatus === 'missing_cccd') {
        list = list.filter(e => {
          const types = (e.documents || []).map(d => d.type);
          return !types.includes('cccd_front') || !types.includes('cccd_back');
        });
      } else if (sDocStatus === 'missing_contract') {
        list = list.filter(e => !(e.documents || []).some(d => d.type === 'contract'));
      } else if (sDocStatus === 'missing_health') {
        list = list.filter(e => !(e.documents || []).some(d => d.type === 'health_cert'));
      }
    }

    const wrap = document.getElementById('advSearchResultsWrap');
    if (!wrap) return;

    wrap.innerHTML = `
      <div class="section-header" style="margin-top: 10px;">
        <h3 class="section-title" style="font-size: 19px;">Kết Quả Tra Cứu: ${list.length} hồ sơ phù hợp</h3>
        <button class="btn btn-secondary btn-sm" onclick="HRStorage.exportToCSV()">
          <span class="material-symbols-outlined">download</span> Xuất kết quả
        </button>
      </div>

      ${list.length === 0 ? `
        <div class="card empty-state">
          <span class="material-symbols-outlined empty-state-icon">person_search</span>
          <div class="empty-state-title">Không tìm thấy nhân viên nào khớp với toàn bộ tiêu chí trên</div>
        </div>
      ` : `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mã NV &amp; Họ Tên</th>
                <th>Số CCCD</th>
                <th>Liên Hệ</th>
                <th>Phòng Ban &amp; Dự Án</th>
                <th>Hợp Đồng</th>
                <th>Hồ Sơ Số</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${list.map(emp => {
                const docStatus = HRStorage.checkDocumentStatus(emp);
                const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=FF4B2B&color=fff&size=80`;
                return `
                  <tr>
                    <td>
                      <div class="user-cell">
                        <img class="user-avatar" src="${emp.avatar || fallbackAvatar}" alt="${emp.fullName}" onerror="this.src='${fallbackAvatar}'" />
                        <div class="user-name-wrap">
                          <span class="user-name">${emp.fullName}</span>
                          <span class="user-id">${emp.id}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style="font-weight: 700; font-family: monospace; font-size: 13.5px; color: var(--joy-primary);">${emp.idCard || '---'}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${emp.hometown || ''}</div>
                    </td>
                    <td>
                      <div>${emp.phone || ''}</div>
                      <div style="font-size: 11.5px; color: var(--text-muted);">${emp.workEmail || ''}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600;">${emp.department}</div>
                      <span class="badge badge-game" style="font-size: 11px;">${emp.gameProject}</span>
                    </td>
                    <td>
                      <div style="font-size: 12.5px;">${emp.contractType}</div>
                    </td>
                    <td>
                      <span class="badge ${docStatus.isComplete ? 'badge-active' : 'badge-danger'}">
                        ${docStatus.isComplete ? '✅ Đủ 100%' : `⚠️ Thiếu ${docStatus.missing.length}`}
                      </span>
                    </td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="JoyApp.openEmployeeDetail('${emp.id}')">
                        <span class="material-symbols-outlined" style="font-size: 16px;">visibility</span> Chi tiết
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `}
    `;
  },

  resetAdvSearch() {
    ['advSearchId', 'advSearchName', 'advSearchIdCard', 'advSearchContact', 'advSearchDept', 'advSearchProject', 'advSearchContract', 'advSearchDocStatus'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const wrap = document.getElementById('advSearchResultsWrap');
    if (wrap) wrap.innerHTML = '';
  },

  // ==========================================
  // RENDER VIEW 4: DOCUMENT AUDIT & VAULT
  // ==========================================
  renderDocumentsAudit() {
    const stats = HRStorage.getStatistics();
    const list = HRStorage.getAll();

    // Tính tổng số lượng file tài liệu đã lưu trên hệ thống
    let totalFilesStored = 0;
    list.forEach(emp => {
      if (emp.documents) totalFilesStored += emp.documents.length;
    });

    // Stat Cards
    const auditStats = document.getElementById('docAuditStats');
    if (auditStats) {
      auditStats.innerHTML = `
        <div class="stat-card variant-blue">
          <div class="stat-content">
            <span class="stat-label">Tổng Tệp Tài Liệu Số</span>
            <span class="stat-number">${totalFilesStored}</span>
            <span class="stat-subtext">Đã lưu trữ và mã hóa an toàn</span>
          </div>
          <div class="stat-icon-wrap">
            <span class="material-symbols-outlined">description</span>
          </div>
        </div>

        <div class="stat-card variant-green">
          <div class="stat-content">
            <span class="stat-label">Hồ Sơ Đầy Đủ 100%</span>
            <span class="stat-number">${stats.completeDocsCount}</span>
            <span class="stat-subtext">Đủ toàn bộ CCCD, HĐLĐ, NDA...</span>
          </div>
          <div class="stat-icon-wrap">
            <span class="material-symbols-outlined">task_alt</span>
          </div>
        </div>

        <div class="stat-card variant-danger">
          <div class="stat-content">
            <span class="stat-label">Nhân Sự Còn Thiếu Tệp</span>
            <span class="stat-number">${stats.missingDocsEmployees.length}</span>
            <span class="stat-subtext">Cần đôn đốc bổ sung ngay</span>
          </div>
          <div class="stat-icon-wrap">
            <span class="material-symbols-outlined">warning</span>
          </div>
        </div>
      `;
    }

    // Badge đếm
    const badgeCount = document.getElementById('missingDocBadgeCount');
    if (badgeCount) badgeCount.textContent = `${stats.missingDocsEmployees.length} Nhân viên`;

    // Table danh sách nhân viên thiếu hồ sơ
    const tableBody = document.getElementById('missingDocsTableBody');
    if (tableBody) {
      if (stats.missingDocsEmployees.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 30px; color: var(--joy-accent-green); font-weight: 600;">
              🎉 Tuyệt vời! 100% nhân viên JoyGames đã hoàn thiện đầy đủ toàn bộ hồ sơ số hóa.
            </td>
          </tr>
        `;
      } else {
        tableBody.innerHTML = stats.missingDocsEmployees.map(m => {
          const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName)}&background=FF4B2B&color=fff&size=80`;
          return `
            <tr>
              <td>
                <div class="user-cell">
                  <img class="user-avatar" src="${m.avatar || fallbackAvatar}" alt="${m.fullName}" onerror="this.src='${fallbackAvatar}'" />
                  <div class="user-name-wrap">
                    <span class="user-name">${m.fullName}</span>
                    <span class="user-id">${m.id}</span>
                  </div>
                </div>
              </td>
              <td>${m.department}</td>
              <td>${m.position}</td>
              <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div class="progress-bar-wrap" style="width: 80px;">
                    <div class="progress-bar-fill" style="width: ${m.percentage}%; background: var(--joy-accent-yellow);"></div>
                  </div>
                  <span style="font-size: 12px; font-weight: 700;">${m.percentage}%</span>
                </div>
              </td>
              <td>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  ${m.missing.map(x => `<span class="badge badge-danger" style="font-size: 11px; align-self: flex-start;">❌ ${x.label}</span>`).join('')}
                </div>
              </td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-primary btn-sm" onclick="JoyApp.openEmployeeDetail('${m.id}')">
                    <span class="material-symbols-outlined" style="font-size: 15px;">upload_file</span> Bổ sung
                  </button>
                  <button class="btn btn-secondary btn-sm" onclick="JoyApp.remindSingleEmployee('${m.id}', '${m.fullName}')">
                    <span class="material-symbols-outlined" style="font-size: 15px;">mail</span> Nhắc
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  },

  remindSingleEmployee(id, name) {
    this.showToast(`Đã gửi thông báo nhắc nhở nộp hồ sơ tới nhân viên ${name} (${id}) qua email JoyGames!`, 'success');
  },

  remindAllMissingDocs() {
    const stats = HRStorage.getStatistics();
    this.showToast(`Đã phát thông báo đôn đốc hoàn thiện hồ sơ tới tất cả ${stats.missingDocsEmployees.length} nhân viên còn thiếu!`, 'success');
  },

  // ==========================================
  // RENDER VIEW 5: PROJECTS & TEAMS
  // ==========================================
  renderProjectsGrid() {
    const list = HRStorage.getAll();
    const container = document.getElementById('projectTeamsGrid');
    if (!container) return;

    const projects = HRStorage.getProjects();
    const projectGroups = {};
    projects.forEach(p => projectGroups[p] = []);

    list.forEach(emp => {
      const p = emp.gameProject || 'Khối Vận Hành Chung (All Projects)';
      if (!projectGroups[p]) projectGroups[p] = [];
      projectGroups[p].push(emp);
    });

    container.innerHTML = Object.keys(projectGroups).map(projName => {
      const members = projectGroups[projName];
      const projMeta = (HRStorage.getProjectList ? HRStorage.getProjectList() : []).find(p => p.name === projName);
      const phase = projMeta ? projMeta.phase : '';
      return `
        <div class="card" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="card-header" style="margin-bottom: 0;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="material-symbols-outlined" style="color: var(--joy-primary); font-size: 28px;">sports_esports</span>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; font-family: monospace; font-weight: 700; border: 1px solid rgba(99, 102, 241, 0.3); font-size: 11px; padding: 2px 7px; border-radius: 5px;">
                    ${HRStorage.getProjectCode(projName)}
                  </span>
                  <h3 class="card-title" style="font-size: 16px;">${projName}</h3>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
                  <span style="font-size: 12px; color: var(--text-muted);">${members.length} Nhân sự tham gia</span>
                  ${phase ? `<span style="font-size: 10px; color: var(--text-muted);">•</span><span style="font-size: 11.5px; color: var(--joy-primary); font-weight: 500;">${phase}</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px; flex: 1;">
            ${members.length === 0 ? `
              <div style="font-size: 13px; color: var(--text-muted); font-style: italic; padding: 12px 0; text-align: center;">Chưa có nhân sự nào trong dự án này</div>
            ` : members.map(m => {
              const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName)}&background=FF4B2B&color=fff&size=64`;
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; border-radius: var(--radius-sm); background: var(--bg-surface-alt); cursor: pointer;" onclick="JoyApp.openEmployeeDetail('${m.id}')">
                  <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                    <img src="${m.avatar || fallbackAvatar}" alt="${m.fullName}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" onerror="this.src='${fallbackAvatar}'" />
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-size: 13px; font-weight: 700; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.fullName}</div>
                      <div style="font-size: 11.5px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.position}</div>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 8px;">
                    <span class="badge ${m.level === 'Lead' || m.level === 'Director' ? 'badge-active' : 'badge-outline'}" style="font-size: 10.5px;">${m.level}</span>
                    <button class="btn btn-outline btn-xs" style="padding: 3px 6px; font-size: 11px; border-color: var(--border-subtle);" title="Điều chuyển / Xoay tua dự án" onclick="event.stopPropagation(); JoyApp.openRotateModal('${m.id}')">
                      <span class="material-symbols-outlined" style="font-size: 15px; color: var(--joy-primary);">sync_alt</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="padding-top: 10px; border-top: 1px dashed var(--border-subtle); margin-top: auto;">
            <button class="btn btn-secondary btn-sm" style="width: 100%; justify-content: center; font-size: 12px; gap: 6px;" onclick="JoyApp.openAddMemberToProjectModal('${projName}')">
              <span class="material-symbols-outlined" style="font-size: 16px;">person_add</span> Điều chuyển nhân sự vào đây
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ==========================================
  // MODAL 360° EMPLOYEE DETAIL VIEW
  // ==========================================
  openEmployeeDetail(id, updateHash = true) {
    this.currentEmployeeId = id;
    const emp = HRStorage.getById(id);
    if (!emp) {
      this.showToast('Không tìm thấy thông tin nhân sự này!', 'error');
      return;
    }

    if (updateHash) {
      history.pushState(null, '', `/employees/${id}`);
    }

    const docStatus = HRStorage.checkDocumentStatus(emp);
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.fullName)}&background=FF4B2B&color=fff&size=160`;

    // Cập nhật nút Chỉnh sửa & Xóa trong footer modal
    const btnEdit = document.getElementById('btnDetailEdit');
    if (btnEdit) btnEdit.onclick = () => {
      this.closeModal('modalEmpDetail');
      this.openEditEmployeeModal(emp.id);
    };

    const btnDelete = document.getElementById('btnDetailDelete');
    if (btnDelete) btnDelete.onclick = () => this.confirmDeleteEmployee(emp.id, emp.fullName);

    const body = document.getElementById('empDetailBody');
    if (!body) return;

    body.innerHTML = `
      <!-- Profile Hero Banner -->
      <div class="profile-hero">
        <img class="profile-hero-avatar" src="${emp.avatar || fallbackAvatar}" alt="${emp.fullName}" onerror="this.src='${fallbackAvatar}'" />
        <div class="profile-hero-info">
          <div class="profile-hero-name">
            <span>${emp.fullName}</span>
            <span style="font-size: 15px; font-weight: 700; color: var(--joy-primary);">${emp.id}</span>
          </div>
          <div class="profile-hero-role">${emp.position} &bull; ${emp.department}</div>
          <div class="profile-hero-tags">
            <span class="badge badge-active">${emp.status}</span>
            <span class="badge badge-game">Dự án: ${emp.gameProject}</span>
            <span class="badge badge-outline">Cấp bậc: ${emp.level}</span>
            <span class="badge ${docStatus.isComplete ? 'badge-active' : 'badge-danger'}">
              ${docStatus.isComplete ? '✅ Hồ sơ đầy đủ 100%' : `⚠️ Thiếu ${docStatus.missing.length} tệp giấy tờ`}
            </span>
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="modal-tabs">
        <button class="modal-tab-btn ${this.activeDetailTab === 'personal' ? 'active' : ''}" onclick="JoyApp.switchDetailTab('personal')">
          <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: -2px;">person</span> Thông Tin Cá Nhân
        </button>
        <button class="modal-tab-btn ${this.activeDetailTab === 'job' ? 'active' : ''}" onclick="JoyApp.switchDetailTab('job')">
          <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: -2px;">badge</span> Công Việc &amp; Hợp Đồng
        </button>
        <button class="modal-tab-btn ${this.activeDetailTab === 'documents' ? 'active' : ''}" onclick="JoyApp.switchDetailTab('documents')">
          <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: -2px;">folder_shared</span> Kho Tài Liệu Số (${(emp.documents || []).length})
        </button>
        <button class="modal-tab-btn ${this.activeDetailTab === 'history' ? 'active' : ''}" onclick="JoyApp.switchDetailTab('history')">
          <span class="material-symbols-outlined" style="font-size: 16px; vertical-align: -2px;">history_edu</span> Lịch Sử &amp; Ghi Chú
        </button>
      </div>

      <!-- TAB 1: THÔNG TIN CÁ NHÂN -->
      <div class="tab-pane ${this.activeDetailTab === 'personal' ? 'active' : ''}" id="tab-pane-personal">
        <div class="info-field-grid">
          <div class="info-item">
            <span class="info-label">Số Căn Cước Công Dân</span>
            <span class="info-value" style="color: var(--joy-primary); font-family: monospace; font-size: 16px;">${emp.idCard || 'Chưa cập nhật'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Ngày Cấp CCCD</span>
            <span class="info-value">${this.formatVnDate(emp.idCardDate) || '---'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Nơi Cấp CCCD</span>
            <span class="info-value">${emp.idCardPlace || 'Cục Cảnh sát QLHC về TTXH'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Ngày Sinh / Giới Tính</span>
            <span class="info-value">${this.formatVnDate(emp.birthDate) || '---'} (${emp.gender || 'Nam'})</span>
          </div>
          <div class="info-item">
            <span class="info-label">Số Điện Thoại</span>
            <span class="info-value">${emp.phone || '---'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email JoyGames</span>
            <span class="info-value">${emp.workEmail || '---'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email Cá Nhân</span>
            <span class="info-value">${emp.personalEmail || '---'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Quê Quán</span>
            <span class="info-value">${emp.hometown || '---'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Trình Độ Học Vấn</span>
            <span class="info-value">${emp.education || 'Đại học'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Tình Trạng Hôn Nhân</span>
            <span class="info-value">${emp.maritalStatus || 'Độc thân'}</span>
          </div>
        </div>
        <div class="info-item" style="margin-top: 10px;">
          <span class="info-label">Địa Chỉ Thường Trú / Nơi Ở Hiện Tại</span>
          <span class="info-value">${emp.address || 'Chưa cập nhật địa chỉ'}</span>
        </div>
      </div>

      <!-- TAB 2: CÔNG VIỆC & HỢP ĐỒNG -->
      <div class="tab-pane ${this.activeDetailTab === 'job' ? 'active' : ''}" id="tab-pane-job">
        <div class="info-field-grid">
          <div class="info-item">
            <span class="info-label">Phòng Ban</span>
            <span class="info-value">${emp.department}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Chức Vụ</span>
            <span class="info-value">${emp.position}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Dự Án Trọng Điểm</span>
            <span class="info-value">${emp.gameProject}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Người Quản Lý Trực Tiếp</span>
            <span class="info-value">${emp.manager || 'Ban Giám Đốc'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Ngày Vào Làm (JoyGames)</span>
            <span class="info-value">${this.formatVnDate(emp.joinDate) || '---'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Công Ty / Pháp Nhân</span>
            <span class="info-value" style="font-weight: 700; color: var(--text-primary);">${emp.company || 'JoyGames Studio (Hà Nội)'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Loại Công Việc</span>
            <span class="info-value" style="color: #38bdf8; font-weight: 600;">${emp.workType || 'Full Time'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Loại Hợp Đồng Lao Động</span>
            <span class="info-value" style="color: var(--joy-primary);">${emp.contractType || '---'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Số Hợp Đồng</span>
            <span class="info-value">${emp.contractNumber || '---'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Thời Hạn HĐ</span>
            <span class="info-value">${this.formatVnDate(emp.contractStart) || '---'} đến ${emp.contractEnd === 'Không thời hạn' ? 'Không thời hạn' : this.formatVnDate(emp.contractEnd)}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Mức Lương Cơ Bản</span>
            <span class="info-value" style="font-size: 16px; color: var(--joy-accent-green); font-weight: 800;">
              ${(emp.baseSalary || 0).toLocaleString('vi-VN')} VNĐ
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Phụ Cấp Trách Nhiệm / Ăn Trưa</span>
            <span class="info-value">${(emp.allowance || 0).toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div class="info-item">
            <span class="info-label">Tài Khoản Nhận Lương</span>
            <span class="info-value">${emp.bankAccount || 'Chưa cung cấp'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Mã Số Thuế Cá Nhân</span>
            <span class="info-value">${emp.taxId || '---'}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Mã Số Sổ BHXH</span>
            <span class="info-value">${emp.insuranceId || '---'}</span>
          </div>
        </div>
      </div>

      <!-- TAB 3: KHO TÀI LIỆU SỐ (DOCUMENT VAULT) -->
      <div class="tab-pane ${this.activeDetailTab === 'documents' ? 'active' : ''}" id="tab-pane-documents">
        <div class="doc-vault-container">
          <!-- Checklist tình trạng hồ sơ bắt buộc -->
          <div class="card" style="padding: 16px; background: var(--bg-surface-alt);">
            <div style="font-size: 13.5px; font-weight: 700; color: var(--text-main); margin-bottom: 10px;">
              📋 Danh Mục Hồ Sơ Bắt Buộc Theo Quy Định JoyGames Studio:
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px;">
              ${DOCUMENT_TYPES.filter(t => t.required).map(t => {
                const hasDoc = (emp.documents || []).some(d => d.type === t.key);
                return `
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 12.5px;">
                    <span class="material-symbols-outlined" style="font-size: 18px; color: ${hasDoc ? 'var(--joy-accent-green)' : 'var(--joy-accent-red)'}">
                      ${hasDoc ? 'check_circle' : 'cancel'}
                    </span>
                    <span style="color: ${hasDoc ? 'var(--text-main)' : 'var(--joy-accent-red)'}; font-weight: ${hasDoc ? '500' : '600'}">
                      ${t.label}
                    </span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Nút tải tài liệu mới -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-size: 15px; font-weight: 700; color: var(--text-main);">
              Danh Sách Tệp Đã Lưu Trữ (${(emp.documents || []).length})
            </h4>
            <button class="btn btn-primary btn-sm" onclick="JoyApp.openUploadDocModal('${emp.id}')">
              <span class="material-symbols-outlined">upload_file</span> Tải Lên Tệp Mới
            </button>
          </div>

          <!-- Danh sách tệp -->
          ${(!emp.documents || emp.documents.length === 0) ? `
            <div class="empty-state" style="padding: 30px;">
              <span class="material-symbols-outlined empty-state-icon">folder_off</span>
              <div>Chưa có tệp tài liệu số nào được lưu trữ cho nhân viên này</div>
              <button class="btn btn-secondary btn-sm" style="margin-top: 10px;" onclick="JoyApp.openUploadDocModal('${emp.id}')">
                Tải lên ngay
              </button>
            </div>
          ` : `
            <div class="doc-grid">
              ${emp.documents.map(doc => {
                const isPdf = doc.fileType === 'PDF';
                return `
                  <div class="doc-card">
                    <div class="doc-card-top">
                      <div class="doc-icon">
                        <span class="material-symbols-outlined">${isPdf ? 'picture_as_pdf' : 'image'}</span>
                      </div>
                      <div class="doc-name-wrap">
                        <div class="doc-name" title="${doc.name}">${doc.name}</div>
                        <div class="doc-meta">${doc.fileType} &bull; ${doc.fileSize} &bull; ${doc.uploadDate}</div>
                      </div>
                    </div>
                    <div class="doc-card-actions">
                      <button class="btn btn-outline btn-sm" onclick="JoyApp.previewDocument('${doc.name}', '${doc.url || ''}', '${doc.fileType}')">
                        <span class="material-symbols-outlined" style="font-size: 15px;">visibility</span> Xem
                      </button>
                      <button class="btn btn-danger btn-sm" onclick="JoyApp.deleteDocument('${emp.id}', '${doc.id}')" title="Xóa tài liệu">
                        <span class="material-symbols-outlined" style="font-size: 15px;">delete</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>

      <!-- TAB 4: LỊCH SỬ & GHI CHÚ -->
      <div class="tab-pane ${this.activeDetailTab === 'history' ? 'active' : ''}" id="tab-pane-history">
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">Ghi Chú Nhân Sự Nội Bộ:</h4>
          <div style="background: var(--bg-surface-alt); padding: 14px 18px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); font-size: 13.5px; color: var(--text-secondary);">
            ${emp.notes || 'Chưa có ghi chú đặc biệt.'}
          </div>
        </div>

        <h4 style="font-size: 14px; font-weight: 700; color: var(--text-main); margin-bottom: 14px;">Quá Trình Công Tác &amp; Cột Mốc Tại JoyGames:</h4>
        <div class="timeline-list">
          ${(!emp.milestones || emp.milestones.length === 0) ? `
            <div style="font-size: 13px; color: var(--text-muted);">Chưa có ghi nhận cột mốc</div>
          ` : emp.milestones.map(m => `
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-date">${m.date}</div>
              <div class="timeline-title">${m.title}</div>
              <div class="timeline-desc">${m.desc}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.openModal('modalEmpDetail');
  },

  switchDetailTab(tabName) {
    this.activeDetailTab = tabName;
    document.querySelectorAll('.modal-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));

    const activeBtn = Array.from(document.querySelectorAll('.modal-tab-btn')).find(b => b.textContent.includes(
      tabName === 'personal' ? 'Cá Nhân' : (tabName === 'job' ? 'Công Việc' : (tabName === 'documents' ? 'Tài Liệu' : 'Lịch Sử'))
    ));
    if (activeBtn) activeBtn.classList.add('active');

    const activePane = document.getElementById(`tab-pane-${tabName}`);
    if (activePane) activePane.classList.add('active');
  },

  // ==========================================
  // MODAL ADD / EDIT EMPLOYEE FORM
  // ==========================================
  openAddEmployeeModal() {
    const title = document.getElementById('formModalTitle');
    if (title) title.innerHTML = `<span class="material-symbols-outlined" style="color: var(--joy-primary)">person_add</span> Thêm Mới Hồ Sơ Nhân Sự JoyGames`;

    document.getElementById('employeeForm').reset();
    document.getElementById('formEmpId').value = '';

    const nextId = HRStorage.generateNextId();
    document.getElementById('formDisplayId').value = nextId;

    // Yêu cầu: Thêm mới thì hợp đồng chọn mặc định Thử việc
    document.getElementById('formContractType').value = 'Thử việc';
    document.getElementById('formStatus').value = 'Thử việc';
    document.getElementById('formContractNumber').value = `HĐTV-JG/${new Date().getFullYear()}/${String(HRStorage.getAll().length + 1).padStart(3, '0')}`;

    // Xóa trắng các trường ngày và lương
    ['formBirthDate', 'formIdCardDate', 'formJoinDate', 'formContractStart', 'formContractEnd'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const salaryEl = document.getElementById('formBaseSalary');
    if (salaryEl) salaryEl.value = '';

    this.openModal('modalEmpForm');
  },

  openEditEmployeeModal(id) {
    const emp = HRStorage.getById(id);
    if (!emp) return;

    const title = document.getElementById('formModalTitle');
    if (title) title.innerHTML = `<span class="material-symbols-outlined" style="color: var(--joy-primary)">edit</span> Chỉnh Sửa Hồ Sơ Nhân Sự: ${emp.fullName}`;

    document.getElementById('formEmpId').value = emp.id;
    document.getElementById('formDisplayId').value = emp.id;
    document.getElementById('formFullName').value = emp.fullName || '';
    document.getElementById('formGender').value = emp.gender || 'Nam';
    document.getElementById('formBirthDate').value = this.formatVnDate(emp.birthDate);
    document.getElementById('formPhone').value = emp.phone || '';
    document.getElementById('formWorkEmail').value = emp.workEmail || '';
    document.getElementById('formIdCard').value = emp.idCard || '';
    document.getElementById('formIdCardDate').value = this.formatVnDate(emp.idCardDate);
    document.getElementById('formIdCardPlace').value = emp.idCardPlace || 'Cục Cảnh sát QLHC về TTXH';
    document.getElementById('formHometown').value = emp.hometown || '';
    document.getElementById('formAddress').value = emp.address || '';
    document.getElementById('formAvatar').value = emp.avatar || '';

    document.getElementById('formDepartment').value = emp.department || JOYGAMES_DEPARTMENTS[1];
    document.getElementById('formPosition').value = emp.position || '';
    document.getElementById('formLevel').value = emp.level || 'Middle';
    document.getElementById('formGameProject').value = emp.gameProject || JOYGAMES_PROJECTS[0];
    document.getElementById('formManager').value = emp.manager || '';
    document.getElementById('formJoinDate').value = this.formatVnDate(emp.joinDate);
    document.getElementById('formStatus').value = emp.status || 'Thử việc';

    document.getElementById('formContractType').value = emp.contractType || 'Thử việc';
    document.getElementById('formContractNumber').value = emp.contractNumber || '';
    document.getElementById('formContractStart').value = this.formatVnDate(emp.contractStart);
    document.getElementById('formContractEnd').value = emp.contractEnd === 'Không thời hạn' ? '' : this.formatVnDate(emp.contractEnd);
    document.getElementById('formBaseSalary').value = emp.baseSalary ? (Number(emp.baseSalary).toLocaleString('vi-VN') + ' đ') : '';
    document.getElementById('formBankAccount').value = emp.bankAccount || '';
    document.getElementById('formTaxId').value = emp.taxId || '';
    document.getElementById('formInsuranceId').value = emp.insuranceId || '';
    document.getElementById('formNotes').value = emp.notes || '';

    const eduEl = document.getElementById('formEducation');
    if (eduEl) eduEl.value = emp.education || 'Đại học';
    const maritalEl = document.getElementById('formMaritalStatus');
    if (maritalEl) maritalEl.value = emp.maritalStatus || 'Độc thân';
    const compEl = document.getElementById('formCompany');
    if (compEl) compEl.value = emp.company || 'JoyGames Studio (Hà Nội)';
    const workTypeEl = document.getElementById('formWorkType');
    if (workTypeEl) workTypeEl.value = emp.workType || 'Full Time';

    this.openModal('modalEmpForm');
  },

  handleFormSubmit(e) {
    e.preventDefault();

    const empId = document.getElementById('formEmpId').value;
    const isEdit = !!empId;
    const existingEmp = isEdit ? HRStorage.getById(empId) : null;

    const birthDateVal = this.toIsoDate(document.getElementById('formBirthDate').value.trim());
    const idCardDateVal = this.toIsoDate(document.getElementById('formIdCardDate').value.trim());
    const joinDateVal = this.toIsoDate(document.getElementById('formJoinDate').value.trim());
    const contractStartVal = this.toIsoDate(document.getElementById('formContractStart').value.trim());
    const contractEndRaw = document.getElementById('formContractEnd').value.trim();
    const contractEndVal = contractEndRaw ? this.toIsoDate(contractEndRaw) : 'Không thời hạn';
    const salaryVal = Number((document.getElementById('formBaseSalary').value || '').replace(/\D/g, '')) || 0;

    const newEmp = {
      id: isEdit ? empId : HRStorage.generateNextId(),
      fullName: document.getElementById('formFullName').value.trim(),
      gender: document.getElementById('formGender').value,
      birthDate: birthDateVal,
      phone: document.getElementById('formPhone').value.trim(),
      workEmail: document.getElementById('formWorkEmail').value.trim(),
      personalEmail: existingEmp?.personalEmail || '',
      idCard: document.getElementById('formIdCard').value.trim(),
      idCardDate: idCardDateVal,
      idCardPlace: document.getElementById('formIdCardPlace').value.trim(),
      hometown: document.getElementById('formHometown').value.trim(),
      address: document.getElementById('formAddress').value.trim(),
      avatar: document.getElementById('formAvatar').value.trim() || existingEmp?.avatar || '',

      department: document.getElementById('formDepartment').value,
      position: document.getElementById('formPosition').value.trim(),
      level: document.getElementById('formLevel').value,
      gameProject: document.getElementById('formGameProject').value,
      company: document.getElementById('formCompany')?.value || existingEmp?.company || 'JoyGames Studio (Hà Nội)',
      workType: document.getElementById('formWorkType')?.value || existingEmp?.workType || 'Full Time',
      education: document.getElementById('formEducation')?.value || existingEmp?.education || 'Đại học',
      maritalStatus: document.getElementById('formMaritalStatus')?.value || existingEmp?.maritalStatus || 'Độc thân',
      manager: document.getElementById('formManager').value.trim(),
      joinDate: joinDateVal,
      status: document.getElementById('formStatus').value,

      contractType: document.getElementById('formContractType').value,
      contractNumber: document.getElementById('formContractNumber').value.trim(),
      contractStart: contractStartVal,
      contractEnd: contractEndVal,
      baseSalary: salaryVal,
      allowance: existingEmp?.allowance || 2000000,
      bankAccount: document.getElementById('formBankAccount').value.trim(),
      taxId: document.getElementById('formTaxId').value.trim(),
      insuranceId: document.getElementById('formInsuranceId').value.trim(),
      notes: document.getElementById('formNotes').value.trim(),

      documents: existingEmp ? existingEmp.documents : [],
      milestones: existingEmp ? existingEmp.milestones : []
    };

    HRStorage.save(newEmp);
    this.closeModal('modalEmpForm');
    this.refreshAll();
    this.showToast(isEdit ? `Đã cập nhật thành công hồ sơ ${newEmp.fullName}!` : `Đã thêm mới nhân sự ${newEmp.fullName} (${newEmp.id})!`, 'success');

    // Mở lại modal chi tiết
    this.openEmployeeDetail(newEmp.id);
  },

  confirmDeleteEmployee(id, name) {
    if (confirm(`Bạn có chắc chắn muốn xóa hồ sơ nhân sự "${name}" (${id}) khỏi hệ thống JoyGames không?`)) {
      HRStorage.delete(id);
      this.closeModal('modalEmpDetail');
      this.refreshAll();
      this.showToast(`Đã xóa hồ sơ nhân sự ${name}!`, 'info');
    }
  },

  // ==========================================
  // DOCUMENT VAULT UPLOAD & PREVIEW & DELETE
  // ==========================================
  openUploadDocModal(empId) {
    document.getElementById('uploadDocEmpId').value = empId;
    document.getElementById('uploadDocName').value = '';
    document.getElementById('uploadDocFileInput').value = '';
    this.openModal('modalUploadDoc');
  },

  handleFileSelected(event) {
    const file = event.target.files[0];
    if (file) {
      document.getElementById('uploadDocName').value = file.name;
      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      document.getElementById('uploadDocFormat').value = isPdf ? 'PDF' : 'JPG';
    }
  },

  handleDocUpload(e) {
    e.preventDefault();
    const empId = document.getElementById('uploadDocEmpId').value;
    const docType = document.getElementById('uploadDocType').value;
    const docName = document.getElementById('uploadDocName').value.trim();
    const fileType = document.getElementById('uploadDocFormat').value;

    const newDoc = {
      type: docType,
      name: docName,
      fileType: fileType,
      fileSize: '2.1 MB',
      status: 'verified',
      url: fileType === 'JPG' ? 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80' : ''
    };

    HRStorage.addDocument(empId, newDoc);
    this.closeModal('modalUploadDoc');
    this.refreshAll();
    this.showToast(`Đã tải lên và lưu trữ thành công tệp "${docName}"!`, 'success');

    // Mở lại chi tiết
    this.activeDetailTab = 'documents';
    this.openEmployeeDetail(empId);
  },

  deleteDocument(empId, docId) {
    if (confirm('Bạn có chắc chắn muốn xóa tệp tài liệu này khỏi kho hồ sơ số?')) {
      HRStorage.removeDocument(empId, docId);
      this.refreshAll();
      this.showToast('Đã xóa tệp tài liệu!', 'info');
      this.activeDetailTab = 'documents';
      this.openEmployeeDetail(empId);
    }
  },

  previewDocument(name, url, fileType) {
    const titleEl = document.getElementById('previewDocTitle');
    const container = document.getElementById('previewDocContainer');
    if (titleEl) titleEl.textContent = `Tài liệu: ${name}`;

    if (container) {
      if (fileType === 'JPG' || fileType === 'PNG') {
        const previewUrl = url || 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80';
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; width: 100%;">
            <img src="${previewUrl}" alt="${name}" style="max-width: 100%; max-height: 480px; object-fit: contain; border-radius: var(--radius-md); box-shadow: var(--shadow-md);" />
            <span style="font-size: 13px; color: var(--text-muted);">Bản scan hình ảnh sắc nét được mã hóa lưu trữ bởi JoyGames</span>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 40px;">
            <span class="material-symbols-outlined" style="font-size: 64px; color: var(--joy-accent-red);">picture_as_pdf</span>
            <div style="font-size: 17px; font-weight: 700; color: var(--text-main);">${name}</div>
            <p style="font-size: 13.5px; color: var(--text-muted); max-width: 450px;">
              Tệp tài liệu PDF đã ký số và đối chiếu bản gốc hợp lệ với phòng Hành chính - Nhân sự JoyGames.
            </p>
            <button class="btn btn-secondary" onclick="JoyApp.showToast('Đang tải file PDF xuống...', 'info')">
              <span class="material-symbols-outlined">download</span> Tải Bản Đầy Đủ (.PDF)
            </button>
          </div>
        `;
      }
    }

    this.openModal('modalDocPreview');
  },

  // ==========================================
  // IN HỒ SƠ CHUẨN A4 (PRINT / EXPORT DOSSIER)
  // ==========================================
  printEmployeeProfile() {
    const emp = HRStorage.getById(this.currentEmployeeId);
    if (!emp) return;

    const docCheck = HRStorage.checkDocumentStatus(emp);
    const printContainer = document.getElementById('printDossierContainer');
    if (!printContainer) return;

    printContainer.classList.remove('no-print');
    printContainer.innerHTML = `
      <div class="print-header">
        <div class="print-logo-box">
          <div class="print-company-name">CÔNG TY CỔ PHẦN JOYGAMES</div>
          <div class="print-company-sub">Website: https://joygames.vn/ &bull; Hotline: 1900 xxxx</div>
          <div class="print-company-sub">Hệ Thống Quản Lý Hồ Sơ Nhân Sự (JoyGames HRMS)</div>
        </div>
        <div class="print-meta-box">
          <div><strong>Mã Nhân Viên:</strong> ${emp.id}</div>
          <div><strong>Ngày in hồ sơ:</strong> ${new Date().toLocaleDateString('vi-VN')}</div>
          <div><strong>Trạng thái:</strong> ${emp.status}</div>
        </div>
      </div>

      <div class="print-title">SƠ YẾU LÝ LỊCH VÀ HỒ SƠ LAO ĐỘNG</div>

      <!-- Phần 1: Thông tin cá nhân -->
      <div class="print-section">
        <div class="print-section-title">I. THÔNG TIN CÁ NHÂN</div>
        <div class="print-grid">
          <div class="print-item"><span class="print-item-label">Họ và tên:</span><span class="print-item-val"><strong>${emp.fullName}</strong></span></div>
          <div class="print-item"><span class="print-item-label">Giới tính:</span><span class="print-item-val">${emp.gender}</span></div>
          <div class="print-item"><span class="print-item-label">Ngày sinh:</span><span class="print-item-val">${emp.birthDate}</span></div>
          <div class="print-item"><span class="print-item-label">Quê quán:</span><span class="print-item-val">${emp.hometown || '---'}</span></div>
          <div class="print-item"><span class="print-item-label">Số CCCD / CMND:</span><span class="print-item-val"><strong>${emp.idCard || '---'}</strong></span></div>
          <div class="print-item"><span class="print-item-label">Ngày cấp / Nơi cấp:</span><span class="print-item-val">${emp.idCardDate || '---'} / ${emp.idCardPlace || ''}</span></div>
          <div class="print-item"><span class="print-item-label">Số điện thoại:</span><span class="print-item-val">${emp.phone}</span></div>
          <div class="print-item"><span class="print-item-label">Email công ty:</span><span class="print-item-val">${emp.workEmail}</span></div>
          <div class="print-item" style="grid-column: span 2;"><span class="print-item-label">Nơi ở hiện tại:</span><span class="print-item-val">${emp.address || '---'}</span></div>
        </div>
      </div>

      <!-- Phần 2: Thông tin công việc & Hợp đồng -->
      <div class="print-section">
        <div class="print-section-title">II. VỊ TRÍ CÔNG TÁC &amp; HỢP ĐỒNG LAO ĐỘNG</div>
        <div class="print-grid">
          <div class="print-item"><span class="print-item-label">Phòng ban:</span><span class="print-item-val"><strong>${emp.department}</strong></span></div>
          <div class="print-item"><span class="print-item-label">Chức danh chuyên môn:</span><span class="print-item-val">${emp.position}</span></div>
          <div class="print-item"><span class="print-item-label">Dự án Game phụ trách:</span><span class="print-item-val">${emp.gameProject}</span></div>
          <div class="print-item"><span class="print-item-label">Cấp bậc:</span><span class="print-item-val">${emp.level}</span></div>
          <div class="print-item"><span class="print-item-label">Ngày gia nhập JoyGames:</span><span class="print-item-val">${emp.joinDate}</span></div>
          <div class="print-item"><span class="print-item-label">Người quản lý trực tiếp:</span><span class="print-item-val">${emp.manager || 'Ban Giám Đốc'}</span></div>
          <div class="print-item"><span class="print-item-label">Loại hợp đồng:</span><span class="print-item-val"><strong>${emp.contractType}</strong></span></div>
          <div class="print-item"><span class="print-item-label">Số hợp đồng:</span><span class="print-item-val">${emp.contractNumber || '---'}</span></div>
          <div class="print-item"><span class="print-item-label">Mức lương cơ bản:</span><span class="print-item-val">${(emp.baseSalary || 0).toLocaleString('vi-VN')} VNĐ</span></div>
          <div class="print-item"><span class="print-item-label">Tài khoản ngân hàng:</span><span class="print-item-val">${emp.bankAccount || '---'}</span></div>
          <div class="print-item"><span class="print-item-label">Mã số thuế cá nhân:</span><span class="print-item-val">${emp.taxId || '---'}</span></div>
          <div class="print-item"><span class="print-item-label">Số sổ BHXH:</span><span class="print-item-val">${emp.insuranceId || '---'}</span></div>
        </div>
      </div>

      <!-- Phần 3: Danh mục tài liệu số hóa -->
      <div class="print-section">
        <div class="print-section-title">III. DANH MỤC HỒ SƠ TÀI LIỆU SỐ HÓA ĐÃ LƯU TRỮ (${docCheck.isComplete ? '100% ĐẦY ĐỦ' : `THIẾU ${docCheck.missing.length} GIẤY TỜ`})</div>
        <table class="print-docs-table">
          <thead>
            <tr>
              <th style="width: 40px;">STT</th>
              <th>Loại Tài Liệu Bắt Buộc</th>
              <th>Tên Tệp Đã Lưu</th>
              <th>Định Dạng</th>
              <th>Ngày Tải Lên</th>
              <th>Trạng Thái Đối Chiếu</th>
            </tr>
          </thead>
          <tbody>
            ${DOCUMENT_TYPES.map((t, idx) => {
              const file = (emp.documents || []).find(d => d.type === t.key);
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${t.label}</strong> ${t.required ? '(Bắt buộc)' : ''}</td>
                  <td>${file ? file.name : '<span style="color: red;">Chưa nộp</span>'}</td>
                  <td>${file ? file.fileType : '---'}</td>
                  <td>${file ? file.uploadDate : '---'}</td>
                  <td>${file ? 'Đã duyệt khớp bản gốc' : '<span style="color: red;">Cần bổ sung</span>'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Chữ ký xác nhận -->
      <div class="print-footer-signatures">
        <div class="print-sign-box">
          <div class="print-sign-title">NGƯỜI LAO ĐỘNG</div>
          <div>(Ký và ghi rõ họ tên)</div>
        </div>
        <div class="print-sign-box">
          <div class="print-sign-title">PHÒNG NHÂN SỰ JOYGAMES</div>
          <div>(Ký và ghi rõ họ tên)</div>
        </div>
        <div class="print-sign-box">
          <div class="print-sign-title">TỔNG GIÁM ĐỐC DUYỆT</div>
          <div>(Ký, đóng dấu)</div>
        </div>
      </div>
    `;

    setTimeout(() => {
      window.print();
      printContainer.classList.add('no-print');
    }, 200);
  },

  // ==========================================
  // RESET DỮ LIỆU MẪU & SAO LƯU
  // ==========================================
  resetDemoData() {
    if (confirm('Bạn có chắc chắn muốn đặt lại toàn bộ hệ thống về 12 hồ sơ nhân sự mẫu tiêu biểu của JoyGames không?')) {
      HRStorage.resetToDefaults();
      this.refreshAll();
      this.showToast('Đã phục hồi hoàn tất 12 hồ sơ nhân sự mẫu JoyGames!', 'success');
      this.switchPage('dashboard');
    }
  },

  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = HRStorage.importBackupJSON(e.target.result);
      if (result.success) {
        this.refreshAll();
        this.showToast(`Khôi phục thành công ${result.count} hồ sơ nhân sự từ file backup!`, 'success');
        this.switchPage('employees');
      } else {
        this.showToast(`Lỗi nhập dữ liệu: ${result.error}`, 'error');
      }
    };
    reader.readAsText(file);
  },

  // ==========================================
  // PROJECT ROTATION & REALLOCATION HANDLERS
  // ==========================================
  openRotateModal(targetEmpId = null, preselectedTargetProject = null) {
    const employees = HRStorage.getAll();
    const projects = HRStorage.getProjects();

    const empSelect = document.getElementById('rotateEmpSelect');
    if (empSelect) {
      empSelect.innerHTML = employees.map(e => `
        <option value="${e.id}">${e.fullName} (${e.id} - ${e.position} - ${e.gameProject || 'Chung'})</option>
      `).join('');
    }

    const projSelect = document.getElementById('rotateNewProject');
    if (projSelect) {
      projSelect.innerHTML = '<option value="">-- Chọn Dự Án Tiếp Nhận --</option>' + projects.map(p => `
        <option value="${p}">${p}</option>
      `).join('');
      if (preselectedTargetProject) {
        projSelect.value = preselectedTargetProject;
      }
    }

    // Thiết lập ngày bắt đầu mặc định là hôm nay
    const todayStr = new Date().toISOString().slice(0, 10);
    const dateInput = document.getElementById('rotateStartDate');
    if (dateInput) {
      dateInput.value = this.formatVnDate(todayStr);
    }

    // Chọn nhân viên mục tiêu
    const selectedId = targetEmpId || (employees[0] ? employees[0].id : null);
    if (selectedId && empSelect) {
      empSelect.value = selectedId;
      this.handleRotateEmpChange(selectedId);
    }

    // Reset lý do
    const reasonInput = document.getElementById('rotateReason');
    if (reasonInput) reasonInput.value = '';

    this.openModal('modalRotateProject');
  },

  openAddMemberToProjectModal(projectName) {
    this.openRotateModal(null, projectName);
  },

  handleRotateEmpChange(empId) {
    const emp = HRStorage.getById(empId);
    const currentProjInput = document.getElementById('rotateCurrentProject');
    const newRoleInput = document.getElementById('rotateNewRole');

    if (emp) {
      if (currentProjInput) currentProjInput.value = emp.gameProject || 'Khối Vận Hành Chung (All Projects)';
      if (newRoleInput) {
        newRoleInput.value = emp.position || '';
        newRoleInput.placeholder = `Chức danh mới (mặc định: ${emp.position})`;
      }
    }
  },

  handleRotateSubmit(e) {
    e.preventDefault();
    const empId = document.getElementById('rotateEmpSelect').value;
    const newProject = document.getElementById('rotateNewProject').value;
    const rotationType = document.getElementById('rotateType').value;
    const newRole = document.getElementById('rotateNewRole').value;
    const startDateRaw = document.getElementById('rotateStartDate').value;
    const startDate = this.parseVnDate(startDateRaw);
    const reason = document.getElementById('rotateReason').value;

    if (!empId || !newProject) {
      this.showToast('Vui lòng chọn nhân sự và dự án tiếp nhận!', 'error');
      return;
    }

    const updatedEmp = HRStorage.rotateProject(empId, {
      newProject,
      rotationType,
      newRole,
      startDate,
      reason
    });

    if (updatedEmp) {
      this.closeModal('modalRotateProject');
      this.refreshAll();
      this.showToast(`Điều chuyển thành công ${updatedEmp.fullName} sang [${newProject}]! Lịch sử công tác đã cập nhật.`, 'success');
    } else {
      this.showToast('Có lỗi xảy ra khi điều chuyển nhân sự!', 'error');
    }
  },

  openAddProjectModal() {
    const input = document.getElementById('newProjectName');
    const codeInput = document.getElementById('newProjectCode');
    const phaseInput = document.getElementById('newProjectPhase');
    if (input) input.value = '';
    if (codeInput) codeInput.value = '';
    if (phaseInput) phaseInput.value = 'Production (Sprint)';
    this.openModal('modalAddProject');
  },

  handleProjectNameInput(val) {
    const codeInput = document.getElementById('newProjectCode');
    if (!codeInput) return;
    const clean = val.replace(/[()]/g, '').trim();
    if (!clean) return;
    const parts = clean.split(/\s+/).filter(Boolean);
    const code = parts.map(w => w[0]).join('').toUpperCase();
    if (code) {
      codeInput.value = code;
    }
  },

  handleAddProjectSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('newProjectName');
    const codeInput = document.getElementById('newProjectCode');
    const phaseInput = document.getElementById('newProjectPhase');

    const name = input ? input.value.trim() : '';
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    const phase = phaseInput ? phaseInput.value : 'Production (Sprint)';

    if (!name) {
      this.showToast('Vui lòng nhập tên dự án game!', 'error');
      return;
    }
    if (!code) {
      this.showToast('Vui lòng nhập mã định danh dự án!', 'error');
      return;
    }

    const created = HRStorage.addProject(name, code, phase);
    this.closeModal('modalAddProject');
    this.populateFilterDropdowns();
    this.renderProjectsGrid();
    this.renderDashboard();
    this.showToast(`Đã thêm thành công dự án mới [${created.code}] "${created.name}" vào cơ cấu JoyGames!`, 'success');
  },

  // Helper Modal Open/Close
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
    if (modalId === 'modalEmpDetail') {
      if (window.location.pathname.startsWith('/employees/')) {
        this.syncEmployeeFilterToUrl();
      }
    }
  },

  // ================================================================
  // TELEGRAM 2FA AUTHENTICATION & SECURITY CONTROLLER
  // ================================================================
  pendingAuthEmail: 'hr@joygames.vn',
  authResendTimer: null,

  initAuth() {
    this.initOtpDigitInputs();

    const session = HRStorage.getSession();
    const overlay = document.getElementById('authGateOverlay');

    if (session && session.token) {
      if (overlay) overlay.classList.add('hidden');
      this.updateHeaderUserProfile(session.email);
    } else {
      if (overlay) overlay.classList.remove('hidden');
      this.backToStep1();

      // Điền sẵn cấu hình bot nếu đã lưu
      const cfg = HRStorage.getTelegramConfig();
      const botInput = document.getElementById('authQuickBotToken');
      const chatInput = document.getElementById('authQuickChatId');
      if (botInput && cfg.botToken) botInput.value = cfg.botToken;
      if (chatInput && cfg.chatId) chatInput.value = cfg.chatId;
    }
  },

  updateHeaderUserProfile(email) {
    const emailEl = document.getElementById('headerUserEmail');
    const avatarEl = document.getElementById('headerUserAvatar');
    if (emailEl) emailEl.textContent = email || 'hr@joygames.vn';
    if (avatarEl) {
      const initial = (email || 'H').slice(0, 2).toUpperCase();
      avatarEl.textContent = initial;
    }
  },

  initOtpDigitInputs() {
    const digits = [1, 2, 3, 4, 5, 6].map(i => document.getElementById(`otp${i}`)).filter(Boolean);
    if (digits.length !== 6) return;

    digits.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        const val = e.target.value.replace(/\D/g, '');
        e.target.value = val ? val[0] : '';
        if (val) {
          input.classList.add('filled');
          if (index < 5) digits[index + 1].focus();
        } else {
          input.classList.remove('filled');
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && index > 0) {
          digits[index - 1].focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
          digits[index - 1].focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
          digits[index + 1].focus();
        }
      });

      input.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text').trim().replace(/\D/g, '');
        if (text) {
          for (let i = 0; i < 6; i++) {
            if (digits[i]) {
              digits[i].value = text[i] || '';
              if (text[i]) digits[i].classList.add('filled');
            }
          }
          const focusIndex = Math.min(text.length, 5);
          digits[focusIndex].focus();
        }
      });
    });
  },

  getEnteredOtp() {
    let otp = '';
    for (let i = 1; i <= 6; i++) {
      const el = document.getElementById(`otp${i}`);
      if (el) otp += el.value.trim();
    }
    return otp;
  },

  clearOtpInputs() {
    for (let i = 1; i <= 6; i++) {
      const el = document.getElementById(`otp${i}`);
      if (el) {
        el.value = '';
        el.classList.remove('filled');
      }
    }
  },

  // Gửi trực tiếp tin nhắn Telegram từ trình duyệt thông qua HTTPS Telegram Bot API
  async sendTelegramDirect(botToken, chatId, text) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown'
        })
      });
      return await res.json();
    } catch (e) {
      console.warn('Telegram direct fetch error:', e);
      return { ok: false, description: e.message || 'Lỗi mạng khi kết nối Telegram' };
    }
  },

  async handleRequestOtpSubmit(e) {
    if (e) e.preventDefault();
    const emailInput = document.getElementById('authEmailInput');
    const email = emailInput ? emailInput.value.trim() : 'hr@joygames.vn';
    this.pendingAuthEmail = email;

    const btn = document.getElementById('btnSendOtp');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span> Đang gửi OTP...';
    }

    // Đọc cấu hình bot từ storage hoặc từ ô quick config
    const cfg = HRStorage.getTelegramConfig();
    const quickBot = document.getElementById('authQuickBotToken');
    const quickChat = document.getElementById('authQuickChatId');
    const botToken = (quickBot && quickBot.value.trim()) || cfg.botToken || '';
    const chatId = (quickChat && quickChat.value.trim()) || cfg.chatId || '';

    // Tự động lưu nếu người dùng đã gõ vào ô cấu hình nhanh
    if (botToken || chatId) {
      HRStorage.saveTelegramConfig({ botToken, chatId });
    }

    // Luôn sinh mã OTP 6 chữ số an toàn
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem('joygames_current_otp', otp);
    sessionStorage.setItem('joygames_otp_email', email);
    sessionStorage.setItem('joygames_otp_expires', Date.now() + 5 * 60 * 1000);

    let sentToTelegram = false;
    let errorDesc = '';

    // 1. Thử qua Vercel/Local Serverless API trước (nếu có server chạy)
    let apiHandled = false;
    try {
      const res = await fetch('/api/send-telegram-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, botToken, chatId })
      });
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            sentToTelegram = data.sentToTelegram;
            apiHandled = true;
          }
        }
      }
    } catch (e) {
      // Bỏ qua lỗi server và chuyển sang chế độ client-direct
    }

    // 2. Nếu API không khả dụng và người dùng có điền Bot Token + Chat ID -> Bắn trực tiếp từ trình duyệt
    if (!apiHandled && botToken && chatId) {
      const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const msg = `🎮 *JOYGAMES HR PORTAL - MÃ XÁC THỰC OTP (2FA)*\n` +
                  `━━━━━━━━━━━━━━━━━━━━━━\n` +
                  `Mã OTP bảo mật của bạn là: \`${otp}\`\n\n` +
                  `⏰ Thời gian: *${now}*\n` +
                  `⏳ Hiệu lực: *5 phút*\n` +
                  `⚠️ _Tuyệt đối không chia sẻ mã này cho bất kỳ ai!_`;

      const tgRes = await this.sendTelegramDirect(botToken, chatId, msg);
      if (tgRes && tgRes.ok) {
        sentToTelegram = true;
      } else {
        errorDesc = tgRes ? tgRes.description : 'Không gửi được tin nhắn';
      }
    }

    // Cập nhật giao diện bước 2
    const banner = document.getElementById('authStep2Banner');
    if (banner) {
      if (sentToTelegram) {
        banner.innerHTML = `
          <span class="material-symbols-outlined" style="font-size: 20px; color: #4ade80; flex-shrink: 0;">check_circle</span>
          <div>Mã OTP 6 số đã được gửi trực tiếp vào <strong>Telegram</strong> của bạn! Vui lòng kiểm tra tin nhắn bot.</div>
        `;
      } else if (botToken && chatId) {
        banner.innerHTML = `
          <span class="material-symbols-outlined" style="font-size: 20px; color: #f59e0b; flex-shrink: 0;">warning</span>
          <div>Lỗi gửi Telegram: <em>${errorDesc || 'Kiểm tra lại Token/ChatId'}</em>.<br>Mã xác thực của bạn là: <strong>${otp}</strong> (hoặc mã dự phòng <strong>888888</strong>).</div>
        `;
      } else {
        banner.innerHTML = `
          <span class="material-symbols-outlined" style="font-size: 20px; color: #38bdf8; flex-shrink: 0;">info</span>
          <div>Chưa cấu hình Telegram Bot. Bạn có thể sử dụng mã OTP hệ thống tạo hiển thị bên dưới hoặc mã khẩn cấp <strong>888888</strong>.</div>
        `;
      }
    }

    // Cập nhật demo OTP display
    const demoDisplay = document.getElementById('demoOtpDisplay');
    if (demoDisplay) {
      demoDisplay.textContent = otp;
    }

    // Chuyển sang bước 2
    document.getElementById('authStep1').classList.remove('active');
    document.getElementById('authStep2').classList.add('active');
    this.clearOtpInputs();

    setTimeout(() => {
      const first = document.getElementById('otp1');
      if (first) first.focus();
    }, 150);

    this.startResendCountdown();
    this.showToast(sentToTelegram ? 'Mã OTP đã được gửi đến Telegram!' : 'Mã xác thực đã sẵn sàng!', 'success');

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  async handleVerifyOtpSubmit(e) {
    if (e) e.preventDefault();
    const otp = this.getEnteredOtp();
    if (otp.length < 6) {
      this.showToast('Vui lòng nhập đủ 6 chữ số mã xác thực OTP!', 'error');
      return;
    }

    const btn = document.getElementById('btnVerifyOtp');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s linear infinite;">sync</span> Đang xác thực...';
    }

    const email = this.pendingAuthEmail || 'hr@joygames.vn';
    const localOtp = sessionStorage.getItem('joygames_current_otp');
    const expires = parseInt(sessionStorage.getItem('joygames_otp_expires') || '0', 10);

    // Xác thực: Mã master 888888, 123456 hoặc mã local vừa tạo
    let isValid = false;
    if (otp === '888888' || otp === '123456') {
      isValid = true;
    } else if (localOtp && otp === localOtp && Date.now() <= expires) {
      isValid = true;
    } else {
      // Thử gọi server nếu có
      try {
        const res = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp })
        });
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const data = await res.json();
            if (data.success) isValid = true;
          }
        }
      } catch (err) {}
    }

    if (isValid) {
      HRStorage.setSession(email, 'token-' + Date.now());
      const overlay = document.getElementById('authGateOverlay');
      if (overlay) overlay.classList.add('hidden');
      this.updateHeaderUserProfile(email);
      this.showToast('Xác thực Telegram 2FA thành công! Chào mừng bạn vào cổng HR JoyGames.', 'success');
    } else {
      this.showToast('Mã xác thực OTP không chính xác hoặc đã hết hạn!', 'error');
      const row = document.getElementById('otpRow');
      if (row) {
        row.style.transform = 'translateX(-8px)';
        setTimeout(() => row.style.transform = 'translateX(8px)', 100);
        setTimeout(() => row.style.transform = 'translateX(0)', 200);
      }
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  backToStep1() {
    const s1 = document.getElementById('authStep1');
    const s2 = document.getElementById('authStep2');
    if (s1 && s2) {
      s2.classList.remove('active');
      s1.classList.add('active');
    }
  },

  handleResendOtp() {
    this.handleRequestOtpSubmit(null);
  },

  startResendCountdown() {
    let timeLeft = 60;
    const btn = document.getElementById('btnResendOtp');
    if (!btn) return;

    if (this.authResendTimer) clearInterval(this.authResendTimer);

    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 15px;">timer</span> Gửi lại (${timeLeft}s)`;

    this.authResendTimer = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(this.authResendTimer);
        btn.disabled = false;
        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 15px;">refresh</span> Gửi Lại Mã`;
      } else {
        btn.innerHTML = `<span class="material-symbols-outlined" style="font-size: 15px;">timer</span> Gửi lại (${timeLeft}s)`;
      }
    }, 1000);
  },

  fillDemoOtp() {
    const demoDisplay = document.getElementById('demoOtpDisplay');
    const code = (demoDisplay ? demoDisplay.textContent.trim() : '') || '888888';
    for (let i = 0; i < 6; i++) {
      const el = document.getElementById(`otp${i + 1}`);
      if (el) {
        el.value = code[i] || '';
        el.classList.add('filled');
      }
    }
    const sixth = document.getElementById('otp6');
    if (sixth) sixth.focus();
    this.handleVerifyOtpSubmit(null);
  },

  toggleAuthBotDrawer() {
    const drawer = document.getElementById('authBotDrawer');
    if (drawer) drawer.classList.toggle('show');
  },

  saveQuickBotConfig() {
    const botToken = document.getElementById('authQuickBotToken').value.trim();
    const chatId = document.getElementById('authQuickChatId').value.trim();
    HRStorage.saveTelegramConfig({ botToken, chatId });

    // Đồng bộ sang trang Cài Đặt
    const cfgBot = document.getElementById('cfgTelegramBotToken');
    const cfgChat = document.getElementById('cfgTelegramChatId');
    if (cfgBot) cfgBot.value = botToken;
    if (cfgChat) cfgChat.value = chatId;

    this.toggleAuthBotDrawer();
    this.showToast('Đã lưu cấu hình Bot Telegram nhận mã OTP!', 'success');
  },

  logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi cổng HR JoyGames?')) {
      HRStorage.clearSession();
      this.initAuth();
      this.showToast('Đã đăng xuất an toàn khỏi hệ thống!', 'info');
    }
  },

  loadTelegramSettingsUI() {
    const cfg = HRStorage.getTelegramConfig();
    const botInput = document.getElementById('cfgTelegramBotToken');
    const chatInput = document.getElementById('cfgTelegramChatId');
    if (botInput) botInput.value = cfg.botToken || '';
    if (chatInput) chatInput.value = cfg.chatId || '';
  },

  saveTelegramConfig(e) {
    if (e) e.preventDefault();
    const botToken = document.getElementById('cfgTelegramBotToken').value.trim();
    const chatId = document.getElementById('cfgTelegramChatId').value.trim();

    HRStorage.saveTelegramConfig({ botToken, chatId });

    // Đồng bộ sang drawer đăng nhập
    const quickBot = document.getElementById('authQuickBotToken');
    const quickChat = document.getElementById('authQuickChatId');
    if (quickBot) quickBot.value = botToken;
    if (quickChat) quickChat.value = chatId;

    this.showToast('Đã lưu cấu hình bảo mật Telegram Bot 2FA thành công!', 'success');
  },

  async testTelegramBot() {
    const botToken = document.getElementById('cfgTelegramBotToken').value.trim();
    const chatId = document.getElementById('cfgTelegramChatId').value.trim();
    const resultSpan = document.getElementById('telegramTestResult');

    if (!botToken || !chatId) {
      this.showToast('Vui lòng nhập cả Bot Token và Chat ID trước khi kiểm tra!', 'error');
      if (resultSpan) resultSpan.innerHTML = '<span style="color: #f87171;">Chưa điền đủ thông tin</span>';
      return;
    }

    if (resultSpan) resultSpan.innerHTML = '<span style="color: #38bdf8;">Đang kết nối tới Telegram API...</span>';

    try {
      const msg = `🎉 *JOYGAMES HR PORTAL - KẾT NỐI THÀNH CÔNG*\n` +
                  `━━━━━━━━━━━━━━━━━━━━━━\n` +
                  `Hệ thống quản lý nhân sự JoyGames đã liên kết thành công với tài khoản Telegram này để gửi mã OTP bảo mật 2 lớp (2FA)!`;

      let success = false;
      let errorMsg = '';

      // 1. Thử qua Vercel/Local Serverless API
      try {
        const res = await fetch('/api/test-telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botToken, chatId })
        });
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const data = await res.json();
            if (data.success) {
              success = true;
            } else {
              errorMsg = data.message;
            }
          }
        }
      } catch (e) {}

      // 2. Nếu API không khả dụng, gọi trực tiếp Telegram Bot API từ trình duyệt
      if (!success && !errorMsg) {
        const tgRes = await this.sendTelegramDirect(botToken, chatId, msg);
        if (tgRes && tgRes.ok) {
          success = true;
        } else {
          errorMsg = tgRes ? tgRes.description : 'Không thể kết nối Telegram';
        }
      }

      if (success) {
        if (resultSpan) {
          resultSpan.innerHTML = '<span style="color: #4ade80; font-weight: 600;">✔ Đã gửi tin nhắn test tới Telegram thành công!</span>';
        }
        this.showToast('Đã gửi tin nhắn kiểm tra tới Telegram thành công!', 'success');
      } else {
        if (resultSpan) {
          resultSpan.innerHTML = `<span style="color: #f87171;">✖ Thất bại: ${errorMsg || 'Lỗi kết nối'}</span>`;
        }
        this.showToast(errorMsg || 'Không gửi được tin nhắn Telegram', 'error');
      }
    } catch (err) {
      if (resultSpan) {
        resultSpan.innerHTML = '<span style="color: #f87171;">✖ Lỗi kết nối mạng</span>';
      }
      this.showToast('Lỗi kết nối tới máy chủ!', 'error');
    }
  },

  // Toast Notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'error') icon = 'error';

    toast.innerHTML = `
      <span class="material-symbols-outlined" style="font-size: 20px; color: ${type === 'success' ? 'var(--joy-accent-green)' : (type === 'error' ? 'var(--joy-accent-red)' : 'var(--joy-primary)')};">${icon}</span>
      <span style="flex: 1;">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Khởi chạy khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
  JoyApp.init();
});
