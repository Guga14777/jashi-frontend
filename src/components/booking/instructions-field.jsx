// src/components/booking/instructions-field.jsx
import React from 'react';

export default function InstructionsField({ value, onChange }) {
  return (
    <div className="instr">
      <h4 className="instr-title">Driver Notes / Instructions</h4>
      <textarea
        className="instr-textarea"
        rows={5}
        placeholder="Gate codes, vehicle runs?, special pickup tips, etc."
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
