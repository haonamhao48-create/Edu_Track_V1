import React, { useState, useEffect } from 'react';
import { parentService } from '../../services/parentService';
import styles from './ParentsPage.module.css';

const ParentsPage = ({ onNavigate }) => {
  const [parents, setParents] = useState(() => {
    const cached = sessionStorage.getItem('cached_parents_page_1');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = sessionStorage.getItem('cached_parents_page_1');
    const needsReload = sessionStorage.getItem('parents_needs_reload') === 'true';
    return !cached || needsReload;
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-clear success message
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const [activeDropdown, setActiveDropdown] = useState(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(() => {
    const cachedTotal = sessionStorage.getItem('cached_parents_total');
    return cachedTotal ? parseInt(cachedTotal, 10) : 0;
  });

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');

  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);

  const fetchParents = async (overrideParams = {}) => {
    const activePage = overrideParams.page !== undefined ? overrideParams.page : page;
    const activeSearchTerm = overrideParams.searchTerm !== undefined ? overrideParams.searchTerm : searchTerm;
    const force = overrideParams.force === true;

    const isCacheable = !activeSearchTerm.trim();
    const needsReload = sessionStorage.getItem('parents_needs_reload') === 'true';

    if (needsReload || force) {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('cached_parents_page_') || key === 'cached_parents_total') {
          sessionStorage.removeItem(key);
        }
      });
    }

    const cacheKey = `cached_parents_page_${activePage}`;
    const hasCache = sessionStorage.getItem(cacheKey);

    if (isCacheable && !force && !needsReload && hasCache) {
      const cached = sessionStorage.getItem(cacheKey);
      const cachedTotal = sessionStorage.getItem('cached_parents_total');
      if (cached) {
        setParents(JSON.parse(cached));
      }
      if (cachedTotal) {
        setTotalCount(parseInt(cachedTotal, 10));
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      let parentName = null;
      let phoneNumber = null;
      let email = null;

      if (activeSearchTerm.trim()) {
        const q = activeSearchTerm.trim();
        // Check if query is email, phone, or name
        if (q.includes('@')) {
          email = q;
        } else if (/^\d+$/.test(q.replace(/[\s\-\+\(\)]/g, ''))) {
          phoneNumber = q.replace(/[\s\-\+\(\)]/g, ''); // strip visual formatting
        } else {
          parentName = q;
        }
      }

      const data = await parentService.getParents({
        page: activePage,
        pageSize,
        parentName,
        phoneNumber,
        email
      });

      const list = data?.items || [];
      setParents(list);
      setTotalCount(data?.totalCount || list.length);

      if (isCacheable) {
        sessionStorage.setItem(cacheKey, JSON.stringify(list));
        sessionStorage.setItem('cached_parents_total', (data?.totalCount || list.length).toString());
        sessionStorage.removeItem('parents_needs_reload');
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách phụ huynh:', err);
      setError('Không thể tải danh sách phụ huynh từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParents();
  }, [page]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setPage(1);
    fetchParents({ page: 1 });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setPage(1);
    fetchParents({ page: 1, searchTerm: '' });
  };

  const toggleDropdown = (id) => {
    setActiveDropdown(activeDropdown === id ? null : id);
  };

  const handleViewDetail = (parent) => {
    setActiveDropdown(null);
    setSelectedParent(parent);
    setShowDetailModal(true);
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  // Calculate some aggregate values for bento analytics
  const linkedCount = parents.filter(p => p.students && p.students.length > 0).length;

  return (
    <div className={styles.parentsRoot}>
                  
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h2 className={styles.pageTitle}>Quản lý phụ huynh</h2>
              <p className={styles.pageSubtitle}>
                Quản lý danh sách phụ huynh, thông tin liên hệ và liên kết với học sinh trong hệ thống EduTrack.
              </p>
            </div>
            <button className={styles.addBtn} onClick={() => onNavigate('create-parent')}>
              <span className="material-symbols-outlined notranslate" translate="no">person_add</span>
              Thêm phụ huynh mới
            </button>
          </div>

          {/* Filters Section */}
          <form onSubmit={handleSearchSubmit} className={styles.filterSection}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Tìm kiếm phụ huynh</label>
              <input
                className={styles.filterSelect}
                placeholder="Tìm theo họ tên, số điện thoại hoặc email..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className={styles.filterActions}>
              <button type="submit" className={styles.searchSubmitBtn}>
                <span className="material-symbols-outlined notranslate" translate="no">search</span>
                Tìm kiếm
              </button>
              <button 
                type="button" 
                className={styles.searchResetBtn} 
                onClick={handleResetFilters}
              >
                <span className="material-symbols-outlined notranslate" translate="no">restart_alt</span>
                Đặt lại
              </button>
            </div>
          </form>

          {/* Success Message */}
          {success && (
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>check_circle</span>
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>error</span>
              {error}
            </div>
          )}

          {/* Data Table Card */}
          <div className={`${styles.tableCard} ${styles.shadowSoft}`}>
            <div className={styles.tableResponsive}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Phụ huynh</th>
                    <th>Số điện thoại</th>
                    <th>Học sinh liên kết</th>
                    <th>Trạng thái</th>
                    <th className={styles.textRight}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="5" className={styles.textCenter} style={{ padding: '48px', textAlign: 'center' }}>
                        <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '36px', animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: '8px' }}>progress_activity</span>
                        <p>Đang tải danh sách phụ huynh...</p>
                      </td>
                    </tr>
                  ) : parents.length === 0 ? (
                    <tr>
                      <td colSpan="5" className={styles.textCenter} style={{ padding: '24px', textAlign: 'center' }}>Không tìm thấy phụ huynh nào.</td>
                    </tr>
                  ) : (
                    parents.map((parent) => {
                      const pId = parent.parentId || parent.id;
                      const initials = (parent.fullName || 'PH')
                        .split(' ')
                        .map(w => w[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr key={pId} className={styles.tableRow}>
                          <td>
                            <div className={styles.parentInfo}>
                              <div style={{
                                width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-fixed, var(--primary-container))', color: 'var(--primary, var(--primary))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 600, marginRight: '12px'
                              }}>
                                {initials}
                              </div>
                              <div>
                                <p className={styles.parentName}>{parent.fullName}</p>
                                <p className={styles.parentEmail}>{parent.email || 'Chưa cung cấp email'}</p>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={styles.parentPhone}>{parent.phoneNumber}</span>
                          </td>
                          <td>
                            <div className={styles.studentBadges}>
                              {parent.students && parent.students.length > 0 ? (
                                parent.students.map((student, idx) => (
                                  <span key={student.studentId || idx} className={styles.studentBadge}>
                                    {student.studentName} ({student.relationship})
                                  </span>
                                ))
                              ) : (
                                <span className={styles.noLinkText}>Chưa liên kết</span>
                              )}
                            </div>
                          </td>
                          <td>
                            {parent.isActive !== false ? (
                              <span className={`${styles.statusBadge} ${styles.statusActive}`}>
                                <span className={styles.dot}></span> Đang hoạt động
                              </span>
                            ) : (
                              <span className={`${styles.statusBadge} ${styles.statusLocked}`}>
                                <span className={styles.dot}></span> Đã vô hiệu hóa
                              </span>
                            )}
                          </td>
                          <td className={styles.textRight}>
                            <div className={styles.actionWrapper}>
                              <button 
                                className={styles.actionBtn}
                                onClick={() => toggleDropdown(pId)}
                                aria-label="Thao tác"
                                aria-haspopup="menu"
                                aria-expanded={activeDropdown === pId}
                              >
                                <span className="material-symbols-outlined notranslate" translate="no">more_vert</span>
                              </button>
                              
                              {activeDropdown === pId && (
                                <div className={styles.dropdownMenu}>
                                  <button className={styles.dropdownItem} onClick={() => handleViewDetail(parent)}>
                                    <span className="material-symbols-outlined notranslate text-md" translate="no">visibility</span> Xem chi tiết
                                  </button>

                                  <button className={styles.dropdownItem} onClick={() => {
                                    setActiveDropdown(null);
                                    setSuccess(`Yêu cầu đặt lại mật khẩu mặc định thành công cho phụ huynh ${parent.fullName}`);
                                  }}>
                                    <span className="material-symbols-outlined notranslate text-md" translate="no">lock_reset</span> Đặt lại mật khẩu
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalCount > 0 && (
              <div className={styles.pagination}>
                <p className={styles.pageInfo}>
                  Hiển thị <span>{Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)}</span> trên <span>{totalCount}</span> phụ huynh
                </p>
                <div className={styles.pageControls}>
                  <button 
                    className={styles.pageNavBtn} 
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    <span className="material-symbols-outlined notranslate text-[18px]" translate="no">chevron_left</span>
                  </button>
                  <button className={`${styles.pageNumBtn} ${styles.pageActive}`}>{page}</button>
                  <button 
                    className={styles.pageNavBtn} 
                    onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    <span className="material-symbols-outlined notranslate text-[18px]" translate="no">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Dashboard Analytics Preview */}
          <div className={styles.analyticsGrid}>
            <div className={`${styles.glassCard} ${styles.analyticCard}`}>
              <div className={`${styles.iconBox} ${styles.iconBoxPrimary}`}>
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              </div>
              <div>
                <p className={styles.analyticLabel}>Tổng phụ huynh</p>
                <p className={`${styles.analyticValue} ${styles.textPrimary}`}>{totalCount}</p>
              </div>
            </div>
            
            <div className={`${styles.glassCard} ${styles.analyticCard}`}>
              <div className={`${styles.iconBox} ${styles.iconBoxTertiary}`}>
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>link</span>
              </div>
              <div>
                <p className={styles.analyticLabel}>Đã liên kết</p>
                <p className={`${styles.analyticValue} ${styles.textTertiary}`}>{linkedCount} / {parents.length}</p>
              </div>
            </div>
            
            <div className={`${styles.glassCard} ${styles.analyticCard}`}>
              <div className={`${styles.iconBox} ${styles.iconBoxPrimary}`}>
                <span className="material-symbols-outlined notranslate" translate="no" style={{ fontVariationSettings: "'FILL' 1" }}>family_home</span>
              </div>
              <div>
                <p className={styles.analyticLabel}>Tỷ lệ liên kết</p>
                <p className={`${styles.analyticValue} ${styles.textPrimary}`}>
                  {totalCount > 0 ? `${Math.round((linkedCount / parents.length) * 100)}%` : '0%'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Parent Details Modal */}
      {showDetailModal && selectedParent && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowDetailModal(false)}>
          <div style={{
            backgroundColor: '#fff', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '500px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--primary)' }}>Thông tin phụ huynh</h2>
              <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <span className="material-symbols-outlined notranslate" translate="no">close</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--primary-container, var(--outline-variant))', color: 'var(--primary, var(--primary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600
                }}>
                  {(selectedParent.fullName || 'PH').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{selectedParent.fullName}</h3>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Số điện thoại</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{selectedParent.phoneNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Email</span>
                  <span style={{ fontWeight: 500, fontSize: '14px' }}>{selectedParent.email || 'Chưa cung cấp'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Trạng thái</span>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--success)' }}>Đang hoạt động</span>
                </div>
              </div>

              <div style={{ marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Học sinh liên kết ({selectedParent.students?.length || 0}):</h4>
                {selectedParent.students && selectedParent.students.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {selectedParent.students.map((st, i) => (
                      <div key={st.studentId || i} style={{ padding: '8px 12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--outline-variant)' }}>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: '14px' }}>{st.studentName}</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                          Mối quan hệ: {st.relationship} | Lớp: {st.classNames && st.classNames.length > 0 ? st.classNames.join(', ') : 'Chưa xếp lớp'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa liên kết học sinh nào.</p>
                )}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{
                    padding: '8px 24px', borderRadius: '8px', border: 'none', background: 'var(--primary, var(--primary))', color: '#fff', cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentsPage;
