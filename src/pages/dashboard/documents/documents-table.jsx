// ============================================================
// FILE: src/pages/dashboard/documents/documents-table.jsx
// ✅ UPDATED: Displays real document data from database
// ✅ FIXED: Order ID column with proper badge styling
// ============================================================

import React from "react";
import { Icons, getDocTypeLabel, getFileIcon, formatDate } from "./documents-shared";
import "./documents-table.css";

const DocumentsTable = ({ 
  documents, 
  isLoading, 
  totalDocuments, 
  onPreview, 
  searchValue, 
  onSearchChange 
}) => {
  return (
    <section className="documents-section" aria-labelledby="documents-heading">
      <div className="section-header">
        <h2 id="documents-heading">
          Documents ({isLoading ? "..." : totalDocuments})
        </h2>
        <div className="search-container">
          <label htmlFor="document-search" className="visually-hidden">
            Search documents
          </label>
          <div className="search-input-container">
            <Icons.Search />
            <input
              id="document-search"
              type="text"
              placeholder="Search by filename or order ID..."
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state" aria-live="polite">
          <div className="skeleton-table" aria-label="Loading documents">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton-cell"></div>
                <div className="skeleton-cell"></div>
                <div className="skeleton-cell"></div>
                <div className="skeleton-cell"></div>
                <div className="skeleton-cell"></div>
              </div>
            ))}
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">
            <Icons.DocumentText />
          </div>
          <h3>No documents found</h3>
          <p>
            {searchValue 
              ? "Try adjusting your search terms or clear the search to see all documents." 
              : "Documents will appear here once they are uploaded during the booking process."
            }
          </p>
        </div>
      ) : (
        <div className="documents-table-container">
          <table className="documents-table" role="table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Order ID</th>
                <th scope="col">Type</th>
                <th scope="col">Uploaded</th>
                <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const FileIcon = getFileIcon(doc.name || doc.originalName || doc.fileName);
                const displayName = doc.name || doc.originalName || doc.fileName || 'Unnamed Document';
                const uploaderName = doc.uploadedBy?.name || 
                  (doc.uploadedBy?.firstName && doc.uploadedBy?.lastName 
                    ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` 
                    : 'Unknown');
                const uploadDate = doc.uploadedAt || doc.createdAt;
                
                return (
                  <tr key={doc.id}>
                    <td>
                      <div className="doc-name">
                        <FileIcon />
                        <div className="doc-name-content">
                          <span className="doc-filename" title={displayName}>
                            {displayName}
                          </span>
                          <span className="doc-source">
                            Uploaded by: {uploaderName}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      {/* Order ID with badge styling */}
                      {doc.shipmentId ? (
                        <span className="order-id-badge">
                          {doc.shipmentId}
                        </span>
                      ) : (
                        <span className="order-id-none">—</span>
                      )}
                    </td>
                    <td>
                      <span className="doc-type-badge">
                        {getDocTypeLabel(doc.type)}
                      </span>
                    </td>
                    <td>
                      <time dateTime={uploadDate}>
                        {formatDate(uploadDate)}
                      </time>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => onPreview(doc)} 
                          aria-label={`View details for ${displayName}`}
                          type="button"
                        >
                          View Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default DocumentsTable;