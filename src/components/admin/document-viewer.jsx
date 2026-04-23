// src/components/admin/document-viewer.jsx
// Inline viewer for admin-accessible documents (PDF + images).
// Supports Supabase public URLs and local /uploads paths transparently.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { X, Download, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import './document-viewer.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Derive a browser-loadable URL for a document regardless of storage backend.
 * - Supabase-hosted files have an absolute public `fileUrl`.
 * - Local uploads are served by the Express static handler at /uploads/...
 */
function resolveDocumentUrl(doc) {
  if (!doc) return null;
  if (doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl)) return doc.fileUrl;
  if (doc.fileUrl) return API_BASE + doc.fileUrl;
  if (doc.filePath) {
    const path = doc.filePath.startsWith('/') ? doc.filePath : '/' + doc.filePath;
    return API_BASE + path;
  }
  return null;
}

function isImage(doc) {
  const mt = String(doc?.mimeType || '').toLowerCase();
  return mt.startsWith('image/');
}

function isPdf(doc) {
  const mt = String(doc?.mimeType || '').toLowerCase();
  if (mt === 'application/pdf') return true;
  const name = String(doc?.originalName || doc?.fileName || '').toLowerCase();
  return name.endsWith('.pdf');
}

export default function DocumentViewer({ document: doc, onClose, onDownload }) {
  const [loadFailed, setLoadFailed] = useState(false);

  const url = useMemo(() => resolveDocumentUrl(doc), [doc]);

  useEffect(() => {
    setLoadFailed(false);
  }, [doc?.id]);

  const handleEscape = useCallback((e) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  if (!doc) return null;

  const name = doc.originalName || doc.fileName || 'Document';
  const canPreview = !!url && (isImage(doc) || isPdf(doc));

  return (
    <div className="doc-viewer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Preview ${name}`}>
      <div className="doc-viewer-panel" onClick={(e) => e.stopPropagation()}>
        <header className="doc-viewer-header">
          <div className="doc-viewer-title">
            <FileText size={16} />
            <span>{name}</span>
            {doc.typeLabel && <span className="doc-viewer-type">{doc.typeLabel}</span>}
            {doc.sourceLabel && (
              <span className={`doc-viewer-source doc-viewer-source-${doc.source || 'unknown'}`}>
                {doc.sourceLabel}
              </span>
            )}
          </div>
          <div className="doc-viewer-actions">
            {url && (
              <a
                className="doc-viewer-btn"
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in new tab"
              >
                <ExternalLink size={14} /> Open
              </a>
            )}
            {onDownload && (
              <button
                type="button"
                className="doc-viewer-btn doc-viewer-btn-primary"
                onClick={() => onDownload(doc)}
                title="Download"
              >
                <Download size={14} /> Download
              </button>
            )}
            <button
              type="button"
              className="doc-viewer-btn doc-viewer-btn-icon"
              onClick={onClose}
              aria-label="Close viewer"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="doc-viewer-body">
          {!url ? (
            <div className="doc-viewer-empty">
              <AlertCircle size={28} />
              <p>This document has no file URL on record.</p>
            </div>
          ) : loadFailed ? (
            <div className="doc-viewer-empty">
              <AlertCircle size={28} />
              <p>Couldn&apos;t render this document inline.</p>
              <p className="doc-viewer-empty-hint">Try opening it in a new tab or downloading it.</p>
            </div>
          ) : isImage(doc) ? (
            <img
              className="doc-viewer-img"
              src={url}
              alt={name}
              onError={() => setLoadFailed(true)}
            />
          ) : isPdf(doc) ? (
            <iframe
              className="doc-viewer-iframe"
              src={url + '#toolbar=1&navpanes=0'}
              title={name}
              onError={() => setLoadFailed(true)}
            />
          ) : !canPreview ? (
            <div className="doc-viewer-empty">
              <AlertCircle size={28} />
              <p>No inline preview available for this file type.</p>
              <p className="doc-viewer-empty-hint">Download it to view.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

DocumentViewer.propTypes = {
  document: PropTypes.shape({
    id: PropTypes.string,
    fileName: PropTypes.string,
    originalName: PropTypes.string,
    fileUrl: PropTypes.string,
    filePath: PropTypes.string,
    mimeType: PropTypes.string,
    type: PropTypes.string,
    typeLabel: PropTypes.string,
    source: PropTypes.string,
    sourceLabel: PropTypes.string,
  }),
  onClose: PropTypes.func.isRequired,
  onDownload: PropTypes.func,
};
