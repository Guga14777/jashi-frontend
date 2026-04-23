import React, { useState } from "react";
import { formatRoute, formatMiles, formatPrice, formatRate } from "../../../utils/formatters";
import LoadFilters from "./load-filters";
import "./available-loads.css";
import "./load-filters.css";

const AvailableLoads = () => {
  // Updated with city names
  const [allLoads] = useState([
    { id: "L001", originCity: "New York", originState: "NY", destCity: "Los Angeles", destState: "CA", vehicle: "Sedan", miles: 2789, price: 3450, rate: 1.24, likelihood: 95 },
    { id: "L002", originCity: "Chicago", originState: "IL", destCity: "Miami", destState: "FL", vehicle: "Pickup", miles: 1377, price: 2200, rate: 1.60, likelihood: 85 },
    { id: "L003", originCity: "Dallas", originState: "TX", destCity: "Phoenix", destState: "AZ", vehicle: "SUV", miles: 1174, price: 2100, rate: 1.79, likelihood: 72 },
    { id: "L004", originCity: "Seattle", originState: "WA", destCity: "San Francisco", destState: "CA", vehicle: "Sedan", miles: 1255, price: 1950, rate: 1.55, likelihood: 88 },
    { id: "L005", originCity: "Newark", originState: "NJ", destCity: "Boston", destState: "MA", vehicle: "Sedan", miles: 216, price: 460, rate: 2.13, likelihood: 60 },
    { id: "L006", originCity: "Atlanta", originState: "GA", destCity: "Charlotte", destState: "NC", vehicle: "Pickup", miles: 320, price: 640, rate: 2.00, likelihood: 70 },
    { id: "L007", originCity: "Cleveland", originState: "OH", destCity: "Pittsburgh", destState: "PA", vehicle: "SUV", miles: 125, price: 300, rate: 2.40, likelihood: 92 },
    { id: "L008", originCity: "Las Vegas", originState: "NV", destCity: "Salt Lake City", destState: "UT", vehicle: "Sedan", miles: 420, price: 710, rate: 1.69, likelihood: 65 },
    { id: "L009", originCity: "Denver", originState: "CO", destCity: "Houston", destState: "TX", vehicle: "Pickup", miles: 920, price: 1680, rate: 1.83, likelihood: 78 },
    { id: "L010", originCity: "Portland", originState: "OR", destCity: "Sacramento", destState: "CA", vehicle: "Sedan", miles: 365, price: 640, rate: 1.75, likelihood: 82 }
  ]);
  
  const [filteredLoads, setFilteredLoads] = useState(allLoads);
  const [showToast, setShowToast] = useState('');

  const handleApplyFilters = (filters) => {
    let filtered = [...allLoads];
    
    // Filter by state
    if (filters.state) {
      filtered = filtered.filter(load => 
        load.originState === filters.state || load.destState === filters.state
      );
    }
    
    // Filter by city
    if (filters.city) {
      filtered = filtered.filter(load => 
        load.originCity === filters.city || load.destCity === filters.city
      );
    }
    
    // Filter by mileage range
    filtered = filtered.filter(load => 
      load.miles >= filters.milesMin && load.miles <= filters.milesMax
    );
    
    // Filter by rate range
    filtered = filtered.filter(load => 
      load.rate >= filters.rateMin && load.rate <= filters.rateMax
    );
    
    // Filter by vehicle types
    if (filters.vehicleTypes.length > 0) {
      filtered = filtered.filter(load => 
        filters.vehicleTypes.includes(load.vehicle)
      );
    }
    
    setFilteredLoads(filtered);
    
    // Show toast
    setShowToast('Filters applied');
    setTimeout(() => setShowToast(''), 3000);
  };

  const handleClearFilters = () => {
    setFilteredLoads(allLoads);
    
    // Show toast
    setShowToast('Filters cleared');
    setTimeout(() => setShowToast(''), 3000);
  };

  const getLikelihoodClass = (percentage) => {
    if (percentage >= 90) return "likelihood-high";
    if (percentage >= 70) return "likelihood-med";
    return "likelihood-low";
  };

  return (
    <div className="available-loads">
      <div className="section-header">
        <h2 className="section-title">Available Loads</h2>
        <p className="section-subtitle">The best opportunities near you — sorted by dispatch success</p>
      </div>

      <LoadFilters onApply={handleApplyFilters} onClear={handleClearFilters} />

      {showToast && (
        <div className="toast-notification">
          {showToast}
        </div>
      )}

      <div className="loads-list">
        {filteredLoads.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-title">No loads match your filters</h3>
            <p className="empty-body">Try expanding mileage or selecting more vehicle types.</p>
          </div>
        ) : (
          filteredLoads.map((load) => (
            <div key={load.id} className="load-card">
              <div className="load-content">
                <div className="load-header">
                  <div className="route-title">
                    {formatRoute(load.originCity, load.originState, load.destCity, load.destState)}
                  </div>
                  <span className={`likelihood-badge ${getLikelihoodClass(load.likelihood)}`}>
                    {load.likelihood}% dispatch
                  </span>
                </div>
                
                <div className="load-meta">
                  <span className="vehicle-type">{load.vehicle}</span>
                  <span className="dot">•</span>
                  <span className="miles-badge">{formatMiles(load.miles)}</span>
                </div>
                
                <div className="load-footer">
                  <div className="price-group">
                    <div className="price-stat">
                      <div className="price-value">{formatPrice(load.price)}</div>
                      <div className="price-label">Total Price</div>
                    </div>
                    <div className="price-stat">
                      <div className="price-value">{formatRate(load.rate)}</div>
                      <div className="price-label">$/mi</div>
                    </div>
                  </div>
                  
                  <div className="action-group">
                    <button className="btn-secondary">Details</button>
                    <button className="btn-primary">Accept offer</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AvailableLoads;