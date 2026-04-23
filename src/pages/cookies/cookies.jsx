import React from 'react';
import PublicHeader from '../../components/header/public/publicheader.jsx';
import Footer from '../../components/footer/footer.jsx';
import LiveChat from '../../components/live-chat/live-chat.jsx';
import './cookies.css';

const Cookies = () => {
  return (
    <div className="cookies-page">
      <PublicHeader />
      
      <div className="cookies-container">
        <div className="cookies-content">
          <h1>Cookie Policy</h1>
          <p className="intro-text">This Cookie Policy explains how Guga uses cookies and similar technologies to improve your experience on our platform.</p>
          
          <section className="cookies-section">
            <h2>What Are Cookies?</h2>
            <p>
              Cookies are small text files that are stored on your device when you visit our website. They help us provide you with a better browsing experience by remembering your preferences and improving our platform's functionality.
            </p>
          </section>

          <section className="cookies-section">
            <h2>Why We Use Cookies</h2>
            <p>
              We use cookies to enhance your experience on our platform by:
            </p>
            <ul>
              <li>Keeping you logged in during your session</li>
              <li>Remembering your preferences and settings</li>
              <li>Analyzing how our platform is used to improve performance</li>
              <li>Providing personalized content and recommendations</li>
              <li>Ensuring security and preventing fraud</li>
            </ul>
          </section>

          <section className="cookies-section">
            <h2>Types of Cookies We Use</h2>
            
            <h3>Essential Cookies</h3>
            <p>
              These cookies are necessary for our platform to function properly. They enable core features like user authentication, security, and basic navigation. These cannot be disabled without affecting the platform's functionality.
            </p>
            
            <h3>Analytics Cookies</h3>
            <p>
              We use analytics cookies to understand how visitors interact with our platform. This helps us identify areas for improvement and measure the effectiveness of our features. These cookies collect anonymous information about your usage patterns.
            </p>
            
            <h3>Functionality Cookies</h3>
            <p>
              These cookies remember your preferences and choices to provide a more personalized experience. Examples include language settings, saved searches, and display preferences.
            </p>
            
            <h3>Marketing Cookies</h3>
            <p>
              We may use marketing cookies to show you relevant advertisements and measure their effectiveness. These cookies help us understand your interests and provide more targeted content.
            </p>
          </section>

          <section className="cookies-section">
            <h2>Managing Your Cookie Preferences</h2>
            <p>
              You have control over the cookies we use:
            </p>
            <ul>
              <li><strong>Browser Settings:</strong> Most web browsers allow you to control cookies through their settings. You can choose to accept, reject, or delete cookies.</li>
              <li><strong>Opt-Out:</strong> You can opt out of non-essential cookies through our cookie preference center (available on first visit).</li>
              <li><strong>Third-Party Tools:</strong> Some third-party services provide opt-out tools for their tracking cookies.</li>
            </ul>
          </section>

          <section className="cookies-section">
            <h2>Browser Instructions</h2>
            <p>
              To manage cookies in your browser:
            </p>
            <ul>
              <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
              <li><strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
            </ul>
            <p>
              Note that disabling certain cookies may affect your experience on our platform.
            </p>
          </section>

          <section className="cookies-section">
            <h2>Third-Party Cookies</h2>
            <p>
              Our platform may include content from third-party services (such as payment processors, analytics providers, and customer support tools) that may set their own cookies. These third parties have their own privacy policies and cookie practices.
            </p>
            <p>
              We do not control third-party cookies and encourage you to review their respective privacy and cookie policies. For more information, see our Privacy Policy.
            </p>
          </section>

          <section className="cookies-section">
            <h2>Updates to This Policy</h2>
            <p>
              We may update this Cookie Policy periodically to reflect changes in our practices or legal requirements. We will notify you of significant changes through our platform or via email.
            </p>
          </section>

          <section className="cookies-section">
            <h2>Contact Us</h2>
            <p>
              If you have questions about our use of cookies or this policy, please contact us:
            </p>
            <ul>
              <li>Email: privacy@guga.com</li>
              <li>Phone: 1-800-GUGA-HELP</li>
            </ul>
          </section>
        </div>
      </div>

      <Footer />
      <LiveChat />
    </div>
  );
};

export default Cookies;