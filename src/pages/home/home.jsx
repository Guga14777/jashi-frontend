// src/pages/home/home.jsx
import React from 'react';

// Public header
import PublicHeader from '../../components/header/public/publicheader';

import Hero from './sections/hero';
import QuoteSection from './sections/quote-section';
import Features from './sections/features';
import Footer from '../../components/footer/footer';
import LiveChat from '../../components/live-chat/live-chat';

import './home.css';

const Home = () => {
  return (
    <div className="home-page">
      {/* Public header */}
      <PublicHeader />

      <main className="home-main-content">
        <div className="hero-wrapper">
          <Hero />
        </div>

        <div className="quote-wrapper">
          <QuoteSection />
        </div>

        <div className="features-wrapper">
          <Features />
        </div>
      </main>

      <Footer />
      <LiveChat />
    </div>
  );
};

export default Home;