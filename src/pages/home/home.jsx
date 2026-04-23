// src/pages/home/home.jsx
import React from 'react';

import useIsMobile from '../../hooks/use-is-mobile';

import PublicHeader from '../../components/header/public/publicheader';
import Hero from './sections/hero';
import QuoteSection from './sections/quote-section';
import Features from './sections/features';
import Footer from '../../components/footer/footer';
import LiveChat from '../../components/live-chat/live-chat';

import MobileHome from './mobile-home';

import './home.css';

const Home = () => {
  const isMobile = useIsMobile();

  // Mobile gets a completely different layout tree — not a shrunk desktop.
  if (isMobile) return <MobileHome />;

  // Desktop / tablet (>768px): keep the existing marketing layout.
  return (
    <div className="home-page">
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
