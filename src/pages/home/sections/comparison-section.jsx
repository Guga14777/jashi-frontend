// src/pages/home/sections/comparison-section.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './comparison-section.css';

function ComparisonSection() {
  // Calculation for 344 miles sedan:
  // Base shipping: $774.80
  // Market average (base × 1.08): $836.97
  // Customer service fee (6%): $50.22
  // Customer paid: $887.19
  // Carrier fee (12.5% of base): $96.85
  // Carrier gets: $677.95
  // Carrier per mile: $1.97
  // Customer fee %: 5.66%
  
  const tableData = {
    headers: [
      'Model',
      'Route',
      'Miles',
      'Customer Paid',
      'Shipping Price (Quote)',
      'Service Fee (Customer)',
      'Carrier Fee %',
      'Carrier Fee ($)',
      'Carrier Gets (After Fee)',
      'Carrier Gets Per Mile ($)',
      'Customer Fee %'
    ],
    row: {
      model: 'mercedes amg cla 45 2025',
      route: 'NY (10001) → VA (23220)',
      miles: '344',
      customerPaid: '887.19',
      shippingPrice: '836.97',
      serviceFee: '50.22',
      carrierFeePercent: '12.5',
      carrierFeeDollar: '96.85',
      carrierGets: '677.95',
      carrierPerMile: '1.97',
      customerFeePercent: '5.66'
    }
  };

  return (
    <section className="comparison section">
      <div className="container">
        <h2 className="comparison-title h2">Transparent Pricing & Carrier Payouts</h2>
        <p className="comparison-intro">
          Every quote breaks down your cost and the carrier's payout—so you see exactly where your money goes.
        </p>

        <div className="table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                {tableData.headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="model-cell">{tableData.row.model}</td>
                <td>{tableData.row.route}</td>
                <td className="number-cell">{tableData.row.miles}</td>
                <td className="currency-cell">${tableData.row.customerPaid}</td>
                <td className="currency-cell">${tableData.row.shippingPrice}</td>
                <td className="currency-cell">${tableData.row.serviceFee}</td>
                <td className="number-cell">{tableData.row.carrierFeePercent}%</td>
                <td className="currency-cell">${tableData.row.carrierFeeDollar}</td>
                <td className="currency-cell">${tableData.row.carrierGets}</td>
                <td className="currency-cell">${tableData.row.carrierPerMile}</td>
                <td className="number-cell">{tableData.row.customerFeePercent}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="table-footnote">
          * Example for illustration. Live quotes will reflect Jashi Logistics' current 6% service fee.
        </p>

        <div className="comparison-cta">
          <Link to="/quote" className="btn btn-primary">
            Create My Offer
          </Link>
        </div>
      </div>
    </section>
  );
}

export default ComparisonSection;