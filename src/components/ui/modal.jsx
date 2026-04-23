import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import "./modal.css";

const Modal = ({ open, onClose, children, maxWidth = "480px", transparent = false }) => {
  const scrollYRef = useRef(0);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const body = document.body;
    scrollYRef.current = window.scrollY;

    body.style.position = "fixed";
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      if (boxRef.current) {
        boxRef.current.scrollTop = 0;
      }
    });

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";
      window.scrollTo(0, scrollYRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`modal-overlay ${transparent ? 'modal-overlay-transparent' : ''}`}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        className="modal-box"
        style={{ maxWidth }}
        ref={boxRef}
        role="document"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
};

Modal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func,
  children: PropTypes.node.isRequired,
  maxWidth: PropTypes.string,
  transparent: PropTypes.bool,
};

export default Modal;