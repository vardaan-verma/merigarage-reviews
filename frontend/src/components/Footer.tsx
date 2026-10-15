import React from 'react';
import { Link } from 'react-router-dom';
import merigarageLogo from '../assets/merigarage-logo.png';
import merigarageWordmark from '../assets/merigarage-wordmark.png';

export const Footer: React.FC = () => {
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
              alt="Meri Garage"
              className="footer-brand-wordmark"
              height="24"
            />
            <span className="brand-tag">Reviews</span>
          </Link>
          <p className="footer-desc">
            India's dedicated independent garage discovery and verified review platform.
            Find reliable mechanics, compare transparent customer ratings, and make confident automotive service choices.
          </p>
        </div>

        {/* Platform Column */}
        <div className="footer-links-col">
          <h4 className="footer-heading">Platform</h4>
          <ul className="footer-links">
            <li><Link to="/garages">Find Garages</Link></li>
            <li><Link to="/services">Service Catalogue</Link></li>
            <li><Link to="/submit-garage">List a Garage</Link></li>
            <li><Link to="/garages?verified=true">Verified Network</Link></li>
          </ul>
        </div>

        {/* Account Column */}
        <div className="footer-links-col">
          <h4 className="footer-heading">Account & Hub</h4>
          <ul className="footer-links">
            <li><Link to="/login">Sign In</Link></li>
            <li><Link to="/register">Create Account</Link></li>
            <li><Link to="/profile">Profile Settings</Link></li>
            <li><Link to="/my-claims">Claim Status</Link></li>
          </ul>
        </div>

        {/* Trust & Guarantee Column */}
        <div className="footer-links-col">
          <h4 className="footer-heading">Trust & Security</h4>
          <p className="footer-subtext">
            Every verified badge represents audited trade registrations, verified physical locations, and spam-free moderated reviews.
          </p>
          <div className="trust-badge">
            <span className="badge badge-verified">✓ 100% Verified Garage Network</span>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} MeriGarage Reviews. All rights reserved.</p>
        <p className="footer-note">Built with Spring Boot & React • High-Performance Automotive Engine</p>
      </div>
    </footer>
  );
};
