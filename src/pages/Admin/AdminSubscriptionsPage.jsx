import React, { useEffect, useMemo, useState } from 'react';
import ConfirmModal from '../../components/ConfirmModal';
import { subscriptionService } from '../../services/subscriptionService';
import styles from './AdminSubscriptionsPage.module.css';

const INITIAL_FORM = {
  name: '',
  price: '',
  duration: '',
  durationUnit: 'MONTH',
  maxUsers: '',
  maxClasses: '',
  maxStudentsPerClass: '',
  maxParentsPerClass: '',
};

const normalizeList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const parseBackendDateTime = (value) => {
  if (!value) return null;
  if (Array.isArray(value) && value.length >= 6) {
    const [
      year,
      month,
      day,
      hour = 0,
      minute = 0,
      second = 0,
      nanosecond = 0,
    ] = value;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Math.floor(Number(nanosecond) / 1000000),
    );
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const normalizePackage = (pkg) => ({
  ...pkg,
  id: String(pkg?.id || ''),
  name: pkg?.name || '',
  price: Number(pkg?.price || 0),
  duration: Number(pkg?.duration || 0),
  durationUnit: pkg?.durationUnit || 'MONTH',
  maxUsers: Number(pkg?.maxUsers || 0),
  maxClasses: pkg?.maxClasses ?? null,
  maxStudentsPerClass: pkg?.maxStudentsPerClass ?? null,
  maxParentsPerClass: pkg?.maxParentsPerClass ?? null,
  isActive: Boolean(pkg?.isActive),
  createdAt: parseBackendDateTime(pkg?.createdAt),
  updatedAt: parseBackendDateTime(pkg?.updatedAt),
});

const mapPackageToForm = (pkg) => ({
  name: pkg?.name || '',
  price: pkg?.price ?? '',
  duration: pkg?.duration ?? '',
  durationUnit: pkg?.durationUnit || 'MONTH',
  maxUsers: pkg?.maxUsers ?? '',
  maxClasses: pkg?.maxClasses ?? '',
  maxStudentsPerClass: pkg?.maxStudentsPerClass ?? '',
  maxParentsPerClass: pkg?.maxParentsPerClass ?? '',
});

const formatCurrency = (value) => {
  if (value === undefined || value === null || value === '') return '0 VND';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(value));
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = value instanceof Date ? value : parseBackendDateTime(value);
  if (!date) return '--';
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const formatOptionalLimit = (value) => {
  if (value === null || value === undefined || value === '') return 'Không giới hạn';
  return value;
};

const AdminSubscriptionsPage = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchPackages = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await subscriptionService.getAdminPackages();
      const normalizedPackages = normalizeList(response)
        .map(normalizePackage)
        .sort((left, right) => {
          if (left.isActive !== right.isActive) return left.isActive ? -1 : 1;
          return (right.createdAt?.getTime() || 0) - (left.createdAt?.getTime() || 0);
        });
      setPackages(normalizedPackages);
    } catch (fetchError) {
      setError(fetchError.message || 'Không thể tải danh sách gói đăng ký.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesSearch = !searchTerm.trim()
        || pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
        || pkg.id.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'ALL') return matchesSearch;
      if (statusFilter === 'ACTIVE') return matchesSearch && pkg.isActive;
      return matchesSearch && !pkg.isActive;
    });
  }, [packages, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: packages.length,
    active: packages.filter((pkg) => pkg.isActive).length,
    inactive: packages.filter((pkg) => !pkg.isActive).length,
  }), [packages]);

  const resetFormModal = () => {
    setShowFormModal(false);
    setEditingPackage(null);
    setForm(INITIAL_FORM);
    setFormError('');
  };

  const openCreateModal = () => {
    setError('');
    setFormError('');
    setEditingPackage(null);
    setForm(INITIAL_FORM);
    setShowFormModal(true);
  };

  const openEditModal = async (packageId) => {
    setError('');
    setFormError('');
    setLoadingDetail(true);

    try {
      const pkg = normalizePackage(await subscriptionService.getAdminPackageDetail(packageId));
      setEditingPackage(pkg);
      setForm(mapPackageToForm(pkg));
      setShowFormModal(true);
    } catch (fetchError) {
      setError(fetchError.message || 'Không thể tải chi tiết gói cần chỉnh sửa.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const openDetailModal = async (packageId) => {
    setError('');
    setLoadingDetail(true);

    try {
      const pkg = normalizePackage(await subscriptionService.getAdminPackageDetail(packageId));
      setSelectedPackage(pkg);
      setShowDetailModal(true);
    } catch (fetchError) {
      setError(fetchError.message || 'Không thể tải chi tiết gói đăng ký.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (formError) setFormError('');
  };

  const validateForm = () => {
    if (!form.name.trim()) return 'Tên gói không được để trống.';
    if (form.price === '' || Number(form.price) < 0) return 'Giá gói phải lớn hơn hoặc bằng 0.';
    if (form.duration === '' || Number(form.duration) < 1) return 'Thời hạn phải lớn hơn hoặc bằng 1.';
    if (!['MONTH', 'YEAR'].includes(form.durationUnit)) return 'Đơn vị thời hạn không hợp lệ.';
    if (form.maxUsers === '' || Number(form.maxUsers) < 1) return 'Số người dùng tối đa phải lớn hơn hoặc bằng 1.';

    const optionalFields = [
      ['maxClasses', 'Số lớp tối đa'],
      ['maxStudentsPerClass', 'Số học sinh tối đa / lớp'],
      ['maxParentsPerClass', 'Số phụ huynh tối đa / lớp'],
    ];

    for (const [field, label] of optionalFields) {
      if (form[field] !== '' && Number(form[field]) < 0) {
        return `${label} không được âm.`;
      }
    }

    return '';
  };

const buildPayload = () => ({
  name: form.name.trim(),
  price: Number(form.price),
  duration: Number(form.duration),
  durationUnit: form.durationUnit,
  maxUsers: Number(form.maxUsers),
  maxClasses: form.maxClasses === '' ? null : Number(form.maxClasses),
  maxStudentsPerClass: form.maxStudentsPerClass === '' ? null : Number(form.maxStudentsPerClass),
  maxParentsPerClass: form.maxParentsPerClass === '' ? null : Number(form.maxParentsPerClass),
});

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextFormError = validateForm();
    if (nextFormError) {
      setFormError(nextFormError);
      return;
    }

    setSaving(true);
    setError('');
    setFormError('');

    try {
      const payload = buildPayload();

      if (editingPackage?.id) {
        await subscriptionService.updateAdminPackage(editingPackage.id, payload);
        setSuccess('Đã cập nhật gói đăng ký.');
      } else {
        await subscriptionService.createAdminPackage(payload);
        setSuccess('Đã tạo gói đăng ký mới.');
      }

      resetFormModal();
      await fetchPackages();
    } catch (saveError) {
      setFormError(saveError.message || 'Không thể lưu gói đăng ký.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = (pkg) => {
    setConfirmModal({
      isOpen: true,
      title: 'Ẩn gói đăng ký',
      message: `Bạn có chắc muốn ẩn gói "${pkg.name}" không?`,
      onConfirm: async () => {
        setConfirmModal((previous) => ({ ...previous, isOpen: false }));
        setSaving(true);

        try {
          await subscriptionService.deactivateAdminPackage(pkg.id);
          setSuccess('Đã ẩn gói đăng ký.');
          if (selectedPackage?.id === pkg.id) {
            setSelectedPackage((previous) => (previous ? { ...previous, isActive: false } : previous));
          }
          await fetchPackages();
        } catch (deactivateError) {
          setError(deactivateError.message || 'Không thể ẩn gói đăng ký.');
        } finally {
          setSaving(false);
        }
      },
    });
  };

  return (
    <main className={styles.mainContent}>
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            <span className={styles.eyebrow}>Gói đăng ký quản trị</span>
            <h2 className={styles.title}>Quản lý gói đăng ký</h2>
            <p className={styles.subtitle}>Ràng buộc trực tiếp với API Quản trị để xem danh sách, chi tiết, tạo mới, cập nhật và ẩn các gói đăng ký.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.secondaryButton} onClick={fetchPackages} disabled={loading || saving}>
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
            <button className={styles.primaryButton} onClick={openCreateModal}>Tạo gói mới</button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <section className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className="material-symbols-outlined">workspace_premium</span>
            <div>
              <p>Tổng gói</p>
              <strong>{stats.total}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="material-symbols-outlined">check_circle</span>
            <div>
              <p>Đang bán</p>
              <strong>{stats.active}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="material-symbols-outlined">visibility_off</span>
            <div>
              <p>Đã ẩn</p>
              <strong>{stats.inactive}</strong>
            </div>
          </div>
        </section>

        <div className={styles.card}>
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <span className="material-symbols-outlined">search</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Tìm theo tên gói hoặc mã gói..."
              />
            </div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={styles.filterSelect}>
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang bán</option>
              <option value="INACTIVE">Đã ẩn</option>
            </select>
          </div>

          {loading ? (
            <div className={styles.emptyState}>Đang tải danh sách gói...</div>
          ) : filteredPackages.length === 0 ? (
            <div className={styles.emptyState}>Không có gói đăng ký nào phù hợp bộ lọc hiện tại.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tên gói</th>
                    <th>Giá</th>
                    <th>Thời hạn</th>
                    <th>Người dùng</th>
                    <th>Giới hạn lớp</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPackages.map((pkg) => (
                    <tr key={pkg.id}>
                      <td>
                        <div className={styles.packageNameCell}>
                          <strong>{pkg.name}</strong>
                          <span>{pkg.id.slice(0, 8)}...</span>
                        </div>
                      </td>
                      <td>{formatCurrency(pkg.price)}</td>
                      <td>{pkg.duration} {pkg.durationUnit}</td>
                      <td>{pkg.maxUsers}</td>
                      <td>{formatOptionalLimit(pkg.maxClasses)}</td>
                      <td>
                        <span className={`${styles.badge} ${pkg.isActive ? styles.active : styles.inactive}`}>
                          {pkg.isActive ? 'Đang bán' : 'Đã ẩn'}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <button className={styles.secondaryButton} onClick={() => openDetailModal(pkg.id)} disabled={loadingDetail || saving}>
                          Xem
                        </button>
                        <button className={styles.secondaryButton} onClick={() => openEditModal(pkg.id)} disabled={loadingDetail || saving}>
                          Sửa
                        </button>
                        {pkg.isActive && (
                          <button className={styles.dangerButton} onClick={() => handleDeactivate(pkg)} disabled={saving}>
                            Ẩn
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showFormModal && (
          <div className={styles.modalOverlay} onClick={resetFormModal}>
            <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>{editingPackage ? 'Chỉnh sửa gói đăng ký' : 'Tạo gói đăng ký'}</h3>
                <button className={styles.closeButton} onClick={resetFormModal}>x</button>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                {formError && <div className={styles.error}>{formError}</div>}

                <label>
                  Tên gói
                  <input value={form.name} onChange={(event) => handleChange('name', event.target.value)} required />
                </label>
                <label>
                  Giá (VND)
                  <input type="number" min="0" value={form.price} onChange={(event) => handleChange('price', event.target.value)} required />
                </label>
                <label>
                  Thời hạn
                  <input type="number" min="1" value={form.duration} onChange={(event) => handleChange('duration', event.target.value)} required />
                </label>
                <label>
                  Đơn vị
                  <select value={form.durationUnit} onChange={(event) => handleChange('durationUnit', event.target.value)}>
                    <option value="MONTH">MONTH</option>
                    <option value="YEAR">YEAR</option>
                  </select>
                </label>
                <label>
                  Tối đa người dùng
                  <input type="number" min="1" value={form.maxUsers} onChange={(event) => handleChange('maxUsers', event.target.value)} required />
                </label>
                <div className={styles.formGrid}>
                  <label>
                    Tối đa lớp
                    <input type="number" min="0" value={form.maxClasses} onChange={(event) => handleChange('maxClasses', event.target.value)} />
                  </label>
                  <label>
                    Tối đa học sinh / lớp
                    <input type="number" min="0" value={form.maxStudentsPerClass} onChange={(event) => handleChange('maxStudentsPerClass', event.target.value)} />
                  </label>
                </div>
                <label>
                  Tối đa phụ huynh / lớp
                  <input type="number" min="0" value={form.maxParentsPerClass} onChange={(event) => handleChange('maxParentsPerClass', event.target.value)} />
                </label>

                <div className={styles.modalFooter}>
                  <button type="button" className={styles.secondaryButton} onClick={resetFormModal} disabled={saving}>
                    Hủy
                  </button>
                  <button type="submit" className={styles.primaryButton} disabled={saving}>
                    {saving ? 'Đang lưu...' : editingPackage ? 'Lưu thay đổi' : 'Tạo gói'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDetailModal && selectedPackage && (
          <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
            <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3>Chi tiết gói đăng ký</h3>
                <button className={styles.closeButton} onClick={() => setShowDetailModal(false)}>x</button>
              </div>

              <div className={styles.detailBody}>
                <div className={styles.detailGrid}>
                  <div>
                    <p className={styles.detailLabel}>Tên gói</p>
                    <strong>{selectedPackage.name}</strong>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Trạng thái</p>
                    <span className={`${styles.badge} ${selectedPackage.isActive ? styles.active : styles.inactive}`}>
                      {selectedPackage.isActive ? 'Đang bán' : 'Đã ẩn'}
                    </span>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Giá</p>
                    <strong>{formatCurrency(selectedPackage.price)}</strong>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Thời hạn</p>
                    <strong>{selectedPackage.duration} {selectedPackage.durationUnit}</strong>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Người dùng tối đa</p>
                    <strong>{selectedPackage.maxUsers}</strong>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Số lớp tối đa</p>
                    <strong>{formatOptionalLimit(selectedPackage.maxClasses)}</strong>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Học sinh tối đa / lớp</p>
                    <strong>{formatOptionalLimit(selectedPackage.maxStudentsPerClass)}</strong>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Phụ huynh tối đa / lớp</p>
                    <strong>{formatOptionalLimit(selectedPackage.maxParentsPerClass)}</strong>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Tạo lúc</p>
                    <strong>{formatDateTime(selectedPackage.createdAt)}</strong>
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Cập nhật lúc</p>
                    <strong>{formatDateTime(selectedPackage.updatedAt)}</strong>
                  </div>
                </div>

                <div className={styles.modalFooter}>
                  {selectedPackage.isActive && (
                    <button className={styles.dangerButton} onClick={() => handleDeactivate(selectedPackage)} disabled={saving}>
                      Ẩn gói
                    </button>
                  )}
                  <button className={styles.secondaryButton} onClick={() => setShowDetailModal(false)}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal((previous) => ({ ...previous, isOpen: false }))}
          confirmText="Xác nhận"
          cancelText="Hủy"
          isDanger
        />
      </div>
    </main>
  );
};

export default AdminSubscriptionsPage;
