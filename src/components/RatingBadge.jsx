import React from 'react';

const RatingBadge = ({ level }) => {
    const rating = Math.min(5, Math.max(1, parseInt(level) || 3));
    const getClassName = () => {
        if (rating >= 5) return 'rating-5';
        if (rating >= 4) return 'rating-4';
        if (rating >= 3) return 'rating-3';
        if (rating >= 2) return 'rating-2';
        return 'rating-1';
    };
    return (
        <div className={`rating-badge ${getClassName()}`}>
            {rating}
        </div>
    );
};

export default RatingBadge;