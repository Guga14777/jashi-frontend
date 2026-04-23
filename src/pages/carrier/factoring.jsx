import React from 'react';
import CarrierHeader from '../../components/header/carrier/carrierheader';
import CarrierDashboardFooter from '../../components/footer/carrier-dashboard-footer';
import LiveChat from '../../components/live-chat/live-chat';
import './factoring.css';

export default function Factoring() {
  return (
    <div className="page-shell factoring">
      <CarrierHeader />
      <main className="page-main">
        <header className="page-header">
          <h1>Factoring Partners</h1>
          <p>Approved partners for accelerated cash flow.</p>
        </header>

        <section className="card">
          <h2>Preferred Partners</h2>
          <div className="table">
            <div className="row head"><span>Name</span><span>Contact</span><span>Notes</span></div>
            <div className="row"><span>Acme Factoring</span><span>support@acme.com</span><span>Non-recourse options</span></div>
            <div className="row"><span>Swift Finance</span><span>hello@swift.com</span><span>Same-day funding</span></div>
          </div>
        </section>
      </main>
      <CarrierDashboardFooter />
      <LiveChat />
    </div>
  );
}
