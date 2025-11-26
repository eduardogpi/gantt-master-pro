import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const ScrollControls = ({ containerId, dependencies = [] }) => {
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);

    const checkScroll = () => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth } = container;
        setShowLeft(scrollLeft > 0);
        setShowRight(scrollLeft < scrollWidth - clientWidth - 10); // -10 buffer
    };

    useEffect(() => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.addEventListener('scroll', checkScroll);
        window.addEventListener('resize', checkScroll);

        // Initial check
        checkScroll();

        return () => {
            container.removeEventListener('scroll', checkScroll);
            window.removeEventListener('resize', checkScroll);
        };
    }, [containerId, ...dependencies]);

    // Re-check when dependencies change (e.g. zoom level, data length)
    useEffect(() => {
        checkScroll();
    }, dependencies);

    const scroll = (direction) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const scrollAmount = container.clientWidth / 2;
        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    if (!showLeft && !showRight) return null;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}>
            {showLeft && (
                <Button
                    shape="circle"
                    icon={<LeftOutlined />}
                    onClick={() => scroll('left')}
                    className="shadow-lg border-none opacity-80 hover:opacity-100 bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400"
                    style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto' }}
                    size="large"
                />
            )}
            {showRight && (
                <Button
                    shape="circle"
                    icon={<RightOutlined />}
                    onClick={() => scroll('right')}
                    className="shadow-lg border-none opacity-80 hover:opacity-100 bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400"
                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto' }}
                    size="large"
                />
            )}
        </div>
    );
};

export default ScrollControls;
