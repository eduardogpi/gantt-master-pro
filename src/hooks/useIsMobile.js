import { useState, useEffect } from 'react';

/**
 * Hook para detectar se o dispositivo é mobile
 * @param {number} breakpoint - Breakpoint em pixels (default: 768)
 * @returns {boolean} - true se a tela for menor que o breakpoint
 */
export function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < breakpoint;
        }
        return false;
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        // Usar matchMedia para melhor performance
        const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
        
        // Handler para matchMedia
        const handleMediaChange = (e) => {
            setIsMobile(e.matches);
        };

        // Adicionar listener
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleMediaChange);
        } else {
            // Fallback para navegadores antigos
            window.addEventListener('resize', handleResize);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleMediaChange);
            } else {
                window.removeEventListener('resize', handleResize);
            }
        };
    }, [breakpoint]);

    return isMobile;
}

/**
 * Hook para detectar breakpoints específicos
 * @returns {Object} - { isMobile, isTablet, isDesktop }
 */
export function useBreakpoint() {
    const [breakpoint, setBreakpoint] = useState(() => {
        if (typeof window === 'undefined') return 'desktop';
        const width = window.innerWidth;
        if (width < 640) return 'mobile';
        if (width < 1024) return 'tablet';
        return 'desktop';
    });

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 640) setBreakpoint('mobile');
            else if (width < 1024) setBreakpoint('tablet');
            else setBreakpoint('desktop');
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return {
        breakpoint,
        isMobile: breakpoint === 'mobile',
        isTablet: breakpoint === 'tablet',
        isDesktop: breakpoint === 'desktop'
    };
}

export default useIsMobile;
