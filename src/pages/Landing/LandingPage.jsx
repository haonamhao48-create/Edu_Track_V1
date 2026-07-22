import React from 'react';
import qrImage from '../../assets/app-download-qr.png';
import styles from './LandingPage.module.css';

const PACKAGES = [
  {
    name: 'BASIC',
    price: '249.000 ₫',
    period: '/tháng',
    badge: 'Khởi đầu',
    desc: 'Giải pháp hoàn hảo cho các trung tâm nhỏ mới đi vào hoạt động.',
    features: [
      'Quản lý tối đa 5 lớp học',
      'Quản lý 50 học sinh',
      'Điểm danh thủ công & QR',
      'Báo cáo doanh thu cơ bản',
      'Hỗ trợ qua Email 24/7'
    ],
    highlight: false,
    cta: 'Đăng ký ngay'
  },
  {
    name: 'STANDARD',
    price: '499.000 ₫',
    period: '/tháng',
    badge: 'Phổ biến',
    desc: 'Đáp ứng nhu cầu quản lý chuyên nghiệp của trung tâm vừa.',
    features: [
      'Quản lý tối đa 15 lớp học',
      'Quản lý 200 học sinh',
      'Điểm danh QR tự động',
      'Quản lý hóa đơn & Học phí',
      'Kênh liên kết Phụ huynh',
      'Hỗ trợ ưu tiên 24/7'
    ],
    highlight: true,
    cta: 'Chọn gói Standard'
  },
  {
    name: 'SCALE',
    price: '639.000 ₫',
    period: '/tháng',
    badge: 'Mở rộng',
    desc: 'Dành cho các trung tâm đang tăng trưởng quy mô nhanh chóng.',
    features: [
      'Quản lý tối đa 35 lớp học',
      'Quản lý 500 học sinh',
      'Đánh giá Giáo viên & Trung tâm',
      'Báo cáo tài chính theo Quý',
      'Tự động gia hạn gói cước',
      'Hỗ trợ trực tiếp 1-1'
    ],
    highlight: false,
    cta: 'Nâng cấp Scale'
  },
  {
    name: 'ENTERPRISE',
    price: '949.000 ₫',
    period: '/tháng',
    badge: 'Cao cấp',
    desc: 'Giải pháp toàn diện nhất không giới hạn tính năng cho hệ thống lớn.',
    features: [
      'Không giới hạn lớp học',
      'Không giới hạn học sinh',
      'Toàn bộ tính năng cao cấp',
      'API tích hợp riêng',
      'Báo cáo phân tích chuyên sâu',
      'Hỗ trợ kỹ thuật riêng 24/7'
    ],
    highlight: false,
    cta: 'Liên hệ Enterprise'
  }
];

const FEATURES = [
  {
    icon: 'school',
    title: 'Quản lý Lớp học & Lịch biểu',
    desc: 'Tự động xếp lịch giảng dạy, theo dõi danh sách học sinh và phòng học thông minh theo thời gian thực.'
  },
  {
    icon: 'qr_code_scanner',
    title: 'Điểm danh QR & Thủ công',
    desc: 'Điểm danh học sinh tức thì bằng mã QR hoặc thao tác thủ công mượt mà, lưu vết dữ liệu chính xác.'
  },
  {
    icon: 'payments',
    title: 'Hóa đơn & Báo cáo Doanh thu',
    desc: 'Quản lý thu học phí, xuất hóa đơn tự động và theo dõi báo cáo biểu đồ doanh thu theo tháng/quý.'
  },
  {
    icon: 'family_restroom',
    title: 'Đánh giá & Kết nối Phụ huynh',
    desc: 'Tăng cường tương tác giữa trung tâm, giáo viên và phụ huynh qua kênh phản hồi và đánh giá minh bạch.'
  }
];

