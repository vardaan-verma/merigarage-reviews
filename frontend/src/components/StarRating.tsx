import React from 'react';

interface StarRatingProps {
  rating: number; // e.g. 4.5 or 5
  maxStars?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  reviewCount?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  interactive = false,
  onChange,
  size = 'md',
  showNumber = false,
  reviewCount,
}) => {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  const handleClick = (starIndex: number) => {
    if (interactive && onChange) {
      onChange(starIndex);
    }
  };

  const handleMouseEnter = (starIndex: number) => {
    if (interactive) {
      setHoverRating(starIndex);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(null);
    }
  };

  const sizeClass = size === 'sm' ? 'star-sm' : size === 'lg' ? 'star-lg' : 'star-md';

  return (
    <div className={`star-rating-container ${sizeClass}`}>
      <div className="stars-wrapper" onMouseLeave={handleMouseLeave}>
        {Array.from({ length: maxStars }, (_, i) => {
          const starValue = i + 1;
          const isFilled = displayRating >= starValue;
          const isHalf = !isFilled && displayRating >= starValue - 0.5;

          return (
            <button
              key={i}
              type="button"
              className={`star-btn ${interactive ? 'interactive' : 'readonly'}`}
              disabled={!interactive}
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => handleMouseEnter(starValue)}
              aria-label={`${starValue} star${starValue > 1 ? 's' : ''}`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`star-icon ${isFilled ? 'filled' : isHalf ? 'half' : 'empty'}`}
                fill={isFilled ? 'currentColor' : isHalf ? 'url(#half-grad)' : 'none'}
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <defs>
                  <linearGradient id="half-grad" x1="0" x2="100%" y1="0" y2="0">
                    <stop offset="50%" stopColor="currentColor" />
                    <stop offset="50%" stopColor="transparent" stopOpacity="1" />
                  </linearGradient>
                </defs>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          );
        })}
      </div>

      {showNumber && (
        <span className="rating-score font-mono">
          {rating > 0 ? rating.toFixed(1) : 'New'}
        </span>
      )}

      {reviewCount !== undefined && (
        <span className="rating-count text-muted text-sm">
          ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
};
