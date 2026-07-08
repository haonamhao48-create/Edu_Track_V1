import React, { useState, useEffect, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import { teacherService } from '../../services/teacherService';
import { classService } from '../../services/classService';
import { reviewService } from '../../services/reviewService';
import { normalizePagedResponse } from '../../utils/apiResponse';
import teachersLookup from '../../data/teachers_lookup.json';
import styles from './TeacherReviewsPage.module.css';

const ROLE_LABELS = {
  1: 'Học sinh',
  3: 'Học sinh',
  2: 'Phụ huynh',
  5: 'Phụ huynh'
};

const TeacherReviewsPage = ({ role = 'Center', onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState('');
  
  // Selection states
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  
  const [classes, setClasses] = useState([]);
  
  // Review data states
  const [summary, setSummary] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch initial data (Centers for Admin, Teachers for Center)
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError('');
      try {
        if (role === 'Admin') {
          // Fetch centers
          const centerRes = await adminService.getAllCenters({ page: 1, pageSize: 100 });
          const normalized = normalizePagedResponse(centerRes);
          const centerList = normalized?.items || [];
          setCenters(centerList);
        } else {
          // Fetch Center's teachers
          const teacherRes = await teacherService.getTeachers({ page: 1, pageSize: 1000 });
          const teacherList = teacherRes?.items || [];
          setTeachers(teacherList);
          
          // Fetch Center's classes to display class names
          const classRes = await classService.getAllClasses().catch(() => []);
          const classList = Array.isArray(classRes) ? classRes : (classRes?.items || classRes?.data || []);
          setClasses(classList);
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu ban đầu:', err);
        setError('Không thể kết nối đến máy chủ để tải danh mục.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [role]);

  // Handle center change for Admin role
  const handleCenterChange = (centerId) => {
    setSelectedCenter(centerId);
    setSelectedTeacher('');
    setSummary(null);
    setReviews([]);
    
    if (centerId) {
      // Filter teachers belonging to this center from lookup data
      const filtered = teachersLookup.filter(t => t.CenterId === centerId);
      setTeachers(filtered);
    } else {
      setTeachers([]);
    }
  };

  // Fetch reviews and summary when selected teacher or page changes
  const fetchReviewsData = useCallback(async (teacherId, activePage = 1) => {
    if (!teacherId) return;
    setLoadingData(true);
    setError('');
    try {
      const [summaryRes, reviewsRes] = await Promise.all([
        reviewService.getTeacherReviewSummary(teacherId).catch(e => { console.warn('Lỗi gọi API Summary:', e); return null; }),
        reviewService.getTeacherReviews(teacherId, activePage, pageSize).catch(e => { console.warn('Lỗi gọi API Reviews List:', e); return null; })
      ]);

      if (summaryRes?.result) {
        setSummary(summaryRes.result);
      } else {
        setSummary(null);
      }

      if (reviewsRes?.result) {
        const resObj = reviewsRes.result;
        setReviews(resObj.reviews || []);
        setTotalPages(resObj.totalPages || 1);
        setTotalCount(resObj.totalReviews || 0);
      } else {
        setReviews([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Lỗi tải đánh giá giáo viên:', err);
      setError('Lỗi khi tải thông tin đánh giá giáo viên.');
    } finally {
      setLoadingData(false);
    }
  }, [pageSize]);

  useEffect(() => {
    if (selectedTeacher) {
      fetchReviewsData(selectedTeacher, page);
    } else {
      setSummary(null);
      setReviews([]);
    }
  }, [selectedTeacher, page, fetchReviewsData]);

  const handleTeacherChange = (teacherId) => {
    setSelectedTeacher(teacherId);
    setPage(1); // Reset page to 1
  };

  // Helper to render stars
  const renderStarRating = (rating) => {
    const stars = [];
    const rounded = Math.round(rating * 2) / 2; // round to nearest 0.5
    for (let i = 1; i <= 5; i++) {
      if (i <= rounded) {
        stars.push(<span key={i} className="material-symbols-outlined notranslate text-yellow-500" translate="no" style={{ color: '#EAB308', fontVariationSettings: "'FILL' 1" }}>star</span>);
      } else if (i - 0.5 === rounded) {
        stars.push(<span key={i} className="material-symbols-outlined notranslate text-yellow-500" translate="no" style={{ color: '#EAB308', fontVariationSettings: "'FILL' 1" }}>star_half</span>);
      } else {
        stars.push(<span key={i} className="material-symbols-outlined notranslate text-gray-300" translate="no" style={{ color: '#D1D5DB' }}>star</span>);
      }
    }
    return stars;
  };

  const getClassName = (classId) => {
    const cls = classes.find(c => (c.classId || c.studyClassId || c.id) === classId);
    return cls ? cls.className : 'Lớp học';
  };

  const formatReviewDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      let cleanStr = String(dateStr);
      if (!/Z$|[+-]\d{2}:?\d{2}$/i.test(cleanStr)) {
        cleanStr += 'Z';
      }
      const d = new Date(cleanStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour12: false
      }).replace(',', '');
    } catch (_) {
      return dateStr;
    }
  };

  const currentTeacherObj = teachers.find(t => (t.teacherId || t.id || t.Id) === selectedTeacher);

  return (
    <div className={styles.reviewsRoot}>
      <main className={styles.mainContent}>
        <div className={styles.container}>
          {/* Header */}
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>Quản lý đánh giá giáo viên</h1>
              <nav className={styles.breadcrumb}>
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(role === 'Admin' ? 'admin-dashboard' : 'dashboard'); }}>
                  Dashboard
                </a>
                <span className={styles.breadcrumbSeparator}>/</span>
                <span className={styles.breadcrumbCurrent}>Đánh giá giáo viên</span>
              </nav>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className={styles.errorBanner}>
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </div>
          )}

          {/* Filter Panel (Sleek selectors) */}
          <div className={styles.filterCard}>
            <div className={styles.filterGroup}>
              {role === 'Admin' && (
                <div className={styles.selectWrapper}>
                  <label className={styles.selectLabel}>Trung tâm</label>
                  <select
                    className={styles.select}
                    value={selectedCenter}
                    onChange={(e) => handleCenterChange(e.target.value)}
                  >
                    <option value="">-- Chọn Trung tâm --</option>
                    {centers.map(c => {
                      const cid = c.centerId || c.id;
                      return (
                        <option key={cid} value={cid}>
                          {c.name || c.centerName}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className={styles.selectWrapper}>
                <label className={styles.selectLabel}>Giáo viên</label>
                <select
                  className={styles.select}
                  value={selectedTeacher}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  disabled={role === 'Admin' && !selectedCenter}
                >
                  <option value="">
                    {role === 'Admin' && !selectedCenter ? 'Vui lòng chọn trung tâm trước' : '-- Chọn Giáo viên --'}
                  </option>
                  {teachers.map(t => {
                    const tid = t.teacherId || t.id || t.Id;
                    const name = t.fullName || t.name || t.FullName;
                    const expertise = t.Expertise || t.expertise || '';
                    return (
                      <option key={tid} value={tid}>
                        {name} {expertise ? `(${expertise})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Loading Overlay */}
          {loading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <span>Đang tải danh sách...</span>
            </div>
          )}

          {/* Bento Grid Content */}
          {!selectedTeacher ? (
            <div className={styles.emptyPlaceholder}>
              <span className="material-symbols-outlined">rate_review</span>
              <p>Vui lòng chọn giáo viên để xem báo cáo thống kê và chi tiết các đánh giá học tập.</p>
            </div>
          ) : (
            <div className={styles.bentoGrid}>
              
              {/* Left Column: Summary and Stats */}
              <div className={styles.leftColumn}>
                
                {/* Teacher Profile Info */}
                <div className={styles.glassCard}>
                  <div className={styles.profileHeader}>
                    <div className={styles.avatarCircle}>
                      {(currentTeacherObj?.fullName || currentTeacherObj?.name || currentTeacherObj?.FullName || 'T').charAt(0)}
                    </div>
                    <div>
                      <h3 className={styles.profileName}>{currentTeacherObj?.fullName || currentTeacherObj?.name || currentTeacherObj?.FullName}</h3>
                      <span className={styles.profileExpertise}>
                        Chuyên môn: {currentTeacherObj?.Expertise || currentTeacherObj?.expertise || 'Chưa cập nhật'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Star Ratings Summary (API 5) */}
                <div className={styles.glassCard}>
                  <h4 className={styles.cardTitle}>Thống kê tổng quan</h4>
                  
                  {loadingData && !summary ? (
                    <div className={styles.cardLoading}>Đang tải thống kê...</div>
                  ) : summary ? (
                    <div className={styles.summaryBody}>
                      {/* Big Average Star */}
                      <div className={styles.avgStarsContainer}>
                        <div className={styles.avgStarsNumber}>
                          {Number(summary.averageStars).toFixed(1)}
                        </div>
                        <div className={styles.avgStarsStars}>
                          {renderStarRating(summary.averageStars)}
                        </div>
                        <p className={styles.avgStarsCount}>
                          Dựa trên <strong>{summary.totalReviews}</strong> đánh giá
                        </p>
                      </div>

                      {/* Stars Distribution Bar Chart */}
                      <div className={styles.distributionContainer}>
                        {[5, 4, 3, 2, 1].map(stars => {
                          const count = summary.starDistribution?.[stars] || 0;
                          const percent = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
                          return (
                            <div key={stars} className={styles.distributionRow}>
                              <span className={styles.distStarLabel}>{stars} ★</span>
                              <div className={styles.distProgressBg}>
                                <div 
                                  className={styles.distProgressFill} 
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className={styles.distCountLabel}>{count} ({Math.round(percent)}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.noDataText}>Không tìm thấy thống kê đánh giá giáo viên này.</div>
                  )}
                </div>

              </div>

              {/* Right Column: Detailed Reviews List (API 4) */}
              <div className={styles.rightColumn}>
                <div className={`${styles.glassCard} ${styles.reviewsCard}`}>
                  <div className={styles.reviewsCardHeader}>
                    <h4 className={styles.cardTitle}>Chi tiết phản hồi từ Học sinh & Phụ huynh</h4>
                    <span className={styles.badge}>{totalCount} Đánh giá</span>
                  </div>

                  <div className={styles.reviewsList}>
                    {loadingData ? (
                      <div className={styles.cardLoading}>
                        <div className={styles.spinnerMini} />
                        <span>Đang tải các đánh giá...</span>
                      </div>
                    ) : reviews.length > 0 ? (
                      reviews.map((rev) => (
                        <div key={rev.id} className={styles.reviewItem}>
                          <div className={styles.reviewItemHeader}>
                            <div className={styles.reviewItemUser}>
                              <div className={styles.avatarCircleMini}>
                                {ROLE_LABELS[rev.reviewerRole]?.charAt(0) || 'N'}
                              </div>
                              <div>
                                <h5>{ROLE_LABELS[rev.reviewerRole] || 'Người đánh giá'}</h5>
                                {role === 'Center' && rev.classId && (
                                  <span className={styles.reviewClass}>Lớp: {getClassName(rev.classId)}</span>
                                )}
                              </div>
                            </div>
                            <div className={styles.reviewMeta}>
                              <div className={styles.reviewStars}>
                                {renderStarRating(rev.stars)}
                              </div>
                              <span className={styles.reviewDate}>{formatReviewDate(rev.createdAt || rev.updatedAt)}</span>
                            </div>
                          </div>
                          <div className={styles.reviewComment}>
                            {rev.comment ? (
                              <p>"{rev.comment}"</p>
                            ) : (
                              <p className={styles.noCommentText}>*Người dùng không để lại bình luận chi tiết.*</p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className={styles.noDataPlaceholder}>
                        <span className="material-symbols-outlined">rate_review</span>
                        <p>Giáo viên này chưa nhận được lượt đánh giá nào từ Học sinh hay Phụ huynh.</p>
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className={styles.paginationRow}>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setPage(p => Math.max(p - 1, 1))}
                        disabled={page === 1}
                      >
                        <span className="material-symbols-outlined">chevron_left</span>
                      </button>
                      <span className={styles.pageIndicator}>
                        Trang {page} / {totalPages}
                      </span>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                        disabled={page === totalPages}
                      >
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default TeacherReviewsPage;