const STATS = [
  { value: '50+', label: 'Trung tâm tin dùng' },
  { value: '10.000+', label: 'Học sinh & Phụ huynh' },
  { value: '99.9%', label: 'Thời gian hoạt động' },
  { value: '24/7', label: 'Hỗ trợ kỹ thuật' }
];

const LandingPage = ({ onNavigate }) => {
  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.landingRoot}>
      {/* HEADER / NAVIGATION BAR */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.brand} onClick={() => onNavigate('landing')}>
            <img
              alt="EduTrack Logo"
              className={styles.logoImg}
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4jP4Fz61T9gKh79LN7jR7rZ2-SSr4fCZH9cILzuqnHW9ZlA342_QD61eBE8BM4Typ13xtih74yp9xEpbnHOmJsm30EEoVUGYbIisGbPU1I3rbURV_fwJkyAsrHgwCDmciinO8HhjQE2Rogqw-RJPbKrwchswD-kiS0nDvpx7Nko7AiosN77ZgYt1J2YiNSnJ_aHDFU73VLUAS5d9VF9n8HKOxjRkXhN37-UjpbGfj3KhcuapZngrBMXh4z0ZwW4IbJH7rZI0HVv8"
            />
            <div>
              <span className={styles.logoTitle}>EduTrack</span>
              <span className={styles.logoTag}>Edu Platform</span>
            </div>
          </div>

          <nav className={styles.navLinks}>
            <button onClick={() => scrollToSection('features')}>Tính năng</button>
            <button onClick={() => scrollToSection('download-app')}>Tải App</button>
            <button onClick={() => scrollToSection('pricing')}>Gói dịch vụ</button>
            <button onClick={() => scrollToSection('stats')}>Về chúng tôi</button>
          </nav>

          <div className={styles.navActions}>
            <button
              className={styles.btnLogin}
              onClick={() => onNavigate('login')}
            >
              Đăng nhập
            </button>
            <button
              className={styles.btnRegister}
              onClick={() => onNavigate('register')}
            >
              Đăng ký ngay
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className={styles.heroSection}>
        <div className={styles.heroContainer}>
          <div className={styles.heroBadge}>
            <span className="material-symbols-outlined">auto_awesome</span>
            <span>Nền Tảng Quản Lý Giáo Dục Thế Hệ Mới</span>
          </div>

          <h1 className={styles.heroHeadline}>
            Quản lý trung tâm giáo dục <br />
            <span className={styles.highlightText}>Thông minh & Toàn diện</span>
          </h1>

          <p className={styles.heroDescription}>
            EduTrack giúp các trung tâm đào tạo tự động hóa quy trình quản lý lớp học, điểm danh QR, 
            theo dõi doanh thu tài chính và tối ưu tương tác giữa Giáo viên - Phụ huynh.
          </p>

          <div className={styles.heroCtaGroup}>
            <button
              className={styles.btnPrimaryLarge}
              onClick={() => onNavigate('register')}
            >
              <span>Bắt đầu dùng thử ngay</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button
              className={styles.btnSecondaryLarge}
              onClick={() => onNavigate('login')}
            >
              <span>Đăng nhập hệ thống</span>
            </button>
          </div>

          {/* PRODUCT MOCKUP BENTO PREVIEW */}
          <div className={styles.mockupContainer}>
            <div className={styles.mockupHeader}>
              <div className={styles.windowDots}>
                <span className={styles.dotRed}></span>
                <span className={styles.dotYellow}></span>
                <span className={styles.dotGreen}></span>
              </div>
              <span className={styles.windowTitle}>edutrack.io.vn/dashboard</span>
            </div>
            
            <div className={styles.mockupBody}>
              <div className={styles.mockupTopRow}>
                <div className={styles.mockCardFeatured}>
                  <span className={styles.mockKicker}>TỔNG QUAN VẬN HÀNH</span>
                  <h3>Trung tâm EduTrack Enterprise</h3>
                  <p>Trạng thái hoạt động 100% — Tất cả hệ thống vận hành ổn định</p>
                </div>
                <div className={styles.mockCardStat}>
                  <span className="material-symbols-outlined">payments</span>
                  <div>
                    <small>Doanh thu tháng này</small>
                    <strong>245.800.000 ₫</strong>
                  </div>
                </div>
              </div>

              <div className={styles.mockupGrid}>
                <div className={styles.mockGridItem}>
                  <span className="material-symbols-outlined">school</span>
                  <strong>45 Học sinh</strong>
                  <small>Đang hoạt động</small>
                </div>
                <div className={styles.mockGridItem}>
                  <span className="material-symbols-outlined">person</span>
                  <strong>12 Giáo viên</strong>
                  <small>Đang giảng dạy</small>
                </div>
                <div className={styles.mockGridItem}>
                  <span className="material-symbols-outlined">class</span>
                  <strong>18 Lớp học</strong>
                  <small>Đang diễn ra</small>
                </div>
                <div className={styles.mockGridItem}>
                  <span className="material-symbols-outlined">task_alt</span>
                  <strong>98% Thu học phí</strong>
                  <small>Tỷ lệ hoàn tất</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS & TRUST BAR */}
      <section id="stats" className={styles.statsSection}>
        <div className={styles.statsContainer}>
          {STATS.map((stat, idx) => (
            <div key={idx} className={styles.statBox}>
              <strong className={styles.statValue}>{stat.value}</strong>
              <span className={styles.statLabel}>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionKicker}>TÍNH NĂNG NỔI BẬT</span>
          <h2 className={styles.sectionTitle}>Giải Pháp Toàn Diện Cho Trung Tâm Của Bạn</h2>
          <p className={styles.sectionSubtitle}>Thiết kế tối ưu công việc quản trị hàng ngày, tiết kiệm 80% thời gian vận hành thủ công.</p>
        </div>

        <div className={styles.featuresGrid}>
          {FEATURES.map((feature, idx) => (
            <article key={idx} className={styles.featureCard}>
              <div className={styles.featureIconBox}>
                <span className="material-symbols-outlined">{feature.icon}</span>
              </div>
              <h3 className={styles.featureCardTitle}>{feature.title}</h3>
              <p className={styles.featureCardDesc}>{feature.desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* MOBILE APP DOWNLOAD SECTION */}
      <section id="download-app" className={styles.downloadSection}>
        <div className={styles.downloadContainer}>
          <div className={styles.downloadCopy}>
            <span className={styles.sectionKicker}>ỨNG DỤNG DI ĐỘNG</span>
            <h2 className={styles.downloadTitle}>Tải Ứng Dụng EduTrack Mobile</h2>
            <p className={styles.downloadDesc}>
              Theo dõi lịch học, nhận thông báo tức thì, kiểm tra sổ chuyên cần và thực hiện điểm danh QR 
              nhanh chóng ngay trên điện thoại dành cho Giáo viên & Phụ huynh.
            </p>

            <div className={styles.downloadFeatures}>
              <div className={styles.downloadFeatureItem}>
                <span className="material-symbols-outlined">notifications_active</span>
                <div>
                  <strong>Thông báo thời gian thực</strong>
                  <p>Cập nhật ngay khi có lịch học mới, học phí hoặc phản hồi từ giáo viên.</p>
                </div>
              </div>

              <div className={styles.downloadFeatureItem}>
                <span className="material-symbols-outlined">qr_code_scanner</span>
                <div>
                  <strong>Điểm danh QR tốc độ cao</strong>
                  <p>Quét mã QR học sinh để ghi nhận chuyên cần chỉ trong 1 giây.</p>
                </div>
              </div>
            </div>

            <div className={styles.storeBadges}>
              <div className={styles.storeBadge}>
                <span className="material-symbols-outlined">android</span>
                <div>
                  <small>Tải về trên</small>
                  <strong>Google Play (Android)</strong>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.qrCard}>
            <div className={styles.qrHeader}>
              <span className="material-symbols-outlined">qr_code_2</span>
              <span>QUÉT MÃ TẢI APP NGAY</span>
            </div>
            
            <div className={styles.qrImageWrapper}>
              <img src={qrImage} alt="Mã QR tải ứng dụng EduTrack Mobile" className={styles.qrImg} />
            </div>

            <p className={styles.qrInstruction}>
              Dùng camera điện thoại hoặc Zalo để quét mã QR và cài đặt ứng dụng.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING PACKAGES SECTION */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionKicker}>GÓI DỊCH VỤ LINH HOẠT</span>
          <h2 className={styles.sectionTitle}>Lựa Chọn Gói Phù Hợp Với Quy Mô Trung Tâm</h2>
          <p className={styles.sectionSubtitle}>Minh bạch chi phí, dễ dàng nâng cấp khi trung tâm mở rộng.</p>
        </div>

        <div className={styles.pricingGrid}>
          {PACKAGES.map((pkg) => (
            <article
              key={pkg.name}
              className={`${styles.pricingCard} ${pkg.highlight ? styles.pricingCardHighlight : ''}`}
            >
              {pkg.highlight && <div className={styles.popularBadge}>Bán chạy nhất</div>}
              <div className={styles.pkgBadge}>{pkg.badge}</div>
              <h3 className={styles.pkgName}>{pkg.name}</h3>
              <p className={styles.pkgDesc}>{pkg.desc}</p>
              
              <div className={styles.pkgPriceBox}>
                <strong className={styles.pkgPrice}>{pkg.price}</strong>
                <span className={styles.pkgPeriod}>{pkg.period}</span>
              </div>

              <ul className={styles.pkgFeatureList}>
                {pkg.features.map((feat, fIdx) => (
                  <li key={fIdx}>
                    <span className="material-symbols-outlined">check_circle</span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <button
                className={`${styles.pkgBtn} ${pkg.highlight ? styles.pkgBtnHighlight : ''}`}
                onClick={() => onNavigate('register')}
              >
                {pkg.cta}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerBrand}>
            <div className={styles.brand}>
              <img
                alt="EduTrack Logo"
                className={styles.logoImg}
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4jP4Fz61T9gKh79LN7jR7rZ2-SSr4fCZH9cILzuqnHW9ZlA342_QD61eBE8BM4Typ13xtih74yp9xEpbnHOmJsm30EEoVUGYbIisGbPU1I3rbURV_fwJkyAsrHgwCDmciinO8HhjQE2Rogqw-RJPbKrwchswD-kiS0nDvpx7Nko7AiosN77ZgYt1J2YiNSnJ_aHDFU73VLUAS5d9VF9n8HKOxjRkXhN37-UjpbGfj3KhcuapZngrBMXh4z0ZwW4IbJH7rZI0HVv8"
              />
              <span className={styles.logoTitle}>EduTrack</span>
            </div>
            <p className={styles.footerDesc}>
              Nền tảng quản lý trung tâm giáo dục hàng đầu. Đơn giản, hiện đại và hiệu quả.
            </p>
          </div>

          <div className={styles.footerLinks}>
            <div>
              <span className={styles.linkHeader}>Sản phẩm</span>
              <button onClick={() => scrollToSection('features')}>Tính năng</button>
              <button onClick={() => scrollToSection('pricing')}>Gói dịch vụ</button>
            </div>
            <div>
              <span className={styles.linkHeader}>Tài khoản</span>
              <button onClick={() => onNavigate('login')}>Đăng nhập Trung tâm</button>
              <button onClick={() => onNavigate('admin-login')}>Đăng nhập Quản trị</button>
              <button onClick={() => onNavigate('register')}>Đăng ký tài khoản</button>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>© {new Date().getFullYear()} EduTrack Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
