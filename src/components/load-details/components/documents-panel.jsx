// ============================================================
// FILE: src/components/load-details/components/documents-panel.jsx
// BOL button, gate passes, photos, and document downloads
// ============================================================

import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { 
  DocumentIcon, GatePassIcon, ImageIcon, FileTextIcon, 
  DownloadAllIcon, DownloadIcon,
  ZoomInIcon, ZoomOutIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon
} from './icons';
import { getFullImageUrl } from '../utils/formatters';
import { fetchDownloadUrl } from '../../../services/documents.api';
import { useAuth } from '../../../store/auth-context.jsx';

// Canonical API base. Empty string in dev (Vite proxy handles /api) and in
// prod with the Vercel→Railway rewrite. Cross-origin only when VITE_API_BASE
// or VITE_API_URL is explicitly set. See src/lib/api-url.js for full docs.
import { API_BASE } from '../../../lib/api-url.js';

// BOL Download Button
export const BolButton = ({ onClick, isLoading }) => {
  return (
    <div className="ldm-section">
      <button 
        className={`ldm-bol-btn ${isLoading ? 'ldm-bol-btn--loading' : ''}`}
        onClick={onClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <span className="ldm-bol-btn__spinner" />
            Generating PDF...
          </>
        ) : (
          <>
            <DocumentIcon />
            Download BOL (PDF)
          </>
        )}
      </button>
    </div>
  );
};

