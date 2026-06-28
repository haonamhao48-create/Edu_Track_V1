import React, { useState, useEffect, useRef } from 'react';
import { studentService } from '../../services/studentService';
import { parentService } from '../../services/parentService';
import { authService } from '../../services/authService';
import styles from './LinkParentStudentPage.module.css';

const LinkParentStudentPage = ({ onNavigate }) => {
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form settings
  const [parentEmail, setParentEmail] = useState('');
  const [parentPassword, setParentPassword] = useState('Nhodoimatkhaunhe@@');
  const [useDefaultPassword, setUseDefaultPassword] = useState(true);
  const [selectedRelationship, setSelectedRelationship] = useState('father');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const isSubmittingRef = useRef(false);

  // Load students belonging to the Center
  useEffect(() => {
    const fetchAllStudents = async () => {
      setLoadingStudents(true);
      setErrorMsg('');
      try {
        const res = await studentService.getStudentsByCenter({ page: 1, pageSize: 100 });
        const list = res?.items || [];
        setStudents(list);
      } catch (err) {
        console.error('Lỗi khi tải danh sách học sinh:', err);
        setErrorMsg('Không thể tải danh sách học sinh từ hệ thống.');
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchAllStudents();
  }, []);

  // Fetch selected student detailed info to retrieve the LinkCode
  useEffect(() => {
    if (!selectedStudentId) {
      setSelectedStudent(null);
      return;
    }
    const fetchStudentDetail = async () => {
      setLoadingDetail(true);
      setErrorMsg('');
      try {
        const detail = await studentService.getStudentDetail(selectedStudentId);
        setSelectedStudent(detail);
      } catch (err) {
        console.error('Lỗi khi tải chi tiết học sinh:', err);
        setErrorMsg('Không thể tải chi tiết thông tin học sinh để lấy mã liên kết.');
      } finally {
        setLoadingDetail(false);
      }
    };
    fetchStudentDetail();
  }, [selectedStudentId]);

  const handleLink = async (e) => {
    if (e) e.preventDefault();
    if (isSubmittingRef.current) return;

    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedStudent) {
      setErrorMsg('Vui lòng chọn một học sinh để thực hiện liên kết.');
      return;
    }

    if (!selectedStudent.linkCode) {
      setErrorMsg('Học sinh này chưa có mã liên kết hợp lệ từ hệ thống.');
      return;
    }

    if (!parentEmail.trim()) {
      setErrorMsg('Vui lòng nhập Email phụ huynh.');
      return;
    }

    const passwordToUse = useDefaultPassword ? 'Nhodoimatkhaunhe@@' : parentPassword;
    if (!passwordToUse) {
      setErrorMsg('Vui lòng nhập mật khẩu tài khoản phụ huynh.');
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    const originalToken = localStorage.getItem('token');

    try {
      // Step 1: Login as Parent temporarily behind the scenes
      const loginRes = await authService.login(parentEmail.trim(), passwordToUse);
      const parentToken = loginRes.data?.token;

      if (!parentToken) {
        throw new Error('Đăng nhập tài khoản phụ huynh thất bại. Vui lòng kiểm tra lại email và mật khẩu phụ huynh.');
      }

      // Step 2: Set parent token
      localStorage.setItem('token', parentToken);

      // Map relationship type
      const relMap = {
        father: 'Cha',
        mother: 'Mẹ',
        guardian: 'Người giám hộ'
      };
      const relationshipText = relMap[selectedRelationship] || 'Người giám hộ';

      // Step 3: Call addStudentToParent endpoint using parent token context
      await parentService.addStudentToParent(selectedStudent.linkCode, relationshipText);

      // Clear parents cache
      sessionStorage.setItem('parents_needs_reload', 'true');

      setSuccessMsg(`Liên kết thành công phụ huynh ${parentEmail.trim()} với học sinh ${selectedStudent.fullName}!`);
      setTimeout(() => {
        onNavigate('parents');
      }, 2000);
    } catch (err) {
      isSubmittingRef.current = false;
      console.error(err);
      setErrorMsg(err.message || 'Đã xảy ra lỗi trong quá trình liên kết phụ huynh và học sinh.');
    } finally {
      // Step 4: Restore original Center token
      if (originalToken) {
        localStorage.setItem('token', originalToken);
      } else {
        localStorage.removeItem('token');
      }
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'HS';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div className={styles.linkRoot}>
                  
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Page Header */}
          <header className={styles.pageHeader}>
            <nav className={styles.breadcrumbs}>
              <span className={styles.breadcrumbLink} onClick={() => onNavigate('parents')}>Phụ huynh</span>
              <span className="material-symbols-outlined notranslate" translate="no">chevron_right</span>
              <span className={styles.breadcrumbCurrent}>Liên kết phụ huynh với học sinh</span>
            </nav>
            <h2 className={styles.pageTitle}>Liên kết phụ huynh với học sinh</h2>
            <p className={styles.pageSubtitle}>Tìm kiếm học sinh và liên kết tài khoản phụ huynh bằng xác thực tạm thời.</p>
          </header>

          {/* Feedback Messages */}
          {errorMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '16px', backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderRadius: '12px', border: '1px solid var(--outline-variant)', fontSize: '14px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>error</span>
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', marginBottom: '16px', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: '12px', border: '1px solid var(--outline-variant)', fontSize: '14px' }}>
              <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '20px' }}>check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <div className={styles.contentGrid}>
            {/* Left Column: Student Selection & Info */}
            <div className={styles.leftCol}>
              {/* Student Selector Card */}
              <div className={styles.card}>
                <h4 className={styles.cardTitle}>Chọn học sinh của trung tâm</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--on-surface-variant)' }}>Danh sách học sinh</label>
                  <select
                    className={styles.searchInput}
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    style={{ padding: '0 16px' }}
                    disabled={loadingStudents}
                  >
                    <option value="">-- Chọn học sinh --</option>
                    {students.map((student) => (
                      <option key={student.studentId} value={student.studentId}>
                        {student.fullName} ({student.email || 'Không có email'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Student Info Card */}
              {selectedStudent && (
                <div className={styles.card}>
                  <div className={styles.cardHeaderSmall}>
                    <span className={styles.cardBadge}>Thông tin học sinh</span>
                    <span className={`material-symbols-outlined notranslate ${styles.iconPrimary}`} translate="no">info</span>
                  </div>
                  
                  <div className={styles.studentProfile}>
                    <div className={styles.avatarWrapper}>
                      <span className="material-symbols-outlined notranslate" translate="no" style={{ fontSize: '32px', color: 'white' }}>person</span>
                    </div>
                    <div>
                      <h3 className={styles.studentName}>{selectedStudent.fullName}</h3>
                    </div>
                  </div>
                  
                  <div className={styles.studentMeta}>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Số điện thoại</span>
                      <span className={styles.metaValue}>{selectedStudent.phoneNumber || 'Không có'}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Email học sinh</span>
                      <span className={styles.metaValue}>{selectedStudent.email || 'Không có'}</span>
                    </div>
                    <div className={styles.metaRow} style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#e0f2fe', borderRadius: '8px' }}>
                      <span className={styles.metaLabel} style={{ color: 'var(--info)', fontWeight: 600 }}>Mã liên kết (Link Code)</span>
                      <span className={styles.metaValue} style={{ color: 'var(--info)', fontWeight: 700, fontFamily: 'monospace' }}>
                        {selectedStudent.linkCode || 'Không tìm thấy mã'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Accent Card */}
              <div className={styles.accentCard}>
                <div className={styles.circleLarge}></div>
                <div className={styles.circleSmall}></div>
                <span className={`material-symbols-outlined notranslate ${styles.accentIcon}`} translate="no">family_restroom</span>
                <p className={styles.accentText}>
                  Xây dựng mối liên kết chặt chẽ giữa nhà trường và gia đình để theo dõi tiến độ học tập tốt nhất.
                </p>
              </div>
            </div>

            {/* Right Column: Parent credentials & Relationship settings */}
            <div className={styles.rightCol}>
              {/* Parent Credentials form */}
              <div className={styles.card}>
                <h4 className={styles.cardTitle}>Xác thực tài khoản phụ huynh</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--on-surface-variant)' }}>Email đăng nhập của phụ huynh <span style={{ color: 'var(--error)' }}>*</span></label>
                    <input 
                      type="email" 
                      className={styles.searchInput} 
                      placeholder="Nhập email của phụ huynh đã tạo (ví dụ: nguyenvanf@gmail.com)"
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      style={{ padding: '0 16px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--on-surface-variant)' }}>Mật khẩu tài khoản phụ huynh <span style={{ color: 'var(--error)' }}>*</span></label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <input 
                          type="checkbox" 
                          checked={useDefaultPassword}
                          onChange={(e) => setUseDefaultPassword(e.target.checked)}
                        />
                        Sử dụng mật khẩu mặc định
                      </label>
                    </div>
                    {!useDefaultPassword ? (
                      <input 
                        type="password" 
                        className={styles.searchInput} 
                        placeholder="Nhập mật khẩu phụ huynh đã tạo"
                        value={parentPassword}
                        onChange={(e) => setParentPassword(e.target.value)}
                        style={{ padding: '0 16px' }}
                      />
                    ) : (
                      <div style={{ padding: '12px', background: '#f1f5f9', color: 'var(--text-muted)', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--outline-variant)' }}>
                        Hệ thống sẽ đăng nhập tự động bằng mật khẩu mặc định: <strong>Nhodoimatkhaunhe@@</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Configuration Section */}
              <div className={styles.card}>
                <h4 className={styles.cardTitle}>Thiết lập mối quan hệ</h4>
                <div className={styles.relationshipGrid}>
                  <label className={styles.relOption}>
                    <input 
                      type="radio" 
                      name="relationship" 
                      className={styles.relInput} 
                      checked={selectedRelationship === 'father'}
                      onChange={() => setSelectedRelationship('father')}
                    />
                    <div className={styles.relBox}>
                      <span className="material-symbols-outlined notranslate" translate="no">man</span>
                      <span>Cha</span>
                    </div>
                  </label>
                  
                  <label className={styles.relOption}>
                    <input 
                      type="radio" 
                      name="relationship" 
                      className={styles.relInput} 
                      checked={selectedRelationship === 'mother'}
                      onChange={() => setSelectedRelationship('mother')}
                    />
                    <div className={styles.relBox}>
                      <span className="material-symbols-outlined notranslate" translate="no">woman</span>
                      <span>Mẹ</span>
                    </div>
                  </label>
                  
                  <label className={styles.relOption}>
                    <input 
                      type="radio" 
                      name="relationship" 
                      className={styles.relInput} 
                      checked={selectedRelationship === 'guardian'}
                      onChange={() => setSelectedRelationship('guardian')}
                    />
                    <div className={styles.relBox}>
                      <span className="material-symbols-outlined notranslate" translate="no">supervisor_account</span>
                      <span>Người giám hộ</span>
                    </div>
                  </label>
                </div>
                
                <div className={styles.actionGroup}>
                  <button 
                    className={styles.btnPrimary} 
                    onClick={handleLink}
                    disabled={loading || loadingDetail}
                  >
                    <span className="material-symbols-outlined notranslate" translate="no">link</span>
                    {loading ? 'Đang thực hiện liên kết...' : 'Liên kết phụ huynh'}
                  </button>
                  <div className={styles.actionDivider}>hoặc</div>
                  <button 
                    className={styles.btnSecondary} 
                    onClick={() => onNavigate('parents')}
                  >
                    Hủy bỏ
                  </button>
                </div>
              </div>

              {/* Additional Context/Guidelines */}
              <div className={styles.guidelinesGrid}>
                <div className={styles.guidelineCard}>
                  <span className={`material-symbols-outlined notranslate ${styles.iconSecondary}`} translate="no">verified_user</span>
                  <div>
                    <h6 className={styles.guidelineTitle}>Bảo mật thông tin</h6>
                    <p className={styles.guidelineDesc}>Thông tin liên kết được bảo mật theo tiêu chuẩn EduTrack và được lưu trữ an toàn trong cơ sở dữ liệu.</p>
                  </div>
                </div>
                
                <div className={styles.guidelineCard}>
                  <span className={`material-symbols-outlined notranslate ${styles.iconTertiary}`} translate="no">sync</span>
                  <div>
                    <h6 className={styles.guidelineTitle}>Đồng bộ tự động</h6>
                    <p className={styles.guidelineDesc}>Sau khi liên kết, kết quả học tập và thông báo sẽ lập tức đồng bộ đến tài khoản phụ huynh.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LinkParentStudentPage;
