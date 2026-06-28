import React, { useState } from 'react';
import styles from './Input.module.css';

const Input = ({ label, id, type = 'text', icon, placeholder, required, forgotPasswordLink, multiline, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <label htmlFor={id} className={styles.label}>{label}</label>
        {forgotPasswordLink && (
          <a 
            href={typeof forgotPasswordLink === 'string' ? forgotPasswordLink : '#'} 
            onClick={(e) => {
              if (typeof forgotPasswordLink === 'function') {
                e.preventDefault();
                forgotPasswordLink();
              }
            }}
            className={styles.forgotLink}
          >
            Quên mật khẩu?
          </a>
        )}
      </div>
      
      <div className={styles.inputGroup}>
        {icon && <span className={`material-symbols-outlined ${styles.leftIcon}`}>{icon}</span>}
        
        {multiline ? (
          <textarea
            id={id}
            placeholder={placeholder}
            required={required}
            className={`${styles.input} ${styles.textarea}`}
            {...props}
          />
        ) : (
          <input
            id={id}
            type={inputType}
            placeholder={placeholder}
            required={required}
            className={`${styles.input} ${isPassword ? styles.hasRightIcon : ''}`}
            {...props}
          />
        )}
        
        {isPassword && (
          <button 
            type="button" 
            onClick={() => setShowPassword(!showPassword)} 
            className={styles.rightIcon}
          >
            <span className="material-symbols-outlined">
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Input;
