import React from 'react';

interface HighlightProps {
    text: string;
    query: string;
}

export const Highlight: React.FC<HighlightProps> = ({ text, query }) => {
    if (!query) return <>{text}</>;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} style={{
                        backgroundColor: 'rgba(var(--primary-rgb), 0.2)',
                        color: 'var(--primary)',
                        padding: '0 2px',
                        borderRadius: '2px',
                        fontWeight: 600
                    }}>
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                )
            )}
        </span>
    );
};