// Document Link.
//
// Rendered as a <button>, NOT an <a>. The previous "<a href={authUrl}>"
// pattern broke in production because middle-click / right-click "Open
// in new tab" bypassed the click handler that would otherwise inject
// the auth header — and that landed the user on the SPA fallback,
// which then bounced them to /dashboard.
//
// Flow:
//   1. Hit /api/documents/:id/url with the Bearer header.
//   2. Backend returns either a Supabase signed URL or a relative
//      /api/uploads/... path that travels through the dev Vite proxy
//      and the prod Vercel rewrite.
//   3. window.open the URL — never window.location.href, never
//      navigate(), so the current tab is never touched.
const DocLink = ({ doc, label }) => {
  const { token } = useAuth();
  const [pending, setPending] = useState(false);

  if (!doc) return null;

  // Pre-uploaded/stub docs without an id sometimes have a direct fileUrl.
  // Those don't need the URL handshake.
  const directUrl = !doc.id
    ? (() => {
        const u = doc.fileUrl || doc.filePath;
        if (!u) return null;
        return u.startsWith('http') ? u : `${API_BASE}${u}`;
      })()
    : null;

  if (!doc.id && !directUrl) return null;

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      const url = directUrl
        ? directUrl
        : await fetchDownloadUrl(doc.id, token);
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) {
        // Popup blocker swallowed the new tab. Don't navigate the
        // current tab — alert the user so they can allow popups.
        alert('Your browser blocked the popup. Please allow popups for this site and try again.');
      }
    } catch (err) {
      console.error('[DocLink] download failed:', err);
      alert(`Could not open document: ${err.message || 'unknown error'}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="ldm-doc-link"
      aria-busy={pending}
      disabled={pending}
    >
      <DownloadIcon />{label}
    </button>
  );
};

// Gate Pass Section
export const GatePassSection = ({ gatePasses, showGatePass }) => {
  if (!showGatePass || !gatePasses || gatePasses.length === 0) return null;
  
  return (
    <div className="ldm-section">
      <div className="ldm-section-label">Order Documents</div>
      <div className="ldm-box ldm-docs-section">
        <div className="ldm-docs-group">
          <div className="ldm-docs-group-header">
            <div className="ldm-docs-group-title">
              <GatePassIcon />
              <span>Gate Pass{gatePasses.length > 1 ? 'es' : ''} ({gatePasses.length})</span>
            </div>
          </div>
          <div className="ldm-gatepass-list">
            {gatePasses.map((gp, index) => (
              <div key={gp.id} className="ldm-gatepass-item">
                <DocLink 
                  doc={gp} 
                  label={gp.originalName || `Gate Pass ${index + 1}`} 
                />
                {gp.gatePassType && (
                  <span className="ldm-gatepass-type">
                    ({gp.gatePassType === 'pickup' ? 'Pickup' : 'Drop-off'})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Download All as Zip utility
const downloadAllAsZip = async (photos, zipFileName = 'photos.zip') => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  const fetchPromises = photos.map(async (photo, index) => {
    const url = getFullImageUrl(photo);
    const filename = photo.originalName || `photo_${index + 1}.jpg`;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      zip.file(filename, blob);
    } catch (err) {
      console.error(`Failed to fetch ${filename}:`, err);
    }
  });

  await Promise.all(fetchPromises);
  
  const content = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = zipFileName;
  link.click();
  URL.revokeObjectURL(link.href);
};

// Download All Button
const DownloadAllButton = ({ photos, label = 'Download All', zipName = 'photos.zip' }) => {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadAll = async () => {
    if (downloading || photos.length === 0) return;
    
    setDownloading(true);
    try {
      await downloadAllAsZip(photos, zipName);
    } catch (err) {
      console.error('Failed to create zip:', err);
      alert('Failed to download photos. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button 
      className={`ldm-download-all-btn ${downloading ? 'ldm-download-all-btn--loading' : ''}`}
      onClick={handleDownloadAll}
      disabled={downloading}
    >
      {downloading ? (
        <>
          <span className="ldm-download-all-btn__spinner" />
          Preparing...
        </>
      ) : (
        <>
          <DownloadAllIcon />
          {label}
        </>
      )}
    </button>
  );
};

// Photo Grid
const PhotoGrid = ({ photos, onImageClick }) => {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 12;
  
  const displayedPhotos = showAll ? photos : photos.slice(0, INITIAL_DISPLAY_COUNT);
  const remainingCount = photos.length - INITIAL_DISPLAY_COUNT;
  
  return (
    <div className="ldm-photos-container">
      <div className="ldm-photos-grid">
        {displayedPhotos.map((photo, index) => {
          const fullUrl = getFullImageUrl(photo);
          
          return (
            <button 
              key={photo.id}
              className="ldm-photo-thumb"
              onClick={() => onImageClick(index)}
              aria-label={`View ${photo.originalName || 'photo'}`}
            >
              <img src={fullUrl} alt={photo.originalName || 'Photo'} />
              <div className="ldm-photo-thumb__overlay">
                <ZoomInIcon />
              </div>
            </button>
          );
        })}
      </div>
      
      {photos.length > INITIAL_DISPLAY_COUNT && (
        <button 
          className="ldm-photos-toggle"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll 
            ? 'Show less' 
            : `Show ${remainingCount} more photo${remainingCount !== 1 ? 's' : ''}`
          }
        </button>
      )}
    </div>
  );
};

// Image Lightbox
export const ImageLightbox = ({ images, currentIndex, onClose, onNext, onPrev }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const imageRef = React.useRef(null);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') { setIsZoomed(false); onNext(); }
      if (e.key === 'ArrowLeft') { setIsZoomed(false); onPrev(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, onNext, onPrev]);

  React.useEffect(() => {
    setIsZoomed(false);
    setZoomPosition({ x: 50, y: 50 });
  }, [currentIndex]);

  if (currentIndex === null || !images[currentIndex]) return null;

  const currentImage = images[currentIndex];
  const fullUrl = getFullImageUrl(currentImage);

  const handleImageClick = (e) => {
    if (!isZoomed) {
      const rect = imageRef.current?.getBoundingClientRect();
      if (rect) {
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomPosition({ x, y });
      }
    }
    setIsZoomed(!isZoomed);
  };

  const handleMouseMove = (e) => {
    if (isZoomed && imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPosition({ x, y });
    }
  };

  const handleDownloadSingle = async (e) => {
    e.stopPropagation();
    try {
      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = currentImage.originalName || `photo_${currentIndex + 1}.jpg`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(fullUrl, '_blank');
    }
  };

  return ReactDOM.createPortal(
    <div className="ldm-lightbox" onClick={onClose}>
      <div className="ldm-lightbox__toolbar" onClick={(e) => e.stopPropagation()}>
        <div className="ldm-lightbox__toolbar-left">
          {images.length > 1 && (
            <span className="ldm-lightbox__counter">
              {currentIndex + 1} / {images.length}
            </span>
          )}
        </div>
        <div className="ldm-lightbox__toolbar-right">
          <button 
            className="ldm-lightbox__tool-btn"
            onClick={() => setIsZoomed(!isZoomed)}
            title={isZoomed ? "Zoom out" : "Zoom in"}
          >
            {isZoomed ? <ZoomOutIcon /> : <ZoomInIcon />}
          </button>
          <button 
            className="ldm-lightbox__tool-btn"
            onClick={handleDownloadSingle}
            title="Download this photo"
          >
            <DownloadAllIcon />
          </button>
          <button 
            className="ldm-lightbox__tool-btn ldm-lightbox__close-btn"
            onClick={onClose}
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
      
      {images.length > 1 && (
        <>
          <button 
            className="ldm-lightbox__nav ldm-lightbox__nav--prev"
            onClick={(e) => { e.stopPropagation(); setIsZoomed(false); onPrev(); }}
            aria-label="Previous image"
          >
            <ChevronLeftIcon />
          </button>
          <button 
            className="ldm-lightbox__nav ldm-lightbox__nav--next"
            onClick={(e) => { e.stopPropagation(); setIsZoomed(false); onNext(); }}
            aria-label="Next image"
          >
            <ChevronRightIcon />
          </button>
        </>
      )}
      
      <div 
        className={`ldm-lightbox__content ${isZoomed ? 'ldm-lightbox__content--zoomed' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={handleMouseMove}
      >
        <img 
          ref={imageRef}
          src={fullUrl} 
          alt={currentImage.originalName || 'Photo'} 
          className={`ldm-lightbox__image ${isZoomed ? 'ldm-lightbox__image--zoomed' : ''}`}
          onClick={handleImageClick}
          style={isZoomed ? {
            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
            cursor: 'zoom-out'
          } : {
            cursor: 'zoom-in'
          }}
        />
      </div>
      
      <div className="ldm-lightbox__info" onClick={(e) => e.stopPropagation()}>
        <span className="ldm-lightbox__filename">
          {currentImage.originalName || 'Photo'}
        </span>
        <span className="ldm-lightbox__hint">
          Click image to {isZoomed ? 'zoom out' : 'zoom in'} • Use arrow keys to navigate
        </span>
      </div>
    </div>,
    document.body
  );
};

// Photos and Documents Section
export const PhotosDocumentsSection = ({ 
  pickupPhotos, 
  deliveryPhotos, 
  podDocument,
  orderNum,
  loadId,
  onOpenLightbox,
}) => {
  const hasContent = pickupPhotos.length > 0 || deliveryPhotos.length > 0 || podDocument;
  if (!hasContent) return null;
  
  return (
    <div className="ldm-section">
      <div className="ldm-section-label">Photos & Documents</div>
      <div className="ldm-box ldm-docs-section">
        {pickupPhotos.length > 0 && (
          <div className="ldm-docs-group">
            <div className="ldm-docs-group-header">
              <div className="ldm-docs-group-title">
                <ImageIcon />
                <span>Pickup Photos ({pickupPhotos.length})</span>
              </div>
              <DownloadAllButton 
                photos={pickupPhotos} 
                label="Download All"
                zipName={`pickup-photos-${orderNum || loadId?.slice(-6)}.zip`}
              />
            </div>
            <PhotoGrid 
              photos={pickupPhotos} 
              onImageClick={(index) => onOpenLightbox(pickupPhotos, index)}
            />
          </div>
        )}

        {deliveryPhotos.length > 0 && (
          <div className="ldm-docs-group">
            <div className="ldm-docs-group-header">
              <div className="ldm-docs-group-title">
                <ImageIcon />
                <span>Delivery Photos ({deliveryPhotos.length})</span>
              </div>
              <DownloadAllButton 
                photos={deliveryPhotos} 
                label="Download All"
                zipName={`delivery-photos-${orderNum || loadId?.slice(-6)}.zip`}
              />
            </div>
            <PhotoGrid 
              photos={deliveryPhotos} 
              onImageClick={(index) => onOpenLightbox(deliveryPhotos, index)}
            />
          </div>
        )}

        {podDocument && (
          <div className="ldm-docs-group">
            <div className="ldm-docs-group-header">
              <div className="ldm-docs-group-title">
                <FileTextIcon />
                <span>Proof of Delivery (POD)</span>
              </div>
            </div>
            <DocLink doc={podDocument} label={podDocument.originalName || 'Download POD'} />
          </div>
        )}
      </div>
    </div>
  );
};

export default {
  BolButton,
  GatePassSection,
  PhotosDocumentsSection,
  ImageLightbox,
};
