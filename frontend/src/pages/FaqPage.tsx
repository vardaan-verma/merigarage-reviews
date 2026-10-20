import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FAQ_DATA, FAQ_CATEGORIES, type FaqCategory } from '../data/faqData';
import garageFaqIllustration from '../assets/garage-faq-illustration.png';

export const FaqPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<FaqCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['faq-1'])); // First item expanded by default

  // Dynamic counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      All: FAQ_DATA.length,
    };
    FAQ_CATEGORIES.forEach((cat) => {
      counts[cat] = FAQ_DATA.filter((item) => item.category === cat).length;
    });
    return counts;
  }, []);

  // Filtered FAQ list based on active category and search query
  const filteredFaqs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || item.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!query) return true;

      const matchesQuestion = item.question.toLowerCase().includes(query);
      const matchesAnswer = item.answer.toLowerCase().includes(query);
      const matchesBadge = item.badgeText.toLowerCase().includes(query);
      const matchesCatName = item.category.toLowerCase().includes(query);
      const matchesKeyPoints = item.keyPoints?.some(
        (kp) =>
          kp.title.toLowerCase().includes(query) ||
          kp.desc.toLowerCase().includes(query)
      );

      return (
        matchesQuestion ||
        matchesAnswer ||
        matchesBadge ||
        matchesCatName ||
        Boolean(matchesKeyPoints)
      );
    });
  }, [selectedCategory, searchQuery]);

  const toggleItem = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(filteredFaqs.map((f) => f.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
  };

  return (
    <div className="faq-page">
      {/* =========================================================================
          HERO SECTION: 2-COLUMN DESKTOP / STACKED MOBILE
          ========================================================================= */}
      <section className="faq-hero-section" aria-labelledby="faq-page-heading">
        <div className="container">
          <div className="faq-hero-grid">
            {/* Left Column: Heading, Intro, Search, Filters */}
            <div className="faq-hero-content">
              {/* Eyebrow badge */}
              <div className="faq-eyebrow-wrapper">
                <span className="faq-eyebrow-dot" aria-hidden="true" />
                <span className="faq-eyebrow-text">Help Centre &amp; Guides</span>
              </div>

              {/* Main Headline */}
              <h1 id="faq-page-heading" className="faq-hero-heading">
                Garage FAQs <span className="faq-hero-heading-highlight">&amp; Guides</span>
              </h1>

              {/* Introduction */}
              <p className="faq-hero-intro">
                Everything vehicle owners, drivers, and workshop proprietors need to navigate
                MeriGarage. Search answers, compare verified ratings, or learn how to claim your
                workshop.
              </p>

              {/* Live Search Field */}
              <div className="faq-search-wrapper" role="search">
                <div className="faq-search-input-group">
                  <span className="material-symbols-outlined faq-search-icon" aria-hidden="true">
                    search
                  </span>
                  <input
                    type="search"
                    id="faq-search-input"
                    className="faq-search-input"
                    placeholder="Search questions, answers, topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search frequently asked questions"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="faq-search-clear-btn"
                      onClick={handleClearSearch}
                      aria-label="Clear search query"
                      title="Clear search"
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">
                        close
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div
                className="faq-category-pills"
                role="tablist"
                aria-label="Filter FAQs by Category"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedCategory === 'All'}
                  className={`faq-category-pill ${selectedCategory === 'All' ? 'is-active' : ''}`}
                  onClick={() => setSelectedCategory('All')}
                >
                  All Questions
                  <span className="faq-pill-count">({categoryCounts['All']})</span>
                </button>

                {FAQ_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={selectedCategory === cat}
                    className={`faq-category-pill ${selectedCategory === cat ? 'is-active' : ''}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                    <span className="faq-pill-count">({categoryCounts[cat] || 0})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Hero Artwork with Transparent Background */}
            <div className="faq-hero-media">
              <div className="faq-artwork-wrapper">
                <img
                  src={garageFaqIllustration}
                  alt="MeriGarage automotive technicians examining spark plug and tools around a large question mark"
                  className="faq-hero-illustration"
                  width="580"
                  height="519"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          FAQ ACCORDION SECTION
          ========================================================================= */}
      <section className="faq-accordion-section" aria-label="Frequently Asked Questions List">
        <div className="container">
          {/* Header Controls: Result Count & Expand/Collapse All */}
          <div className="faq-controls-bar">
            <div className="faq-results-counter">
              <span className="faq-count-number">{filteredFaqs.length}</span>
              <span className="faq-count-label">
                {filteredFaqs.length === 1 ? 'question found' : 'questions found'}
                {selectedCategory !== 'All' && (
                  <span className="faq-filter-tag"> in &ldquo;{selectedCategory}&rdquo;</span>
                )}
                {searchQuery.trim() && (
                  <span className="faq-filter-tag"> matching &ldquo;{searchQuery.trim()}&rdquo;</span>
                )}
              </span>
            </div>

            {filteredFaqs.length > 0 && (
              <div className="faq-bulk-actions">
                <button
                  type="button"
                  className="faq-bulk-btn"
                  onClick={expandAll}
                  aria-label="Expand all visible questions"
                >
                  Expand All
                </button>
                <span className="faq-bulk-separator" aria-hidden="true">•</span>
                <button
                  type="button"
                  className="faq-bulk-btn"
                  onClick={collapseAll}
                  aria-label="Collapse all visible questions"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>

          {/* Empty Search State */}
          {filteredFaqs.length === 0 ? (
            <div className="faq-empty-state card" role="alert">
              <div className="faq-empty-icon-wrap" aria-hidden="true">
                <span className="material-symbols-outlined text-4xl">search_off</span>
              </div>
              <h2 className="faq-empty-title">No Matching Questions Found</h2>
              <p className="faq-empty-desc">
                {searchQuery.trim()
                  ? `We couldn't find any questions matching "${searchQuery.trim()}". Try different keywords or reset your filters.`
                  : 'There are currently no questions available in this category.'}
              </p>
              <div className="faq-empty-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleResetFilters}
                >
                  Reset Filters &amp; Search
                </button>
                <Link to="/garages" className="btn btn-secondary btn-sm">
                  Explore All Garages
                </Link>
              </div>
            </div>
          ) : (
            /* Interactive Accordion Stream */
            <div className="faq-accordion-list" role="region" aria-label="Accordion Questions">
              {filteredFaqs.map((item, index) => {
                const isExpanded = expandedIds.has(item.id);
                const sequentialIndex = (index + 1).toString().padStart(2, '0');

                return (
                  <article
                    key={item.id}
                    className={`faq-accordion-item ${isExpanded ? 'is-expanded' : ''}`}
                  >
                    {/* Accordion Header Button */}
                    <button
                      type="button"
                      id={`faq-header-${item.id}`}
                      className="faq-accordion-header"
                      onClick={() => toggleItem(item.id)}
                      aria-expanded={isExpanded}
                      aria-controls={`faq-answer-${item.id}`}
                    >
                      <div className="faq-header-main">
                        <span className="faq-sequence-num" aria-hidden="true">
                          {sequentialIndex}/
                        </span>
                        <div className="faq-header-text">
                          <h2 className="faq-question-title">{item.question}</h2>
                          <div className="faq-header-meta">
                            <span className="faq-badge-category">{item.badgeText}</span>
                            <span className="faq-meta-dot" aria-hidden="true">•</span>
                            <span className="faq-category-tag">{item.category}</span>
                          </div>
                        </div>
                      </div>

                      {/* Expand / Collapse Icon Housing */}
                      <div className="faq-toggle-housing" aria-hidden="true">
                        <span className={`faq-toggle-glyph ${isExpanded ? 'is-rotated' : ''}`}>
                          +
                        </span>
                      </div>
                    </button>

                    {/* Accordion Answer Container */}
                    <div
                      id={`faq-answer-${item.id}`}
                      role="region"
                      aria-labelledby={`faq-header-${item.id}`}
                      className={`faq-accordion-body ${isExpanded ? 'is-visible' : 'is-hidden'}`}
                    >
                      <div className="faq-answer-inner">
                        <p className="faq-answer-text">{item.answer}</p>

                        {/* Optional Key Feature Cards */}
                        {item.keyPoints && item.keyPoints.length > 0 && (
                          <div className="faq-keypoints-grid">
                            {item.keyPoints.map((point) => (
                              <div key={point.title} className="faq-keypoint-card">
                                <div className="faq-keypoint-head">
                                  <span className="material-symbols-outlined faq-keypoint-icon" aria-hidden="true">
                                    {point.icon}
                                  </span>
                                  <strong className="faq-keypoint-title">{point.title}</strong>
                                </div>
                                <p className="faq-keypoint-desc">{point.desc}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Route Action Link */}
                        {item.actionLink && (
                          <div className="faq-action-row">
                            {item.actionLink.isExternal ? (
                              <a
                                href={item.actionLink.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="faq-action-link"
                              >
                                <span>{item.actionLink.label}</span>
                                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                                  arrow_forward
                                </span>
                              </a>
                            ) : (
                              <Link to={item.actionLink.url} className="faq-action-link">
                                <span>{item.actionLink.label}</span>
                                <span className="material-symbols-outlined text-sm" aria-hidden="true">
                                  arrow_forward
                                </span>
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          BOTTOM HELP SECTION ("Still need help?")
          ========================================================================= */}
      <section className="faq-help-section" aria-labelledby="faq-help-heading">
        <div className="container">
          <div className="faq-help-card card">
            <div className="faq-help-glow" aria-hidden="true" />
            <div className="faq-help-content">
              <div className="faq-help-badge">
                <span className="material-symbols-outlined text-base" aria-hidden="true">
                  support_agent
                </span>
                <span>Dedicated Assistance</span>
              </div>
              <h2 id="faq-help-heading" className="faq-help-title">
                Still need help?
              </h2>
              <p className="faq-help-desc">
                Couldn&rsquo;t find the answer you were looking for? Explore our comprehensive verified
                workshop directory, compare ratings, or list your workshop to get started.
              </p>
              <div className="faq-help-actions">
                <Link to="/garages" className="btn btn-primary">
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    explore
                  </span>
                  Explore Garages
                </Link>
                <Link to="/submit-garage" className="btn btn-secondary">
                  <span className="material-symbols-outlined text-base" aria-hidden="true">
                    add_business
                  </span>
                  List a Workshop
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
