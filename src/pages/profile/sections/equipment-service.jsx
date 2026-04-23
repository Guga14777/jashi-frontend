import React, { useState, useRef, useEffect } from 'react';
import FormSection from '../../../components/ui/form-section';
import './equipment-service.css';

const EquipmentService = ({ formData, setFormData }) => {
  const [showEquipmentInput, setShowEquipmentInput] = useState(false);
  const [showAreaInput, setShowAreaInput] = useState(false);
  const [showLaneInput, setShowLaneInput] = useState(false);
  const [equipmentValue, setEquipmentValue] = useState('');
  const [areaValue, setAreaValue] = useState('');
  const [laneValue, setLaneValue] = useState('');
  const [equipmentError, setEquipmentError] = useState('');
  const [areaError, setAreaError] = useState('');
  const [laneError, setLaneError] = useState('');
  const [focusedItemIndex, setFocusedItemIndex] = useState(-1);
  
  const equipmentInputRef = useRef(null);
  const areaInputRef = useRef(null);
  const laneInputRef = useRef(null);
  const equipmentListRef = useRef(null);
  const areaListRef = useRef(null);
  const laneListRef = useRef(null);

  // Initialize arrays if undefined
  const equipmentTypes = formData.equipmentTypes || [];
  const serviceAreas = formData.serviceAreas || [];
  const preferredLanes = formData.preferredLanes || [];

  // Caps
  const EQUIPMENT_CAP = 10;
  const AREAS_CAP = 12;
  const LANES_CAP = 20;

  // Common equipment suggestions
  const equipmentSuggestions = [
    "Dry Van", "Reefer", "Flatbed", "Step Deck", "Power Only", "Box Truck",
    "Lowboy", "Car Carrier", "Tanker", "Container"
  ];

  // Common service area suggestions
  const areaSuggestions = [
    "Midwest", "Southeast", "Northeast", "Southwest", "Pacific Northwest",
    "California", "Texas", "Florida", "Great Lakes", "Rocky Mountains"
  ];

  useEffect(() => {
    if (showEquipmentInput && equipmentInputRef.current) {
      equipmentInputRef.current.focus();
    }
  }, [showEquipmentInput]);

  useEffect(() => {
    if (showAreaInput && areaInputRef.current) {
      areaInputRef.current.focus();
    }
  }, [showAreaInput]);

  useEffect(() => {
    if (showLaneInput && laneInputRef.current) {
      laneInputRef.current.focus();
    }
  }, [showLaneInput]);

  const toTitleCase = (str) => {
    return str.replace(/\w\S*/g, (txt) =>
      txt.charAt(0).toUpperCase() + txt.charAt(1).toLowerCase()
    );
  };

  const formatLane = (str) => {
    // Simple format: "City, ST – City, ST"
    const cleaned = str.trim();
    if (cleaned.includes('–')) {
      const parts = cleaned.split('–').map(part => part.trim());
      return parts.join(' – ');
    } else if (cleaned.includes('-')) {
      const parts = cleaned.split('-').map(part => part.trim());
      return parts.join(' – ');
    }
    return cleaned;
  };

  const validateLane = (str) => {
    const formatted = formatLane(str);
    // Basic validation for "A – B" pattern
    const lanePattern = /^.+\s–\s.+$/;
    return lanePattern.test(formatted);
  };

  const checkDuplicate = (value, list) => {
    const normalized = value.toLowerCase().trim();
    return list.some(item => item.toLowerCase().trim() === normalized);
  };

  const addEquipmentType = () => {
    const trimmed = equipmentValue.trim();
    if (!trimmed) return;

    const formatted = toTitleCase(trimmed);
    
    if (checkDuplicate(formatted, equipmentTypes)) {
      setEquipmentError('This equipment type already exists');
      return;
    }

    if (equipmentTypes.length >= EQUIPMENT_CAP) {
      setEquipmentError(`Maximum ${EQUIPMENT_CAP} equipment types allowed`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      equipmentTypes: [...prev.equipmentTypes, formatted]
    }));
    setEquipmentValue('');
    setEquipmentError('');
    // Keep input open for rapid entry
  };

  const removeEquipmentType = (index) => {
    setFormData(prev => ({
      ...prev,
      equipmentTypes: prev.equipmentTypes.filter((_, i) => i !== index)
    }));
    
    // Move focus to previous item or add button
    const newIndex = index > 0 ? index - 1 : -1;
    setFocusedItemIndex(newIndex);
  };

  const addServiceArea = () => {
    const trimmed = areaValue.trim();
    if (!trimmed) return;

    const formatted = toTitleCase(trimmed);
    
    if (checkDuplicate(formatted, serviceAreas)) {
      setAreaError('This service area already exists');
      return;
    }

    if (serviceAreas.length >= AREAS_CAP) {
      setAreaError(`Maximum ${AREAS_CAP} service areas allowed`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      serviceAreas: [...prev.serviceAreas, formatted]
    }));
    setAreaValue('');
    setAreaError('');
  };

  const removeServiceArea = (index) => {
    setFormData(prev => ({
      ...prev,
      serviceAreas: prev.serviceAreas.filter((_, i) => i !== index)
    }));
  };

  const addPreferredLane = () => {
    const trimmed = laneValue.trim();
    if (!trimmed) return;

    const formatted = formatLane(trimmed);
    
    if (!validateLane(formatted)) {
      setLaneError('Please use format: "City, ST – City, ST"');
      return;
    }

    if (checkDuplicate(formatted, preferredLanes)) {
      setLaneError('This lane already exists');
      return;
    }

    if (preferredLanes.length >= LANES_CAP) {
      setLaneError(`Maximum ${LANES_CAP} preferred lanes allowed`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      preferredLanes: [...prev.preferredLanes, formatted]
    }));
    setLaneValue('');
    setLaneError('');
  };

  const removePreferredLane = (index) => {
    setFormData(prev => ({
      ...prev,
      preferredLanes: prev.preferredLanes.filter((_, i) => i !== index)
    }));
  };

  const handleKeyPress = (e, addFunction, closeFunction, errorSetter) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFunction();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      closeFunction();
      errorSetter('');
    }
  };

  const handleItemKeyDown = (e, removeFunction, index, listLength) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      removeFunction(index);
    }
  };

  const isAddDisabled = (value, list, cap, validator = null) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (list.length >= cap) return true;
    if (checkDuplicate(trimmed, list)) return true;
    if (validator && !validator(trimmed)) return true;
    return false;
  };

  return (
    <FormSection title="Equipment & Service">
      <div className="equipment-service-grid">
        <div className="equipment-section">
          <div className="subsection-header">
            <h4 className="subsection-title">Equipment Types</h4>
            <span className="count-badge">
              {equipmentTypes.length}/{EQUIPMENT_CAP}
            </span>
          </div>
          
          <div className="compact-list" ref={equipmentListRef}>
            {equipmentTypes.length === 0 && !showEquipmentInput && (
              <div className="empty-state">No equipment types yet</div>
            )}
            
            {equipmentTypes.map((type, index) => (
              <div 
                key={index} 
                className="list-item-compact"
                tabIndex="0"
                onKeyDown={(e) => handleItemKeyDown(e, removeEquipmentType, index, equipmentTypes.length)}
                aria-label={`${type} equipment type. Press Delete to remove`}
              >
                <span>{type}</span>
                <button 
                  className="remove-btn-small"
                  onClick={() => removeEquipmentType(index)}
                  type="button"
                  aria-label={`Remove ${type} equipment type`}
                >
                  ×
                </button>
              </div>
            ))}
            
            {showEquipmentInput ? (
              <div className="inline-input-group" id="equipment-input-container">
                <input
                  ref={equipmentInputRef}
                  type="text"
                  className="inline-input"
                  placeholder="Enter equipment type"
                  value={equipmentValue}
                  onChange={(e) => {
                    setEquipmentValue(e.target.value);
                    setEquipmentError('');
                  }}
                  onKeyDown={(e) => handleKeyPress(e, addEquipmentType, () => setShowEquipmentInput(false), setEquipmentError)}
                  list="equipment-suggestions"
                />
                <datalist id="equipment-suggestions">
                  {equipmentSuggestions.map((suggestion, index) => (
                    <option key={index} value={suggestion} />
                  ))}
                </datalist>
                <div className="inline-input-actions">
                  <button
                    className="inline-btn-confirm"
                    onClick={addEquipmentType}
                    type="button"
                    disabled={isAddDisabled(equipmentValue, equipmentTypes, EQUIPMENT_CAP)}
                    aria-label="Confirm add equipment"
                  >
                    ✓
                  </button>
                  <button
                    className="inline-btn-cancel"
                    onClick={() => {
                      setShowEquipmentInput(false);
                      setEquipmentError('');
                    }}
                    type="button"
                    aria-label="Cancel add equipment"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <button 
                className="add-btn-compact" 
                onClick={() => setShowEquipmentInput(true)} 
                type="button"
                disabled={equipmentTypes.length >= EQUIPMENT_CAP}
                aria-label="Add equipment type"
                aria-expanded={showEquipmentInput}
                aria-controls="equipment-input-container"
              >
                + Add Equipment
              </button>
            )}
            
            {equipmentError && (
              <div className="error-message" role="alert">
                {equipmentError}
              </div>
            )}
          </div>
        </div>
        
        <div className="service-section">
          <div className="subsection-header">
            <h4 className="subsection-title">
              Service Areas
              <span className="help-text" title="Focus on regions rather than specific cities">ⓘ</span>
            </h4>
            <span className="count-badge">
              {serviceAreas.length}/{AREAS_CAP}
            </span>
          </div>
          
          <div className="chip-container" ref={areaListRef}>
            {serviceAreas.length === 0 && !showAreaInput && (
              <div className="empty-state">No service areas yet</div>
            )}
            
            {serviceAreas.map((area, index) => (
              <span 
                key={index} 
                className="chip chip-removable"
                tabIndex="0"
                onKeyDown={(e) => handleItemKeyDown(e, removeServiceArea, index, serviceAreas.length)}
                aria-label={`${area} service area. Press Delete to remove`}
              >
                {area}
                <button
                  className="chip-remove"
                  onClick={() => removeServiceArea(index)}
                  aria-label={`Remove ${area} service area`}
                >
                  ×
                </button>
              </span>
            ))}
            
            {showAreaInput ? (
              <div className="inline-chip-input" id="area-input-container">
                <input
                  ref={areaInputRef}
                  type="text"
                  className="chip-input"
                  placeholder="Service area"
                  value={areaValue}
                  onChange={(e) => {
                    setAreaValue(e.target.value);
                    setAreaError('');
                  }}
                  onKeyDown={(e) => handleKeyPress(e, addServiceArea, () => setShowAreaInput(false), setAreaError)}
                  list="area-suggestions"
                />
                <datalist id="area-suggestions">
                  {areaSuggestions.map((suggestion, index) => (
                    <option key={index} value={suggestion} />
                  ))}
                </datalist>
              </div>
            ) : (
              <button 
                className="add-chip-btn" 
                onClick={() => setShowAreaInput(true)} 
                type="button"
                disabled={serviceAreas.length >= AREAS_CAP}
                aria-label="Add service area"
                aria-expanded={showAreaInput}
                aria-controls="area-input-container"
              >
                + Add
              </button>
            )}
            
            {areaError && (
              <div className="error-message" role="alert">
                {areaError}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="lanes-section">
        <div className="subsection-header">
          <h4 className="subsection-title">Preferred Lanes</h4>
          <span className="count-badge">
            {preferredLanes.length}/{LANES_CAP}
          </span>
        </div>
        
        <div className="lanes-list-compact" ref={laneListRef}>
          {preferredLanes.length === 0 && !showLaneInput && (
            <div className="empty-state">No preferred lanes yet</div>
          )}
          
          {preferredLanes.map((lane, index) => (
            <div 
              key={index} 
              className="lane-item-compact"
              tabIndex="0"
              onKeyDown={(e) => handleItemKeyDown(e, removePreferredLane, index, preferredLanes.length)}
              aria-label={`${lane} preferred lane. Press Delete to remove`}
            >
              <span>{lane}</span>
              <button 
                className="remove-btn-small"
                onClick={() => removePreferredLane(index)}
                type="button"
                aria-label={`Remove ${lane} preferred lane`}
              >
                ×
              </button>
            </div>
          ))}
          
          {showLaneInput ? (
            <div className="inline-input-group full" id="lane-input-container">
              <input
                ref={laneInputRef}
                type="text"
                className="inline-input"
                placeholder="e.g., Chicago, IL – Atlanta, GA"
                value={laneValue}
                onChange={(e) => {
                  setLaneValue(e.target.value);
                  setLaneError('');
                }}
                onKeyDown={(e) => handleKeyPress(e, addPreferredLane, () => setShowLaneInput(false), setLaneError)}
              />
              <div className="inline-input-actions">
                <button
                  className="inline-btn-confirm"
                  onClick={addPreferredLane}
                  type="button"
                  disabled={isAddDisabled(laneValue, preferredLanes, LANES_CAP, validateLane)}
                  aria-label="Confirm add lane"
                >
                  ✓
                </button>
                <button
                  className="inline-btn-cancel"
                  onClick={() => {
                    setShowLaneInput(false);
                    setLaneError('');
                  }}
                  type="button"
                  aria-label="Cancel add lane"
                >
                  ×
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="add-btn-compact full" 
              onClick={() => setShowLaneInput(true)} 
              type="button"
              disabled={preferredLanes.length >= LANES_CAP}
              aria-label="Add preferred lane"
              aria-expanded={showLaneInput}
              aria-controls="lane-input-container"
            >
              + Add Preferred Lane
            </button>
          )}
          
          {laneError && (
            <div className="error-message" role="alert">
              {laneError}
            </div>
          )}
        </div>
      </div>
    </FormSection>
  );
};

export default EquipmentService;