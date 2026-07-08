import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { centerService } from '../../services/centerService';
import { parentService } from '../../services/parentService';
import { studentService } from '../../services/studentService';
import { reviewService } from '../../services/reviewService';
import { normalizePagedResponse, unwrapData } from '../../utils/apiResponse';
import styles from './CenterReviewsPage.module.css';

const CenterReviewsPage = ({ role, onNavigate }) => {
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState('');
  const [centerName, setCenterName] = useState('');
  
  // All reviews for statistics calculation
  const [allReviews, setAllReviews] = useState([]);
  
  // Parent names lookup map
  const [parentMap, setParentMap] = useState({});

  // Stats states (calculated client-side)
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageStars: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  // Client-side pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial configuration (Centers for Admin, Center profile for Center, and Parent list for name mapping)
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError('');
      try {
        let parentsList = [];

        if (role === 'Admin') {
          // Fetch centers
          const res = await adminService.getAllCenters({ page: 1, pageSize: 100 });
          const normalized = normalizePagedResponse(res);
          setCenters(normalized.items || []);

          // Fetch parents list for Admin lookup
          const pRes = await adminService.getAllParents({ page: 1, pageSize: 1000 }).catch(() => null);
          const pData = normalizePagedResponse(pRes);
          parentsList = pData.items || [];
        } else {
          // Center role gets its own centerId
          const profile = unwrapData(await centerService.getCenterProfile());
          const cId = profile?.centerId || profile?.id;
          if (cId) {
            setSelectedCenter(cId);
            setCenterName(profile?.name || 'Trung tâm của tôi');
          } else {
            setError('Không tìm thấy mã số trung tâm của tài khoản.');
          }

          // Fetch parents list for Center lookup
          const pRes = await parentService.getParents({ page: 1, pageSize: 1000 }).catch(() => null);
          parentsList = pRes?.items || pRes?.data || [];
        }

        // Build parents map for reviewer ID lookup
        const pMap = {};
        parentsList.forEach(p => {
          if (p.parentId) pMap[p.parentId] = p.fullName || p.name;
          if (p.userId) pMap[p.userId] = p.fullName || p.name;
          if (p.id) pMap[p.id] = p.fullName || p.name;
        });

        // For Center accounts, resolve parent userIds by loading student details
        if (role === 'Center' && parentsList.length > 0) {
          const studentIds = [];
          parentsList.forEach(p => {
            if (Array.isArray(p.students)) {
              p.students.forEach(s => {
                if (s.studentId && !studentIds.includes(s.studentId)) {
                  studentIds.push(s.studentId);
                }
              });
            }
          });

          if (studentIds.length > 0) {
            const studentDetailsPromises = studentIds.map(async (sid) => {
              try {
                const detailRes = await studentService.getStudentDetail(sid);
                return detailRes?.data || detailRes || null;
              } catch (_) {
                return null;
              }
            });

            const studentDetailsResults = await Promise.all(studentDetailsPromises);
            studentDetailsResults.forEach(detail => {
              if (detail && Array.isArray(detail.parents)) {
                detail.parents.forEach(p => {
                  if (p.userId) pMap[p.userId] = p.fullName || p.name;
                  if (p.parentId) pMap[p.parentId] = p.fullName || p.name;
                  if (p.id) pMap[p.id] = p.fullName || p.name;
                });
              }
            });
          }
        }

        setParentMap(pMap);

      } catch (err) {
        console.error('Lỗi khởi tạo cấu hình Đánh giá Trung tâm:', err);
        setError('Không thể kết nối đến máy chủ để tải thông tin.');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [role]);

  // Load and calculate stats when selectedCenter changes
  useEffect(() => {
    if (!selectedCenter) {
      setAllReviews([]);
      setStats({
        totalReviews: 0,
        averageStars: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      });
      return;
    }

    const loadReviews = async () => {
      setLoadingReviews(true);
      setCurrentPage(1);
      try {
        // Fetch 1000 reviews at once to do stats and client-side pagination
        const res = await reviewService.getCenterReviews(selectedCenter, 1, 1000);
        const data = res?.result || res?.data || res || {};
        const items = data.items || [];
        
        setAllReviews(items);

        // Calculate stats client-side
        const total = items.length;
        let sum = 0;
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        
        items.forEach(item => {
          const stars = Math.min(5, Math.max(1, Number(item.stars || 0)));
          sum += stars;
          dist[stars] = (dist[stars] || 0) + 1;
        });

        setStats({
          totalReviews: total,
          averageStars: total > 0 ? sum / total : 0,
          distribution: dist
        });
      } catch (err) {
        console.error('Lỗi khi tải đánh giá trung tâm:', err);
      } finally {
        setLoadingReviews(false);
      }
    };

    loadReviews();
  }, [selectedCenter]);

  const handleCenterChange = (cId) => {
    setSelectedCenter(cId);
  };

  // Pagination slicing
  const totalPages = Math.ceil(allReviews.length / pageSize) || 1;
  const paginatedReviews = allReviews.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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

  const renderStarRating = (rating) => {
    const stars = [];
    const score = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span
          key={i}
          className={`material-symbols-outlined ${i <= score ? styles.starFilled : styles.starEmpty}`}
          style={{ color: i <= score ? '#EAB308' : '#D1D5DB' }}
        >
          star
        </span>
      );
    }
    return stars;
  };

  return (
    <div className={styles.reviewsRoot}>
      <main className={styles.mainContent}>
        <div className={styles.container}>
          
          {/* Header */}
          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>Quản lý đánh giá trung tâm</h1>
              <nav className={styles.breadcrumb}>
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate(role === 'Admin' ? 'admin-dashboard' : 'dashboard'); }}>
                  Dashboard
                </a>
                <span className={styles.breadcrumbSeparator}>/</span>
                <span className={styles.breadcrumbCurrent}>Đánh giá trung tâm</span>
              </nav>
            </div>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <span className="material-symbols-outlined">error</span>
              <p>{error}</p>
            </div>
          )}

          {/* Filters Card */}
          {!loading && role === 'Admin' && (
            <div className={styles.filterCard}>
              <div className={styles.filterGroup}>
                <div className={styles.selectWrapper}>
                  <label className={styles.selectLabel}>Chọn Trung tâm</label>
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
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className={styles.loadingOverlay}>
              <div className={styles.spinner} />
              <span>Đang cấu hình dữ liệu...</span>
            </div>
          )}

          {/* Main Bento Grid layout */}
          {!loading && !selectedCenter && (
            <div className={styles.emptyPlaceholder}>
              <span className="material-symbols-outlined">school</span>
              <p>Vui lòng chọn trung tâm để xem báo cáo thống kê và chi tiết đánh giá chất lượng.</p>
            </div>
          )}

          {!loading && selectedCenter && (
            <>
              {loadingReviews && allReviews.length === 0 ? (
                <div className={styles.loadingOverlay}>
                  <div className={styles.spinner} />
                  <span>Đang tải đánh giá...</span>
                </div>
              ) : allReviews.length === 0 ? (
                <div className={styles.emptyPlaceholder}>
                  <span className="material-symbols-outlined">rate_review</span>
                  <p>Trung tâm {role === 'Center' ? `"${centerName}"` : ''} chưa nhận được lượt đánh giá nào từ phụ huynh.</p>
                </div>
              ) : (
                <div className={styles.bentoGrid}>
                  
                  {/* Left Column: Client-side Aggregated Statistics */}
                  <div className={styles.leftColumn}>
                    <div className={styles.glassCard}>
                      <h4 className={styles.cardTitle}>Thống kê tổng quan</h4>
                      
                      <div className={styles.avgStarsContainer}>
                        <div className={styles.avgStarsNumber}>
                          {stats.averageStars.toFixed(1)}
                        </div>
                        <div className={styles.avgStarsStars}>
                          {renderStarRating(stats.averageStars)}
                        </div>
                        <p className={styles.avgStarsCount}>
                          Dựa trên <strong>{stats.totalReviews}</strong> đánh giá từ phụ huynh
                        </p>
                      </div>

                      {/* Distribution graph */}
                      <div className={styles.distributionContainer}>
                        {[5, 4, 3, 2, 1].map(stars => {
                          const count = stats.distribution[stars] || 0;
                          const percent = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                          return (
                            <div key={stars} className={styles.distributionRow}>
                              <span className={styles.distStarLabel}>{stars} ★</span>
                              <div className={styles.distProgressBg}>
                                <div
                                  className={styles.distProgressFill}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                              <span className={styles.distCountLabel}>
                                {count} ({Math.round(percent)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Detailed Reviews List */}
                  <div className={styles.reviewsCard}>
                    <div className={styles.reviewsCardHeader}>
                      <h4 className={styles.cardTitle}>Chi tiết phản hồi từ phụ huynh</h4>
                      <span className={styles.badge}>
                        {stats.totalReviews} lượt đánh giá
                      </span>
                    </div>

                    <div className={styles.reviewsList}>
                      {paginatedReviews.map((rev) => {
                        const pName = parentMap[rev.reviewerId] || 'Phụ huynh học sinh';
                        const initials = (pName !== 'Phụ huynh học sinh')
                          ? pName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                          : 'PH';

                        return (
                          <div key={rev.id} className={styles.reviewItem}>
                            <div className={styles.reviewItemHeader}>
                              <div className={styles.reviewItemUser}>
                                <div className={styles.avatarCircleMini}>{initials}</div>
                                <div>
                                  <h5>{pName}</h5>
                                  <span className={styles.reviewClass}>Vai trò: {rev.reviewerRole || 'Phụ huynh'}</span>
                                </div>
                              </div>
                              <div className={styles.reviewMeta}>
                                <div className={styles.reviewStars}>
                                  {renderStarRating(rev.stars)}
                                </div>
                                <span className={styles.reviewDate}>
                                  {formatReviewDate(rev.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className={styles.reviewComment}>
                              {rev.comment ? (
                                <p>"{rev.comment}"</p>
                              ) : (
                                <p className={styles.noCommentText}>Không để lại bình luận chi tiết.</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination control */}
                    {totalPages > 1 && (
                      <div className={styles.paginationRow}>
                        <button
                          className={styles.pageBtn}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          <span className="material-symbols-outlined">navigate_before</span>
                        </button>
                        <span className={styles.pageIndicator}>
                          Trang {currentPage} / {totalPages}
                        </span>
                        <button
                          className={styles.pageBtn}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <span className="material-symbols-outlined">navigate_next</span>
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default CenterReviewsPage;
