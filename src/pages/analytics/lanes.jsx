// src/pages/analytics/lanes.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Filter } from 'lucide-react';
import analyticsMock from '../../data/analytics-mock';

// Import styles
import '../../styles/tokens.css';
import '../../styles/global.css';
import './lanes.css';

const Lanes = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [timeRange, setTimeRange] = useState(searchParams.get('range') || '1m');
  const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });
  const [regionFilter, setRegionFilter] = useState('all');

  // Get lanes data for current range
  const allLanes = analyticsMock.allLanesByRange?.[timeRange] || [];

  // Get unique regions for filter
  const regions = ['all', ...new Set(allLanes.map(lane => lane.region))];

  // Filter and sort lanes
  const processedLanes = React.useMemo(() => {
    let filtered = [...allLanes];
    
    // Apply region filter
    if (regionFilter !== 'all') {
      filtered = filtered.filter(lane => lane.region === regionFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [allLanes, regionFilter, sortConfig]);

  // Calculate totals
  const totals = React.useMemo(() => {
    return processedLanes.reduce((acc, lane) => ({
      loads: acc.loads + lane.loads,
      revenue: acc.revenue + lane.revenue
    }), { loads: 0, revenue: 0 });
  }, [processedLanes]);

  // Handle time range change
  const handleTimeRangeChange = (newRange) => {
    setTimeRange(newRange);
    navigate(`/analytics/lanes?range=${newRange}`, { replace: true });
  };

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Get sort indicator
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'desc' ? '▼' : '▲';
  };

  // Handle export
  const handleExport = () => {
    // Create CSV content
    const headers = ['Region', 'Lane', 'Loads', 'Revenue', 'Change %'];
    const rows = processedLanes.map(lane => [
      lane.region,
      lane.lane,
      lane.loads,
      lane.revenue,
      lane.changePct
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lanes-${timeRange}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get time range label
  const getTimeRangeLabel = () => {
    const labels = {
      'week': 'Past Week',
      '1m': 'Past Month',
      '3m': 'Past 3 Months',
      '6m': 'Past 6 Months',
      '1y': 'Past Year'
    };
    return labels[timeRange] || timeRange;
  };

  return (
    <div className="lanes-page">
      {/* Header */}
      <div className="lanes-header">
        <div className="header-top">
          <button 
            className="back-button"
            onClick={() => navigate('/analytics')}
          >
            <ArrowLeft size={20} />
            Back to Analytics
          </button>
          <button 
            className="export-button"
            onClick={handleExport}
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
        
        <h1>All Lanes Performance</h1>
        <p className="subtitle">Detailed breakdown of lane performance for {getTimeRangeLabel().toLowerCase()}</p>
      </div>

      {/* Controls */}
      <div className="lanes-controls">
        {/* Time Range Selector */}
        <div className="time-range-wrapper">
          <label>Time Range</label>
          <div className="time-range-selector">
            <button 
              className={timeRange === 'week' ? 'active' : ''}
              onClick={() => handleTimeRangeChange('week')}
            >
              Week
            </button>
            <button 
              className={timeRange === '1m' ? 'active' : ''}
              onClick={() => handleTimeRangeChange('1m')}
            >
              1M
            </button>
            <button 
              className={timeRange === '3m' ? 'active' : ''}
              onClick={() => handleTimeRangeChange('3m')}
            >
              3M
            </button>
            <button 
              className={timeRange === '6m' ? 'active' : ''}
              onClick={() => handleTimeRangeChange('6m')}
            >
              6M
            </button>
            <button 
              className={timeRange === '1y' ? 'active' : ''}
              onClick={() => handleTimeRangeChange('1y')}
            >
              1Y
            </button>
          </div>
        </div>

        {/* Region Filter */}
        <div className="filter-wrapper">
          <label>
            <Filter size={16} />
            Region
          </label>
          <select 
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="region-filter"
          >
            {regions.map(region => (
              <option key={region} value={region}>
                {region === 'all' ? 'All Regions' : region}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-label">Total Lanes</div>
          <div className="summary-value">{processedLanes.length}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Loads</div>
          <div className="summary-value">{totals.loads.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Revenue</div>
          <div className="summary-value">${totals.revenue.toLocaleString()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Avg Revenue/Lane</div>
          <div className="summary-value">
            ${processedLanes.length > 0 
              ? Math.round(totals.revenue / processedLanes.length).toLocaleString()
              : 0}
          </div>
        </div>
      </div>

      {/* Lanes Table */}
      <div className="lanes-table-container">
        {processedLanes.length > 0 ? (
          <table className="lanes-table">
            <thead>
              <tr>
                <th>Region</th>
                <th 
                  onClick={() => handleSort('lane')}
                  className="sortable"
                >
                  Lane {getSortIndicator('lane')}
                </th>
                <th 
                  onClick={() => handleSort('loads')}
                  className="sortable numeric"
                >
                  Loads {getSortIndicator('loads')}
                </th>
                <th 
                  onClick={() => handleSort('revenue')}
                  className="sortable numeric"
                >
                  Revenue {getSortIndicator('revenue')}
                </th>
                <th 
                  onClick={() => handleSort('changePct')}
                  className="sortable numeric"
                >
                  Change {getSortIndicator('changePct')}
                </th>
              </tr>
            </thead>
            <tbody>
              {processedLanes.map((lane, index) => (
                <tr key={index}>
                  <td>
                    <span className={`region-badge region-${lane.region.toLowerCase()}`}>
                      {lane.region}
                    </span>
                  </td>
                  <td className="lane-name">{lane.lane}</td>
                  <td className="numeric">{lane.loads}</td>
                  <td className="numeric revenue">${lane.revenue.toLocaleString()}</td>
                  <td className="numeric">
                    <span className={`change-badge ${lane.changePct >= 0 ? 'positive' : 'negative'}`}>
                      {lane.changePct >= 0 ? '▲' : '▼'} {Math.abs(lane.changePct)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">
            <p>No lane data available for {getTimeRangeLabel().toLowerCase()}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Lanes;