import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import merigarageLogo from '../assets/merigarage-logo.png';
import merigarageWordmark from '../assets/merigarage-wordmark.png';

export const Footer: React.FC = () => {
  // Mobile accordion state for columns (matching Phone 04 reference)
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer-container">
        {/* Brand Column using official brand assets */}
        <div className="footer-brand-col">
          <Link to="/" className="footer-brand">
            <img
              src={merigarageLogo}
              alt="MeriGarage Emblem"
              className="footer-brand-logo"
              width="36"
              height="36"
            />
            <img
              src={merigarageWordmark}
              alt="MeriGarage"
              className="footer-brand-wordmark"
              height="24"
            />
          </Link>
          <p className="footer-desc">
            India's dedicated independent garage discovery and verified review platform.
            Find reliable mechanics, compare transparent customer ratings, and make confident automotive service choices.
          </p>
        </div>

        {/* Platform Column */}
        <div className={`footer-links-col ${openSection === 'platform' ? 'is-mobile-open' : ''}`}>
          <button
            type="button"
            className="footer-heading-btn"
            onClick={() => toggleSection('platform')}
            aria-expanded={openSection === 'platform'}
          >
            <span className="footer-heading">Platform</span>
            <span className="footer-accordion-chevron material-symbols-outlined">
              {openSection === 'platform' ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <ul className="footer-links">
            <li><Link to="/garages">Find Garages</Link></li>
            <li><Link to="/services">Service Catalogue</Link></li>
            <li><Link to="/submit-garage">List a Garage</Link></li>
            <li>
              <a
                href="https://www.merigarage.com/software/"
                target="_blank"
                rel="noopener noreferrer"
                title="Get Meri Garage Management Service"
              >
                Get GMS
              </a>
            </li>
          </ul>
        </div>

        {/* Account Column */}
        <div className={`footer-links-col ${openSection === 'account' ? 'is-mobile-open' : ''}`}>
          <button
            type="button"
            className="footer-heading-btn"
            onClick={() => toggleSection('account')}
            aria-expanded={openSection === 'account'}
          >
            <span className="footer-heading">Account & Hub</span>
            <span className="footer-accordion-chevron material-symbols-outlined">
              {openSection === 'account' ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <ul className="footer-links">
            <li><Link to="/login">Sign In</Link></li>
            <li><Link to="/register">Create Account</Link></li>
            <li><Link to="/profile">Profile Settings</Link></li>
            <li><Link to="/my-claims">Claim Status</Link></li>
          </ul>
        </div>

        {/* Trust & Guarantee Column */}
        <div className={`footer-links-col ${openSection === 'trust' ? 'is-mobile-open' : ''}`}>
          <button
            type="button"
            className="footer-heading-btn"
            onClick={() => toggleSection('trust')}
            aria-expanded={openSection === 'trust'}
          >
            <span className="footer-heading">Trust & Security</span>
            <span className="footer-accordion-chevron material-symbols-outlined">
              {openSection === 'trust' ? 'expand_less' : 'expand_more'}
            </span>
          </button>
          <div className="footer-col-body">
            <p className="footer-subtext">
              Every verified badge represents audited trade registrations, verified physical locations, and spam-free moderated reviews.
            </p>
            <div className="trust-badge">
              <span className="badge badge-verified">✓ 100% Verified Garage Network</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} MeriGarage. All rights reserved.</p>
        <p className="footer-note">Built with Spring Boot & React • High-Performance Automotive Engine</p>
      </div>
    </footer>
  );
};

