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

const getInitials = (name) => {
  if (!name) return 'HS';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const FinancePage = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [centerProfile, setCenterProfile] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);
  const [loadingParents, setLoadingParents] = useState(false);
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [cancellingInvoiceId, setCancellingInvoiceId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyStudent, setHistoryStudent] = useState(null);
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
    if (showCreateModal || showHistoryModal || selectedInvoice || confirmModal.isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showCreateModal, showHistoryModal, selectedInvoice, confirmModal.isOpen]);

  const centerId = String(centerProfile?.centerId || centerProfile?.id || '');
  const currentStudent = students.find((student) => student.id === String(selectedStudentId)) || historyStudent || null;
  const linkedParent = parentDirectory.byStudentId[String(selectedStudentId)] || null;
  const selectedParent = newInvoice.parentId ? parentDirectory.byParentId[String(newInvoice.parentId)] : linkedParent;
  const selectedClass = classes.find((c) => c.id === String(selectedClassId)) || null;

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
        const response = await studentService.getStudentsByClass(selectedClassId, { page: 1, pageSize: 1000 });
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

  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) return students;
    const term = studentSearchTerm.toLowerCase().trim();
    return students.filter((student) => {
      const name = String(student.name || '').toLowerCase();
      const id = String(student.id || '').toLowerCase();
      const email = String(student.email || '').toLowerCase();
      const phone = String(student.phoneNumber || '').toLowerCase();
      return name.includes(term) || id.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [students, studentSearchTerm]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const invoiceId = String(invoice.id || '');
      const description = String(invoice.description || '');
      const matchesSearch = !invoiceSearchTerm.trim()
        || invoiceId.toLowerCase().includes(invoiceSearchTerm.toLowerCase())
        || description.toLowerCase().includes(invoiceSearchTerm.toLowerCase());

      if (statusFilter === 'ALL') return matchesSearch;
      return matchesSearch && invoice.status === statusFilter;
    });
  }, [invoices, invoiceSearchTerm, statusFilter]);

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

  const handleOpenCreateModalForStudent = async (student) => {
    setError('');
    setSelectedStudentId(student.id);
    setShowCreateModal(true);
    await fetchParentDirectory();
  };

  const handleOpenHistoryForStudent = async (student) => {
    setError('');
    setSelectedStudentId(student.id);
    setHistoryStudent(student);
    setInvoiceSearchTerm('');
    setStatusFilter('ALL');
    setShowHistoryModal(true);
    await fetchInvoices(student.id);
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
      if (showHistoryModal) {
        await fetchInvoices(selectedStudentId);
      }
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

          {/* FILTER BAR SECTION */}
          <div className={`${styles.cardBase} ${styles.filterSection}`}>
            <div className={styles.filterGridClassOnly}>
              <div className={styles.selectClassCol}>
                <label className={styles.filterLabel}>Lớp học *</label>
                <select className={styles.filterSelect} value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                  <option value="">-- Chọn lớp học để xem danh sách --</option>
                  {classes.map((studyClass) => (
                    <option key={studyClass.id} value={studyClass.id}>
                      {studyClass.name || `Lớp ${studyClass.id}`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClassId && (
                <div className={styles.searchCol}>
                  <label className={styles.filterLabel}>Tìm kiếm học sinh</label>
                  <div className={styles.inputWrapper}>
                    <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                    <input
                      className={styles.filterInput}
                      placeholder="Tìm theo tên học sinh..."
                      type="text"
                      value={studentSearchTerm}
                      onChange={(event) => setStudentSearchTerm(event.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MAIN CONTENT: STUDENT LIST TABLE */}
          <div className={`${styles.cardBase} ${styles.tableContainer}`}>
            <div className={styles.tableResponsive}>
              {loadingClasses || loadingStudents ? (
                <div className={styles.loadingState}>Đang tải danh sách học sinh...</div>
              ) : !selectedClassId ? (
                <div className={styles.emptyState}>
                  <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '12px' }}>school</span>
                  <span className={styles.emptyStateTitle}>Chọn lớp học để quản lý học phí</span>
                  Vui lòng chọn lớp học ở bộ lọc phía trên để hiển thị danh sách học sinh và tạo hóa đơn.
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyStateTitle}>Không tìm thấy học sinh nào</span>
                  {studentSearchTerm ? 'Không có học sinh nào phù hợp với từ khóa tìm kiếm.' : 'Lớp học này hiện chưa có học sinh nào.'}
                </div>
              ) : (
                <>
                  <div className={styles.tableHeaderSub}>
                    <h3 className={styles.subTitle}>
                      Danh sách học sinh lớp <span className={styles.classNameHighlight}>{selectedClass?.name || 'được chọn'}</span>
                    </h3>
                    <span className={styles.badgeCount}>{filteredStudents.length} học sinh</span>
                  </div>
                  <table className={styles.table}>
                    <colgroup>
                      <col style={{ width: '70px' }} />
                      <col />
                      <col style={{ width: '220px' }} />
                      <col style={{ width: '360px' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className={styles.textCenter}>STT</th>
                        <th className={styles.textLeft}>HỌC SINH</th>
                        <th className={styles.textCenter}>LỚP HỌC</th>
                        <th className={styles.textCenter}>THAO TÁC / CHỨC NĂNG</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student, index) => (
                        <tr key={student.id} className={styles.tableRow}>
                          <td className={styles.textCenter} style={{ color: '#64748b', fontWeight: '600' }}>
                            {index + 1}
                          </td>
                          <td className={styles.textLeft}>
                            <div className={styles.studentInfoCell}>
                              <div className={styles.avatarCircle}>
                                {getInitials(student.name)}
                              </div>
                              <div>
                                <span className={styles.studentName}>{student.name}</span>
                                {student.email && <small className={styles.studentSubtext}>{student.email}</small>}
                              </div>
                            </div>
                          </td>
                          <td className={styles.textCenter}>
                            <span className={styles.classTag}>{selectedClass?.name || 'Chưa phân lớp'}</span>
                          </td>
                          <td className={styles.textCenter}>
                            <div className={styles.actionBtnGroup}>
                              <button
                                className={styles.btnActionPrimary}
                                onClick={() => handleOpenCreateModalForStudent(student)}
                              >
                                <span className="material-symbols-outlined">add_circle</span>
                                Tạo mới hóa đơn
                              </button>
                              <button
                                className={styles.btnActionSecondary}
                                onClick={() => handleOpenHistoryForStudent(student)}
                              >
                                <span className="material-symbols-outlined">receipt_long</span>
                                Lịch sử hóa đơn
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* INVOICE HISTORY MODAL */}
      {showHistoryModal && historyStudent && (
        <div className={styles.modalOverlay} onClick={() => setShowHistoryModal(false)}>
          <div className={`${styles.modalContent} ${styles.modalWide}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#2563eb' }}>receipt_long</span>
                <div>
                  <h3 className={styles.modalTitle}>Lịch sử hóa đơn học phí</h3>
                  <p className={styles.modalSubtitle}>Học sinh: <strong>{historyStudent.name}</strong> • Lớp: {selectedClass?.name || ''}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  className={styles.addBtn}
                  onClick={() => handleOpenCreateModalForStudent(historyStudent)}
                >
                  <span className="material-symbols-outlined">add_circle</span> Tạo hóa đơn mới
                </button>
                <button className={styles.closeBtn} onClick={() => setShowHistoryModal(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className={styles.modalBody}>
              {/* Analytics summary for this student */}
              <div className={styles.modalAnalyticsRow}>
                <div className={styles.modalAnalyticBox}>
                  <small>TỔNG PHẢI THU</small>
                  <strong>{formatCurrency(analytics.totalAmount)}</strong>
                </div>
                <div className={`${styles.modalAnalyticBox} ${styles.boxSuccess}`}>
                  <small>ĐÃ THÀNH TOÁN</small>
                  <strong>{formatCurrency(analytics.paidAmount)}</strong>
                </div>
                <div className={`${styles.modalAnalyticBox} ${styles.boxWarning}`}>
                  <small>CHỜ THANH TOÁN</small>
                  <strong>{formatCurrency(analytics.pendingAmount)}</strong>
                </div>
              </div>

              {/* History Toolbar Filter */}
              <div className={styles.historyFilterRow}>
                <div className={styles.inputWrapper} style={{ flex: 1 }}>
                  <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
                  <input
                    className={styles.filterInput}
                    placeholder="Tìm theo mô tả hoặc mã hóa đơn..."
                    type="text"
                    value={invoiceSearchTerm}
                    onChange={(event) => setInvoiceSearchTerm(event.target.value)}
                  />
                </div>
                <select className={styles.filterSelect} style={{ width: '180px' }} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ thanh toán</option>
                  <option value="PAID">Đã thanh toán</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
                <button className={styles.btnSecondary} onClick={handleRefreshInvoices} disabled={loadingInvoices}>
                  {loadingInvoices ? 'Đang tải...' : 'Làm mới'}
                </button>
              </div>

              {/* Invoices List Table inside modal */}
              {loadingInvoices ? (
                <div className={styles.loadingState}>Đang tải lịch sử hóa đơn...</div>
              ) : filteredInvoices.length === 0 ? (
                <div className={styles.emptyStateModal}>
                  <span className={styles.emptyStateTitle}>Chưa có lịch sử hóa đơn nào</span>
                  Học sinh <strong>{historyStudent.name}</strong> hiện chưa có hóa đơn học phí phù hợp.
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Mô tả hóa đơn</th>
                      <th>Hạn thanh toán</th>
                      <th className={styles.textRight}>Số tiền</th>
                      <th>Trạng thái</th>
                      <th className={styles.textCenter}>Thao tác</th>
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

            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnSecondary} onClick={() => setShowHistoryModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE INVOICE MODAL */}
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
                  disabled={creatingInvoice || !selectedParent}
                >
                  {creatingInvoice ? 'Đang khởi tạo...' : 'Tạo hóa đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVOICE DETAIL MODAL */}
      {selectedInvoice && (
        <div className={styles.modalOverlay} onClick={() => setSelectedInvoice(null)}>
          <div className={`${styles.modalContent} ${styles.modalNarrow}`} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>

              <div className={styles.modalTitleGroup}>
                <h3 className={styles.modalTitle}>Chi tiết hóa đơn #{selectedInvoice.id}</h3>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelectedInvoice(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className={styles.modalBody}>
              {loadingInvoiceDetail ? (
                <div className={styles.loadingState}>Đang tải thông tin chi tiết hóa đơn...</div>
              ) : (
                <div className={styles.modalFormStack}>
                  <div className={styles.detailRow}>
                    <span>Mô tả:</span>
                    <strong>{selectedInvoice.description || 'Học phí lớp học'}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Số tiền:</span>
                    <strong className={styles.textPrimary}>{formatCurrency(selectedInvoice.amount)}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Trạng thái:</span>
                    <span className={`${styles.statusBadge} ${getStatusDisplay(selectedInvoice.status).className}`}>
                      {getStatusDisplay(selectedInvoice.status).text}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Hạn thanh toán:</span>
                    <strong>{formatDate(selectedInvoice.dueDate)}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Ngày tạo:</span>
                    <strong>{formatDateTime(selectedInvoice.createdAt || selectedInvoice.issueDate || selectedInvoice.date)}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Học sinh:</span>
                    <strong>{currentStudent?.name || selectedInvoice.studentId}</strong>
                  </div>
                  <div className={styles.detailRow}>
                    <span>Phụ huynh liên kết:</span>
                    <strong>{selectedParent?.name || selectedInvoice.parentId || 'Chưa liên kết'}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              {selectedInvoice.status === 'PENDING' && (
                <button
                  className={`${styles.btnSecondary} ${styles.dangerText}`}
                  onClick={() => handleCancelInvoice(selectedInvoice.id)}
                  disabled={cancellingInvoiceId === selectedInvoice.id}
                >
                  Hủy hóa đơn này
                </button>
              )}
              <button type="button" className={styles.btnSecondary} onClick={() => setSelectedInvoice(null)}>Đóng</button>
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
        isDanger={confirmModal.isDanger}
      />
    </div>
  );
};

export default FinancePage;
