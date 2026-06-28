import React from 'react';
import styles from './Button.module.css';

const Button = ({ children, variant = 'primary', isLoading, icon, ...props }) => {
  const buttonClass = `${styles.button} ${styles[variant]}`;

  return (
    <button className={buttonClass} disabled={isLoading} {...props}>
      {isLoading ? (
        <span className={`material-symbols-outlined ${styles.spin}`}>progress_activity</span>
      ) : icon ? (
        icon
      ) : null}
      {isLoading ? 'Đang xử lý...' : children}
    </button>
  );
};

export default Button;
