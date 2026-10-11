import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer-container">
        <div className="footer-brand-col">
          <div className="footer-brand">
            <span className="brand-dot"></span>
            MeriGarage
            <span className="brand-tag">Reviews</span>
          </div>
          <p className="footer-desc">
            India's dedicated independent garage discovery and verified review platform. 
            Find trusted mechanics, compare transparent reviews, and make confident automotive service choices.
          </p>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-heading">Platform</h4>
          <ul className="footer-links">
            <li><Link to="/garages">Find Garages</Link></li>
            <li><Link to="/services">Service Catalogue</Link></li>
            <li><Link to="/submit-garage">List a Garage</Link></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-heading">Account & Legal</h4>
          <ul className="footer-links">
            <li><Link to="/login">Sign In</Link></li>
            <li><Link to="/register">Register</Link></li>
            <li><Link to="/profile">My Profile</Link></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <h4 className="footer-heading">Trust & Security</h4>
          <p className="footer-subtext">
            Strict verification, owner identity auditing, and spam-free moderated automotive reviews.
          </p>
          <div className="trust-badge">
            <span className="badge badge-verified">✓ 100% Verified Garage Network</span>
          </div>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} MeriGarage Reviews. All rights reserved.</p>
        <p className="footer-note">Built with Spring Boot 4 & React</p>
      </div>
    </footer>
  );
};
