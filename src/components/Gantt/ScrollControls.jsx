import React, { useState, useEffect } from 'react';
import { Button } from 'antd';
import { LeftOutlined, RightOutlined, UpOutlined, DownOutlined } from '@ant-design/icons';

const ScrollControls = ({ containerId, dependencies = [] }) => {
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(false);
    const [showUp, setShowUp] = useState(false);
    const [showDown, setShowDown] = useState(false);
    const [scrollProgress, setScrollProgress] = useState({ x: 0, y: 0 });

    const checkScroll = () => {
        const container = document.getElementById(containerId);
        if (!container) return;

        const { scrollLeft, scrollWidth, clientWidth, scrollTop, scrollHeight, clientHeight } = container;
        
        // Horizontal scroll indicators
        setShowLeft(scrollLeft > 10);
        setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
        
        // Vertical scroll indicators
        setShowUp(scrollTop > 10);
        setShowDown(scrollTop < scrollHeight - clientHeight - 10);
        
        // Progress calculation
        const xProgress = scrollWidth > clientWidth 
            ? (scrollLeft / (scrollWidth - clientWidth)) * 100 
            : 0;
        const yProgress = scrollHeight > clientHeight 
            ? (scrollTop / (scrollHeight - clientHeight)) * 100 
            : 0;
        
        setScrollProgress({ x: xProgress, y: yProgress });
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

        const scrollAmountX = container.clientWidth / 2;
        const scrollAmountY = container.clientHeight / 2;
        
        const scrollConfig = {
            left: { left: -scrollAmountX },
            right: { left: scrollAmountX },
            up: { top: -scrollAmountY },
            down: { top: scrollAmountY }
        };
        
        container.scrollBy({
            ...scrollConfig[direction],
            behavior: 'smooth'
        });
    };

    const hasHorizontalScroll = showLeft || showRight;
    const hasVerticalScroll = showUp || showDown;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}>
            {/* Fade gradients to indicate more content */}
            {showLeft && (
                <div 
                    className="absolute left-0 top-0 h-full w-16 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to right, rgba(0,0,0,0.08), transparent)',
                        zIndex: 40
                    }}
                />
            )}
            {showRight && (
                <div 
                    className="absolute right-0 top-0 h-full w-16 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to left, rgba(0,0,0,0.08), transparent)',
                        zIndex: 40
                    }}
                />
            )}
            {showUp && (
                <div 
                    className="absolute left-0 top-0 w-full h-12 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.06), transparent)',
                        zIndex: 40
                    }}
                />
            )}
            {showDown && (
                <div 
                    className="absolute left-0 bottom-0 w-full h-12 pointer-events-none"
                    style={{
                        background: 'linear-gradient(to top, rgba(0,0,0,0.06), transparent)',
                        zIndex: 40
                    }}
                />
            )}

            {/* Horizontal scroll progress bar (bottom) */}
            {hasHorizontalScroll && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-slate-300/50 dark:bg-slate-600/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                        className="h-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-150"
                        style={{ width: '30%', marginLeft: `${scrollProgress.x * 0.7}%` }}
                    />
                </div>
            )}

            {/* Vertical scroll progress bar (right side) */}
            {hasVerticalScroll && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-24 bg-slate-300/50 dark:bg-slate-600/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <div 
                        className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-full transition-all duration-150"
                        style={{ height: '30%', marginTop: `${scrollProgress.y * 0.7}%` }}
                    />
                </div>
            )}

            {/* Navigation buttons - Horizontal */}
            {showLeft && (
                <Button
                    shape="circle"
                    icon={<LeftOutlined />}
                    onClick={() => scroll('left')}
                    className="shadow-lg border-none opacity-70 hover:opacity-100 bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400"
                    style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto' }}
                    size="large"
                />
            )}
            {showRight && (
                <Button
                    shape="circle"
                    icon={<RightOutlined />}
                    onClick={() => scroll('right')}
                    className="shadow-lg border-none opacity-70 hover:opacity-100 bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400"
                    style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'auto' }}
                    size="large"
                />
            )}

            {/* Navigation buttons - Vertical */}
            {showUp && (
                <Button
                    shape="circle"
                    icon={<UpOutlined />}
                    onClick={() => scroll('up')}
                    className="shadow-lg border-none opacity-70 hover:opacity-100 bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400"
                    style={{ position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}
                    size="middle"
                />
            )}
            {showDown && (
                <Button
                    shape="circle"
                    icon={<DownOutlined />}
                    onClick={() => scroll('down')}
                    className="shadow-lg border-none opacity-70 hover:opacity-100 bg-white/90 dark:bg-slate-800/90 text-indigo-600 dark:text-indigo-400"
                    style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'auto' }}
                    size="middle"
                />
            )}
        </div>
    );
};

export default ScrollControls;
