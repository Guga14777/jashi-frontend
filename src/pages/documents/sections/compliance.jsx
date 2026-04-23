import React from 'react';
import { 
  Shield, CheckCircle, XCircle, AlertCircle,
  FileText, Clock, ExternalLink
} from 'lucide-react';
import './compliance.css';

const Compliance = ({ carrierData = {}, complianceStatus = {} }) => {
  // Compliance checklist items
  const checklistItems = [
    {
      id: 'registration',
      label: 'Registration on file',
      detail: carrierData.dotNumber ? `USDOT: ${carrierData.dotNumber}` : 
              carrierData.mcNumber ? `MC: ${carrierData.mcNumber}` : 'Not entered',
      passed: complianceStatus.checks?.registration,
      required: true
    },
    {
      id: 'authority',
      label: 'Authority Active',
      detail: carrierData.authorityStatus || 'Not verified',
      passed: complianceStatus.checks?.authority,
      required: true
    },
    {
      id: 'insurance',
      label: 'Public liability filing on file (BMC-91/91X)',
      detail: carrierData.insuranceFiling === 'Yes' ? 'Filing confirmed' : 
              carrierData.insuranceFiling === 'No' ? 'No filing found' : 'Not verified',
      passed: complianceStatus.checks?.insurance,
      required: true
    },
    {
      id: 'safety',
      label: 'Not OOS / No Unsatisfactory',
      detail: carrierData.oosStatus && carrierData.safetyRating ? 
              `OOS: ${carrierData.oosStatus}, Rating: ${carrierData.safetyRating}` : 'Not verified',
      passed: complianceStatus.checks?.safety,
      required: true
    }
  ];

  // Add HHG item if applicable
  if (carrierData.isHHG) {
    checklistItems.push({
      id: 'hhg',
      label: 'HHG cargo filing (BMC-34/83)',
      detail: carrierData.hhgCargoFiling === 'Yes' ? 'Filing confirmed' : 
              carrierData.hhgCargoFiling === 'No' ? 'No filing found' : 'Not verified',
      passed: complianceStatus.checks?.hhgCargo,
      required: true
    });
  }

  const getCheckIcon = (passed) => {
    if (passed === true) return <CheckCircle className="check-icon passed" size={20} />;
    if (passed === false) return <XCircle className="check-icon failed" size={20} />;
    return <AlertCircle className="check-icon pending" size={20} />;
  };

  const getComplianceMessage = () => {
    const passedCount = checklistItems.filter(item => item.passed).length;
    const totalCount = checklistItems.length;
    
    if (passedCount === totalCount) {
      return {
        type: 'success',
        title: 'Fully Compliant',
        message: 'This carrier meets all federal minimum verification requirements.'
      };
    } else if (passedCount > 0) {
      return {
        type: 'warning',
        title: 'Partially Verified',
        message: `${totalCount - passedCount} verification${totalCount - passedCount > 1 ? 's' : ''} still required.`
      };
    } else {
      return {
        type: 'error',
        title: 'Not Verified',
        message: 'Complete carrier verification to meet federal requirements.'
      };
    }
  };

  const statusMessage = getComplianceMessage();

  return (
    <div className="compliance-minimal">
      {/* Compliance Summary Card */}
      <div className={`compliance-summary ${statusMessage.type}`}>
        <div className="summary-icon">
          <Shield size={32} />
        </div>
        <div className="summary-content">
          <h3>{statusMessage.title}</h3>
          <p>{statusMessage.message}</p>
        </div>
      </div>

      {/* Checklist Card */}
      <div className="checklist-card">
        <div className="checklist-header">
          <h3>Federal Minimum Verification Checklist</h3>
          <p className="checklist-subtitle">
            Required checks per FMCSA regulations for freight brokers
          </p>
        </div>

        <div className="checklist-items">
          {checklistItems.map((item) => (
            <div key={item.id} className={`checklist-item ${item.passed ? 'passed' : ''}`}>
              <div className="item-check">
                {getCheckIcon(item.passed)}
              </div>
              <div className="item-content">
                <div className="item-label">
                  {item.label}
                  {item.required && <span className="required-badge">Required</span>}
                </div>
                <div className="item-detail">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="checklist-footer">
          <div className="footer-note">
            <FileText size={16} />
            <span>
              Keep verification records for 3 years per §371.3(c). 
              Each load must reference carrier name, address, and registration number.
            </span>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="info-cards">
        <div className="info-card">
          <h4>What You Must Verify</h4>
          <ul>
            <li>Carrier registration (USDOT/MC)</li>
            <li>Operating authority is Active</li>
            <li>Public liability insurance filing</li>
            <li>Not prohibited from operating</li>
            {carrierData.isHHG && <li>HHG: Cargo insurance filing</li>}
          </ul>
        </div>

        <div className="info-card">
          <h4>What You Must Keep</h4>
          <ul>
            <li>Carrier legal name & address</li>
            <li>Registration numbers</li>
            <li>Verification snapshots with timestamp</li>
            <li>Per-load: BOL/freight bill numbers</li>
            <li>Your compensation details</li>
          </ul>
        </div>

        <div className="info-card">
          <h4>Verification Sources</h4>
          <div className="source-links">
            <a href="https://safer.fmcsa.dot.gov" target="_blank" rel="noopener noreferrer" className="source-link">
              FMCSA SAFER
              <ExternalLink size={14} />
            </a>
            <a href="https://li-public.fmcsa.dot.gov" target="_blank" rel="noopener noreferrer" className="source-link">
              FMCSA L&I
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="compliance-notice">
        <div className="notice-icon">
          <Clock size={20} />
        </div>
        <div className="notice-content">
          <strong>Important:</strong> Verify carrier status before first load and periodically thereafter. 
          Changes in authority, insurance, or safety status can occur at any time. 
          Regular re-verification helps maintain compliance and reduce liability.
        </div>
      </div>
    </div>
  );
};

export default Compliance;