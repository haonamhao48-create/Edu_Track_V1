import React, { useEffect, useMemo, useState } from 'react';
import ConfirmModal from '../../components/ConfirmModal';
import { classService } from '../../services/classService';
import { studentService } from '../../services/studentService';
import { parentService } from '../../services/parentService';
import { centerService } from '../../services/centerService';
import { invoiceService } from '../../services/invoiceService';
import styles from './FinancePage.module.css';

const INITIAL_INVOICE_FORM = {
  parentId: '',
  amount: '',
  description: '',
  dueDate: '',
};

const EMPTY_PARENT_DIRECTORY = {
  list: [],
  byParentId: {},
  byStudentId: {},
};

const getEntityId = (value) => {
  if (!value) return '';
  return String(
    value.id
      || value.classId
      || value.studentId
      || value.parentId
      || value.centerId
      || value._id
      || '',
  );
};

const normalizeList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.classes)) return response.classes;
  return [];
};

const normalizeClass = (item) => ({
  ...item,
  id: getEntityId(item),
  name: item.className || item.name || item.title || '',
});

const normalizeStudent = (item) => ({
  ...item,
  id: getEntityId(item),
  name: item.fullName || item.name || '',
});

const normalizeInvoice = (item) => ({
  ...item,
  id: getEntityId(item),
  studentId: String(item?.studentId || ''),
  parentId: String(item?.parentId || ''),
  classId: String(item?.classId || ''),
  centerId: String(item?.centerId || ''),
  amount: Number(item?.amount || 0),
  status: String(item?.status || 'PENDING').toUpperCase(),
});

const buildParentDirectory = (parents) => {
  return parents.reduce((accumulator, parent) => {
    const parentId = getEntityId(parent);
    if (!parentId) return accumulator;

    const normalizedParent = {
      ...parent,
      id: parentId,
      name: parent.fullName || parent.name || parent.email || parent.phoneNumber || parentId,
    };

    accumulator.list.push(normalizedParent);
    accumulator.byParentId[parentId] = normalizedParent;

    const linkedStudents = Array.isArray(parent.students) ? parent.students : [];
    linkedStudents.forEach((student) => {
      const studentId = getEntityId(student);
      if (studentId && !accumulator.byStudentId[studentId]) {
        accumulator.byStudentId[studentId] = normalizedParent;
      }
    });

    return accumulator;
  }, {
    list: [],
    byParentId: {},
    byStudentId: {},
  });
};

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '0 VND';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value));
};

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('vi-VN');
};

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const getStatusDisplay = (status) => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PAID') {
    return { text: 'Đã thanh toán', className: styles.statusPaid };
  }
  if (normalized === 'CANCELLED') {
    return { text: 'Đã hủy', className: styles.statusUnpaid };
  }
  return { text: 'Chờ thanh toán', className: styles.statusOverdue };
};

const getTodayDateInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const FinancePage = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [centerProfile, setCenterProfile] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [cancellingInvoiceId, setCancellingInvoiceId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [newInvoice, setNewInvoice] = useState(INITIAL_INVOICE_FORM);
  const [parentDirectory, setParentDirectory] = useState(EMPTY_PARENT_DIRECTORY);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    isDanger: false,
  });

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 3000);
    return () => clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (showCreateModal || selectedInvoice || confirmModal.isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showCreateModal, selectedInvoice, confirmModal.isOpen]);

  const centerId = String(centerProfile?.centerId || centerProfile?.id || '');
  const currentStudent = students.find((student) => student.id === String(selectedStudentId)) || null;
  const linkedParent = parentDirectory.byStudentId[String(selectedStudentId)] || null;
  const selectedParent = newInvoice.parentId ? parentDirectory.byParentId[String(newInvoice.parentId)] : linkedParent;

  const fetchParentDirectory = async ({ force = false } = {}) => {
    if (loadingParents) return;
    if (!force && parentDirectory.list.length > 0) return;

    setLoadingParents(true);
    try {
      const response = await parentService.getParents({ page: 1, pageSize: 1000 });
      const normalizedParents = normalizeList(response);
      setParentDirectory(buildParentDirectory(normalizedParents));
    } catch (fetchError) {
      setError(fetchError.message || 'Không thể tải danh sách phụ huynh liên kết.');
    } finally {
      setLoadingParents(false);
    }
  };

  const fetchInvoices = async (studentId) => {
    if (!studentId) {
      setInvoices([]);
      return;
    }

    setLoadingInvoices(true);
    setError('');

    try {
      const response = await invoiceService.getStudentInvoices(studentId);
      const rawInvoices = normalizeList(response).map(normalizeInvoice);
      rawInvoices.sort((a, b) => {
        const dateA = a.createdAt || a.issueDate || a.date || a.dueDate || '';
        const dateB = b.createdAt || b.issueDate || b.date || b.dueDate || '';
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
      setInvoices(rawInvoices);
    } catch (fetchError) {
      setError(fetchError.message || 'Không thể tải danh sách hóa đơn của học sinh này.');
    } finally {
      setLoadingInvoices(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingClasses(true);
      setError('');

      try {
        const [classResponse, profileResponse] = await Promise.all([
          classService.getAllClasses(),
          centerService.getCenterProfile(),
        ]);

        setClasses(normalizeList(classResponse).map(normalizeClass));
        setCenterProfile(profileResponse || null);
      } catch (fetchError) {
        setError(fetchError.message || 'Không thể tải dữ liệu ban đầu của module học phí.');
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setSelectedStudentId('');
      setInvoices([]);
      return;
    }

    const fetchStudents = async () => {
      setLoadingStudents(true);
      setSelectedStudentId('');
      setInvoices([]);
      setSelectedInvoice(null);
      setError('');

      try {
        const response = await studentService.getStudentsByClass(selectedClassId);
        setStudents(normalizeList(response).map(normalizeStudent));
      } catch (fetchError) {
        setError(fetchError.message || 'Không thể tải danh sách học sinh của lớp này.');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [selectedClassId]);

  useEffect(() => {
    setSelectedInvoice(null);
    fetchInvoices(selectedStudentId);
  }, [selectedStudentId]);

  useEffect(() => {
    if (!showCreateModal || !selectedStudentId) return;

    const prepareModal = async () => {
      await fetchParentDirectory();
    };

    prepareModal();
  }, [showCreateModal, selectedStudentId]);

  useEffect(() => {
    if (!showCreateModal) return;

    setNewInvoice((previous) => ({
      ...previous,
      parentId: linkedParent?.id || '',
    }));
  }, [linkedParent, showCreateModal]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const invoiceId = String(invoice.id || '');
      const description = String(invoice.description || '');
      const matchesSearch = !searchTerm.trim()
        || invoiceId.toLowerCase().includes(searchTerm.toLowerCase())
        || description.toLowerCase().includes(searchTerm.toLowerCase());

      if (statusFilter === 'ALL') return matchesSearch;
      return matchesSearch && invoice.status === statusFilter;
    });
  }, [invoices, searchTerm, statusFilter]);

  const analytics = useMemo(() => {
    const paid = filteredInvoices.filter((invoice) => invoice.status === 'PAID');
    const pending = filteredInvoices.filter((invoice) => invoice.status === 'PENDING');
    const cancelled = filteredInvoices.filter((invoice) => invoice.status === 'CANCELLED');

    return {
      paid,
      pending,
      cancelled,
      totalAmount: filteredInvoices.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
      paidAmount: paid.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
      pendingAmount: pending.reduce((sum, invoice) => sum + Number(invoice.amount || 0), 0),
    };
  }, [filteredInvoices]);

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setNewInvoice(INITIAL_INVOICE_FORM);
  };

  const handleOpenCreateModal = async () => {
    setError('');
    setShowCreateModal(true);
    await fetchParentDirectory();
  };

  const handleRefreshInvoices = async () => {
    if (!selectedStudentId) return;
    await fetchInvoices(selectedStudentId);
  };

  const openInvoiceDetail = async (invoice) => {
    setSelectedInvoice(normalizeInvoice(invoice));
    setLoadingInvoiceDetail(true);
    setError('');

    try {
      const detail = await invoiceService.getInvoiceDetail(invoice.id);
      setSelectedInvoice(normalizeInvoice(detail));
    } catch (fetchError) {
      setError(fetchError.message || 'Không thể tải chi tiết hóa đơn.');
    } finally {
      setLoadingInvoiceDetail(false);
    }
  };

  const handleCreateInvoice = async (event) => {
    event.preventDefault();

    if (!selectedClassId || !selectedStudentId) {
      setError('Vui lòng chọn lớp học và học sinh.');
      return;
    }

    if (!centerId) {
      setError('Không tìm thấy thông tin trung tâm để tạo hóa đơn.');
      return;
    }

    if (!newInvoice.parentId) {
      setError('Học sinh này chưa được liên kết với phụ huynh, không thể tạo hóa đơn.');
      return;
    }

    if (!newInvoice.amount || Number(newInvoice.amount) <= 0) {
      setError('Số tiền hóa đơn phải lớn hơn 0.');
      return;
    }

    if (!newInvoice.description || !newInvoice.description.trim()) {
      setError('Vui lòng nhập mô tả hóa đơn.');
      return;
    }

    if (!newInvoice.dueDate) {
      setError('Vui lòng chọn hạn thanh toán.');
      return;
    }

    if (newInvoice.dueDate < getTodayDateInput()) {
      setError('Hạn thanh toán không được nằm trong quá khứ.');
      return;
    }

    setCreatingInvoice(true);
    setError('');

    try {
      await invoiceService.createInvoice({
        studentId: selectedStudentId,
        parentId: newInvoice.parentId,
        classId: selectedClassId,
        centerId,
        amount: Number(newInvoice.amount),
        description: newInvoice.description.trim(),
        dueDate: newInvoice.dueDate,
      });

      setSuccess('Đã tạo hóa đơn học phí mới.');
      resetCreateModal();
      await fetchInvoices(selectedStudentId);
    } catch (createError) {
      setError(createError.message || 'Không thể tạo hóa đơn.');
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleCancelInvoice = (invoiceId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận hủy hóa đơn',
      message: 'Bạn có chắc chắn muốn hủy hóa đơn này không? Hành động này không thể hoàn tác.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((previous) => ({ ...previous, isOpen: false }));
        setCancellingInvoiceId(invoiceId);
        setError('');

        try {
          await invoiceService.cancelInvoice(invoiceId);
          setSuccess('Đã hủy hóa đơn thành công.');

          if (selectedInvoice?.id === invoiceId) {
            const latest = await invoiceService.getInvoiceDetail(invoiceId);
            setSelectedInvoice(normalizeInvoice(latest));
          }

          await fetchInvoices(selectedStudentId);
        } catch (cancelError) {
          setError(cancelError.message || 'Không thể hủy hóa đơn này.');
        } finally {
          setCancellingInvoiceId('');
        }
      },
    });
  };

  return (
    <div className={styles.financeRoot}>
      <main className={styles.mainContent}>
        <div className={styles.container}>
          <div className={styles.pageHeader}>
            <div className={styles.pageLead}>
              <span className={styles.eyebrow}>Hóa đơn trung tâm</span>
              <h2 className={styles.pageTitle}>Quản lý hóa đơn học phí</h2>
              <p className={styles.pageSubtitle}>Tạo, theo dõi, đối chiếu trạng thái và hủy các hóa đơn học phí của trung tâm bằng dữ liệu thực tế.</p>
            </div>
            <div className={styles.headerActions}>
              {selectedStudentId && (
                <button className={styles.btnSecondary} onClick={handleRefreshInvoices} disabled={loadingInvoices}>
                  {loadingInvoices ? 'Đang tải...' : 'Làm mới'}
                </button>
              )}
              {selectedStudentId && (
                <button className={styles.addBtn} onClick={handleOpenCreateModal}>
                  <span className="material-symbols-outlined">add_circle</span> Tạo hóa đơn mới
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className={`${styles.message} ${styles.messageError}`}>
              {error}
            </div>
          )}
          {success && (
            <div className={`${styles.message} ${styles.messageSuccess}`}>
              {success}
            </div>
          )}

          <div className={`${styles.cardBase} ${styles.filterSection}`}>
            <div className={styles.filterGrid}>
              <div className={styles.searchCol}>
                <label className={styles.filterLabel}>Tìm kiếm hóa đơn</label>
                <div className={styles.inputWrapper}>
                  <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                  <input
                    className={styles.filterInput}
                    placeholder="Tìm theo mô tả hoặc mã hóa đơn..."
                    type="text"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className={styles.filterLabel}>Lớp học *</label>
                <select className={styles.filterSelect} value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map((studyClass) => (
                    <option key={studyClass.id} value={studyClass.id}>
                      {studyClass.name || `Lớp ${studyClass.id}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={styles.filterLabel}>Học sinh *</label>
                <select
                  className={styles.filterSelect}
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  disabled={!selectedClassId || loadingStudents || loadingClasses}
                >
                  <option value="">{loadingStudents ? 'Đang tải học sinh...' : '-- Chọn học sinh --'}</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name || student.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={styles.filterLabel}>Trạng thái</label>
                <select className={styles.filterSelect} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="ALL">Tất cả</option>
                  <option value="PENDING">Chờ thanh toán</option>
                  <option value="PAID">Đã thanh toán</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
              </div>
            </div>
          </div>

          <div className={`${styles.cardBase} ${styles.tableContainer}`}>
            <div className={styles.tableResponsive}>
              {loadingInvoices ? (
                <div className={styles.loadingState}>Đang tải danh sách hóa đơn...</div>
              ) : !selectedStudentId ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyStateTitle}>Chọn đối tượng để bắt đầu</span>
                  Vui lòng chọn lớp học và học sinh để xem hóa đơn.
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyStateTitle}>Chưa có hóa đơn nào</span>
                  Học sinh này hiện chưa có hóa đơn học phí trong hệ thống.
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Mô tả</th>
                      <th>Hạn thanh toán</th>
                      <th className={styles.textRight}>Số tiền</th>
                      <th>Trạng thái</th>
                      <th className={styles.textCenter}>Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((invoice) => {
                      const statusInfo = getStatusDisplay(invoice.status);
                      const isPending = invoice.status === 'PENDING';

                      return (
                        <tr key={invoice.id} className={styles.tableRow}>
                          <td className={styles.textPrimary}>{invoice.description || 'Học phí lớp học'}</td>
                          <td>{formatDate(invoice.dueDate)}</td>
                          <td className={`${styles.textRight} ${styles.fwBold}`}>{formatCurrency(invoice.amount)}</td>
                          <td>
                            <span className={`${styles.statusBadge} ${statusInfo.className}`}>
                              <span className={styles.statusDot}></span>
                              {statusInfo.text}
                            </span>
                          </td>
                          <td className={styles.textCenter}>
                            <div className={styles.inlineActions}>
                              <button className={styles.btnSecondary} onClick={() => openInvoiceDetail(invoice)}>
                                Chi tiết
                              </button>
                              {isPending && (
                                <button
                                  className={`${styles.btnSecondary} ${styles.dangerText}`}
                                  onClick={() => handleCancelInvoice(invoice.id)}
                                  disabled={cancellingInvoiceId === invoice.id}
                                >
                                  Hủy
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {selectedStudentId && filteredInvoices.length > 0 && (
              <div className={styles.pagination}>
                <p className={styles.pageInfo}>Hiển thị <span>{filteredInvoices.length}</span> hóa đơn của học sinh</p>
              </div>
            )}
          </div>

          {selectedStudentId && filteredInvoices.length > 0 && (
            <section className={styles.analyticsGrid}>
              <div className={`${styles.cardBase} ${styles.analyticCard}`}>
                <div className={`${styles.iconBox} ${styles.iconBoxPrimary}`}>
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div>
                  <p className={styles.analyticLabel}>Tổng phải thu</p>
                  <p className={styles.analyticValue}>{formatCurrency(analytics.totalAmount)}</p>
                </div>
              </div>

              <div className={`${styles.cardBase} ${styles.analyticCard}`}>
                <div className={`${styles.iconBox} ${styles.iconBoxTertiary}`}>
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <div>
                  <p className={styles.analyticLabel}>Đã thu</p>
                  <p className={styles.analyticValue}>{formatCurrency(analytics.paidAmount)}</p>
                  <p className={`${styles.analyticSub} ${styles.statToneSuccess}`}>
                    <span className="material-symbols-outlined">done_all</span>
                    <span>{analytics.paid.length} hóa đơn đã xong</span>
                  </p>
                </div>
              </div>

              <div className={`${styles.cardBase} ${styles.analyticCard}`}>
                <div className={`${styles.iconBox} ${styles.iconBoxError}`}>
                  <span className="material-symbols-outlined">pending_actions</span>
                </div>
                <div>
                  <p className={styles.analyticLabel}>Chờ thanh toán</p>
                  <p className={styles.analyticValue}>{formatCurrency(analytics.pendingAmount)}</p>
                  <p className={`${styles.analyticSub} ${styles.statToneWarning}`}>
                    <span className="material-symbols-outlined">schedule</span>
                    <span>{analytics.pending.length} hóa đơn chờ</span>
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={resetCreateModal}>
          <div className={`${styles.modalContent} ${styles.modalNarrow}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Tạo hóa đơn học phí mới</h3>
              <button className={styles.closeBtn} onClick={resetCreateModal}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateInvoice}>
              <div className={styles.modalBody}>
                <div className={styles.modalFormGrid}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Học sinh</label>
                    <input
                      type="text"
                      disabled
                      value={currentStudent?.name || ''}
                      className={`${styles.fieldInput} ${styles.fieldInputReadonly}`}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Phụ huynh liên kết</label>
                    {loadingParents && (
                      <div className={styles.infoPanel}>
                        Đang kiểm tra phụ huynh liên kết...
                      </div>
                    )}
                    {!loadingParents && selectedParent && (
                      <input
                        type="text"
                        disabled
                        value={selectedParent.name}
                        className={`${styles.fieldInput} ${styles.infoPanelSuccess}`}
                      />
                    )}
                    {!loadingParents && !selectedParent && (
                      <div className={`${styles.infoPanel} ${styles.infoPanelError}`}>
                        Học sinh này chưa được liên kết với phụ huynh.
                      </div>
                    )}
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Số tiền (VND) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Ví dụ: 1500000"
                      value={newInvoice.amount}
                      onChange={(event) => setNewInvoice((previous) => ({ ...previous, amount: event.target.value }))}
                      className={styles.fieldInput}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Hạn thanh toán *</label>
                    <input
                      type="date"
                      required
                      min={getTodayDateInput()}
                      value={newInvoice.dueDate}
                      onChange={(event) => setNewInvoice((previous) => ({ ...previous, dueDate: event.target.value }))}
                      className={styles.fieldInput}
                    />
                  </div>

                  <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
                    <label className={styles.fieldLabel}>Mô tả hóa đơn *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Học phí khóa học Tiếng Anh tháng 6"
                      value={newInvoice.description}
                      onChange={(event) => setNewInvoice((previous) => ({ ...previous, description: event.target.value }))}
                      className={styles.fieldInput}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.btnSecondary} onClick={resetCreateModal} disabled={creatingInvoice}>Hủy</button>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={creatingInvoice || loadingParents || !selectedParent}
                >
                  {creatingInvoice ? 'Đang tạo...' : 'Tạo hóa đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className={styles.modalOverlay} onClick={() => setSelectedInvoice(null)}>
          <div className={styles.modalContent} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className="material-symbols-outlined textPrimary">receipt</span>
                <h3 className={styles.modalTitle}>Chi tiết hóa đơn học phí</h3>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelectedInvoice(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              {loadingInvoiceDetail ? (
                <div className={styles.loadingState}>Đang tải chi tiết hóa đơn...</div>
              ) : (
                <>
                  <div className={styles.invoiceHeader}>
                    <div className={styles.centerInfo}>
                      <h3>{centerProfile?.name || 'Trung tâm giáo dục'}</h3>
                      <p>Thông tin hóa đơn học phí</p>
                    </div>
                    <div className={styles.invoiceMeta}>
                      <p>Ngày tạo: <strong>{formatDateTime(selectedInvoice.createdAt)}</strong></p>
                      <p>Hạn trả: <strong>{formatDate(selectedInvoice.dueDate)}</strong></p>
                      <p>Thanh toán lúc: <strong>{formatDateTime(selectedInvoice.paidAt)}</strong></p>
                    </div>
                  </div>

                  <div className={styles.billTo}>
                    <h4>Đối tượng nộp học phí</h4>
                    <div className={styles.billToGrid}>
                      <div className={styles.billToItem}>
                        <p>Học sinh:</p>
                        <strong>{students.find((student) => student.id === String(selectedInvoice.studentId))?.name || currentStudent?.name || 'Học viên'}</strong>
                      </div>
                      <div className={styles.billToItem}>
                        <p>Phụ huynh liên kết:</p>
                        <strong>{parentDirectory.byParentId[String(selectedInvoice.parentId)]?.name || 'Phụ huynh đã liên kết'}</strong>
                      </div>
                    </div>
                  </div>

                  <table className={styles.invoiceTable}>
                    <thead>
                      <tr>
                        <th>Nội dung thanh toán</th>
                        <th className={styles.textRight}>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{selectedInvoice.description || 'Học phí khóa học'}</td>
                        <td className={`${styles.textRight} ${styles.fwBold}`}>{formatCurrency(selectedInvoice.amount)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className={styles.invoiceTotal}>
                    <div className={styles.totalBox}>
                      <div className={styles.totalRow}>
                        <span>Trạng thái</span>
                        <span>{getStatusDisplay(selectedInvoice.status).text}</span>
                      </div>
                      <div className={styles.totalRow}>
                        <span>Tạm tính</span>
                        <span>{formatCurrency(selectedInvoice.amount)}</span>
                      </div>
                      <div className={`${styles.totalRow} ${styles.finalTotal}`}>
                        <span>Tổng tiền</span>
                        <span>{formatCurrency(selectedInvoice.amount)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className={styles.modalFooter}>
              {selectedInvoice.status === 'PENDING' && (
                <button
                  className={`${styles.btnSecondary} ${styles.dangerText}`}
                  onClick={() => handleCancelInvoice(selectedInvoice.id)}
                  disabled={cancellingInvoiceId === selectedInvoice.id}
                >
                  Hủy hóa đơn
                </button>
              )}
              <button className={styles.btnSecondary} onClick={() => setSelectedInvoice(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Xác nhận"
        cancelText="Hủy"
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((previous) => ({ ...previous, isOpen: false }))}
      />
    </div>
  );
};

export default FinancePage;
