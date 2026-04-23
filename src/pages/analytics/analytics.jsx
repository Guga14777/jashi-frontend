// src/pages/analytics/analytics.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Car, X, Download, FileText, TrendingUp, TrendingDown } from 'lucide-react';
import analyticsMock from '../../data/analytics-mock';
import LiveChat from '../../components/live-chat/live-chat.jsx';
import CarrierDashboardFooter from '../../components/footer/carrier-dashboard-footer.jsx';

// Import styles - EXPLICITLY import tokens to ensure CSS variables are available
import '../../styles/tokens.css';
import './analytics.css';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('1m');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [showAllLanes, setShowAllLanes] = useState(false);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuOpen && !event.target.closest('.export-dropdown')) {
        setExportMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [exportMenuOpen]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showAllLanes) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAllLanes]);

  // Handle ESC key for modal
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showAllLanes) {
        setShowAllLanes(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAllLanes]);

  // Get current data based on selected range
  const currentData = analyticsMock.overview[timeRange] || {
    earnings: 0,
    loads: 0,
    miles: 0,
    avgRatePerMile: '0.00',
    trends: {}
  };
  
  // Get the appropriate series data
  const chartData = useMemo(() => {
    const series = analyticsMock.series[timeRange];
    
    if (!series) return [];
    
    // Handle different data structures based on time range
    if (timeRange === 'week') {
      return series.dailyEarnings || series.daily || [];
    } else if (timeRange === '1m') {
      // For 1M, prefer weekly data, fallback to daily if weekly doesn't exist
      return series.weeklyEarnings || series.weekly || series.dailyEarnings || series.daily || [];
    } else {
      // For 3M, 6M, 1Y use monthly data
      return series.monthlyEarnings || series.monthly || [];
    }
  }, [timeRange]);

  // Get top lanes for current range
  const topLanes = analyticsMock.topLanes[timeRange] || [];
  
  // Get all lanes for modal
  const allLanes = analyticsMock.allLanesByRange[timeRange] || [];

  // Format trend value with arrow
  const formatTrend = (value) => {
    if (!value || value === 0) return null;
    const arrow = value > 0 ? '▲' : '▼';
    return `${arrow} ${Math.abs(value)}%`;
  };

  // Get trend class
  const getTrendClass = (value) => {
    if (!value || value === 0) return '';
    return value > 0 ? 'positive' : 'negative';
  };

  // Format currency for tooltip
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate percentage change for tooltip
  const calculatePercentChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(1);
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label, data }) => {
    if (active && payload && payload[0] && data) {
      const currentIndex = data.findIndex(item => {
        const key = timeRange === 'week' ? 'day' : timeRange === '1m' ? 'week' : 'month';
        return item[key] === label;
      });
      const previousValue = currentIndex > 0 ? data[currentIndex - 1].amount : null;
      const percentChange = previousValue ? calculatePercentChange(payload[0].value, previousValue) : null;
      
      return (
        <div className="chart-tooltip">
          <p className="tooltip-label">{label}</p>
          <p className="tooltip-value">{formatCurrency(payload[0].value)}</p>
          {percentChange && (
            <p className="tooltip-change">
              vs prior: {percentChange > 0 ? '+' : ''}{percentChange}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Handle export with proper error handling
  const handleExport = (type) => {
    try {
      if (type === 'csv') {
        const headers = 'Period,Earnings,Loads,Miles,Rate Per Mile\n';
        const data = `${timeRange},${currentData.earnings || 0},${currentData.loads || 0},${currentData.miles || 0},${currentData.avgRatePerMile || '0.00'}`;
        const csvContent = headers + data;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `analytics-${timeRange}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else if (type === 'pdf') {
        // Placeholder for PDF export - could integrate with jsPDF or similar
        alert(`PDF export functionality would be implemented here for ${timeRange} data`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
    setExportMenuOpen(false);
  };

  // Get region for a lane with fallback
  const getRegion = (laneName) => {
    if (!laneName) return 'National';
    const name = laneName.toLowerCase();
    if (name.includes('los angeles') || name.includes('seattle') || name.includes('phoenix')) return 'West';
    if (name.includes('dallas') || name.includes('houston') || name.includes('atlanta') || name.includes('miami')) return 'South';
    if (name.includes('new york') || name.includes('boston')) return 'Northeast';
    if (name.includes('chicago') || name.includes('detroit')) return 'Midwest';
    return 'National';
  };

  // Get chart axis key based on data structure
  const getChartAxisKey = () => {
    if (chartData.length === 0) return 'day';
    
    const firstItem = chartData[0];
    // Check what keys exist in the data and use the appropriate one
    if (firstItem.day !== undefined) return 'day';
    if (firstItem.week !== undefined) return 'week';
    if (firstItem.month !== undefined) return 'month';
    if (firstItem.date !== undefined) return 'date';
    
    // Fallback based on time range
    if (timeRange === 'week') return 'day';
    if (timeRange === '1m') return 'week';
    return 'month';
  };

  // Icons for KPI cards
  const icons = {
    earnings: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    loads: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6M9 15h6" />
      </svg>
    ),
    miles: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    rate: <Car size={20} strokeWidth={2} aria-hidden="true" />
  };

  // Render trend icon
  const TrendIcon = ({ value }) => {
    if (!value || value === 0) return null;
    return value > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />;
  };

  return (
    <>
      <div className="analytics-page">
        <div className="analytics-container">
          
          {/* Header Section */}
          <div className="analytics-header">
            <div className="header-content">
              <h1>Analytics & Reports</h1>
              <p className="subtitle">Performance overview for your selected period</p>
            </div>
            <div className="time-range-wrapper">
              <label className="time-range-label" htmlFor="time-range">Time Range</label>
              <div className="time-range-selector" role="tablist" aria-label="Time range selection">
                {['week', '1m', '3m', '6m', '1y'].map((range) => (
                  <button 
                    key={range}
                    className={timeRange === range ? 'active' : ''}
                    onClick={() => setTimeRange(range)}
                    role="tab"
                    aria-selected={timeRange === range}
                    aria-controls="analytics-content"
                  >
                    {range === 'week' ? 'Week' : range === '1m' ? '1M' : range.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div id="analytics-content" role="tabpanel" aria-labelledby="time-range">
            
            {/* Metrics Grid */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon" aria-hidden="true">{icons.earnings}</div>
                <div className="metric-content">
                  <div className="metric-label">Total Earnings</div>
                  <div className="metric-value">${(currentData.earnings || 0).toLocaleString()}</div>
                  <div className="metric-sublabel">vs previous period</div>
                  {currentData.trends?.earnings && (
                    <div className={`metric-trend ${getTrendClass(currentData.trends.earnings)}`}>
                      <TrendIcon value={currentData.trends.earnings} />
                      {formatTrend(currentData.trends.earnings)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon" aria-hidden="true">{icons.loads}</div>
                <div className="metric-content">
                  <div className="metric-label">Completed Loads</div>
                  <div className="metric-value">{(currentData.loads || 0).toLocaleString()}</div>
                  <div className="metric-sublabel">vs previous period</div>
                  {currentData.trends?.loads && (
                    <div className={`metric-trend ${getTrendClass(currentData.trends.loads)}`}>
                      <TrendIcon value={currentData.trends.loads} />
                      {formatTrend(currentData.trends.loads)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon" aria-hidden="true">{icons.miles}</div>
                <div className="metric-content">
                  <div className="metric-label">Total Miles</div>
                  <div className="metric-value">{(currentData.miles || 0).toLocaleString()}</div>
                  <div className="metric-sublabel">vs previous period</div>
                  {currentData.trends?.miles && (
                    <div className={`metric-trend ${getTrendClass(currentData.trends.miles)}`}>
                      <TrendIcon value={currentData.trends.miles} />
                      {formatTrend(currentData.trends.miles)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="metric-card">
                <div className="metric-icon" aria-hidden="true">{icons.rate}</div>
                <div className="metric-content">
                  <div className="metric-label">Avg Rate/Mile</div>
                  <div className="metric-value">${currentData.avgRatePerMile || '0.00'}</div>
                  <div className="metric-sublabel">vs previous period</div>
                  {currentData.trends?.avgRatePerMile && (
                    <div className={`metric-trend ${getTrendClass(currentData.trends.avgRatePerMile)}`}>
                      <TrendIcon value={currentData.trends.avgRatePerMile} />
                      {formatTrend(currentData.trends.avgRatePerMile)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chart Section */}
            <div className="chart-section">
              <div className="chart-container">
                <div className="chart-header">
                  <h2>Earnings Trend</h2>
                  <div className="chart-legend">
                    <span className="legend-item">
                      <span className="legend-dot" aria-hidden="true"></span>
                      Earnings
                    </span>
                    <span className="average-note">Average baseline: $8,450</span>
                  </div>
                </div>
                
                {chartData.length > 0 ? (
                  <div className="chart-responsive-wrapper">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart 
                        data={chartData}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <XAxis 
                          dataKey={getChartAxisKey()}
                          stroke="transparent"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis 
                          stroke="transparent"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip 
                          content={(props) => <CustomTooltip {...props} data={chartData} />}
                          cursor={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="amount"
                          stroke="#0066CC"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#FFFFFF', stroke: '#0066CC', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#FFFFFF', stroke: '#0066CC', strokeWidth: 2.5 }}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="no-data-message">
                    <p>No earnings data available for the selected period</p>
                  </div>
                )}
              </div>
            </div>

            {/* Top Lanes Section */}
            <div className="top-lanes">
              <h2>Top Performing Lanes</h2>
              {topLanes.length > 0 ? (
                <>
                  <div className="lanes-table">
                    <div className="lanes-header">
                      <div>Lane</div>
                      <div>Loads</div>
                      <div>Revenue</div>
                    </div>
                    {topLanes.slice(0, 5).map((lane, index) => (
                      <div key={`${lane.lane}-${index}`} className="lane-row">
                        <div className="lane-name-wrapper">
                          <span className={`region-badge region-${getRegion(lane.lane).toLowerCase()}`}>
                            {getRegion(lane.lane)}
                          </span>
                          <span className="lane-name">{lane.lane}</span>
                        </div>
                        <div className="lane-count">{lane.count || 0}</div>
                        <div className="lane-revenue-wrapper">
                          <span className="lane-revenue">${(lane.revenue || 0).toLocaleString()}</span>
                          {lane.trend && (
                            <span className={`lane-trend ${getTrendClass(lane.trend)}`}>
                              <TrendIcon value={lane.trend} />
                              {formatTrend(lane.trend)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {allLanes.length > 5 && (
                    <button 
                      className="view-all-link" 
                      onClick={() => setShowAllLanes(true)}
                      aria-describedby="view-all-description"
                    >
                      View all lanes →
                    </button>
                  )}
                  <div id="view-all-description" className="sr-only">
                    Opens a modal with complete lane performance data
                  </div>
                </>
              ) : (
                <div className="no-data-message">
                  <p>No lane data available for the selected period</p>
                </div>
              )}
            </div>

            {/* Export Section */}
            <div className="export-section">
              <div className="export-dropdown">
                <button 
                  className="export-btn"
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  aria-expanded={exportMenuOpen}
                  aria-haspopup="menu"
                >
                  <Download size={16} aria-hidden="true" />
                  Export
                  <svg className="export-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {exportMenuOpen && (
                  <div className="export-menu" role="menu">
                    <button 
                      onClick={() => handleExport('pdf')}
                      role="menuitem"
                    >
                      <FileText size={16} aria-hidden="true" />
                      PDF report
                    </button>
                    <button 
                      onClick={() => handleExport('csv')}
                      role="menuitem"
                    >
                      <Download size={16} aria-hidden="true" />
                      CSV data
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* All Lanes Modal */}
          {showAllLanes && (
            <div 
              className="modal-overlay" 
              onClick={() => setShowAllLanes(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
            >
              <div className="modal-content lanes-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 id="modal-title">All Lanes - {timeRange.toUpperCase()}</h2>
                  <button 
                    className="modal-close" 
                    onClick={() => setShowAllLanes(false)}
                    aria-label="Close modal"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
                <div className="modal-body">
                  {allLanes.length > 0 ? (
                    <div className="all-lanes-table">
                      <div className="all-lanes-header">
                        <div>Region</div>
                        <div>Lane</div>
                        <div>Loads</div>
                        <div>Revenue</div>
                        <div>Change</div>
                      </div>
                      {allLanes.map((lane, index) => (
                        <div key={`${lane.lane}-${index}`} className="all-lane-row">
                          <div>
                            <span className={`region-badge region-${(lane.region || 'national').toLowerCase()}`}>
                              {lane.region || 'National'}
                            </span>
                          </div>
                          <div className="lane-name">{lane.lane}</div>
                          <div className="lane-loads">{lane.loads || 0}</div>
                          <div className="lane-revenue">${(lane.revenue || 0).toLocaleString()}</div>
                          <div className={`lane-change ${getTrendClass(lane.changePct)}`}>
                            <TrendIcon value={lane.changePct} />
                            {formatTrend(lane.changePct) || '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-data-message">
                      <p>No lane data available for this period</p>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button 
                    className="modal-button secondary" 
                    onClick={() => setShowAllLanes(false)}
                  >
                    Close
                  </button>
                  <button 
                    className="modal-button primary" 
                    onClick={() => handleExport('csv')}
                  >
                    <Download size={16} aria-hidden="true" />
                    Export Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        <LiveChat />
      </div>
      <CarrierDashboardFooter />
    </>
  );
};

export default Analytics;