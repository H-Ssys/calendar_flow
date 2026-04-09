import React, { useState, useRef } from 'react';
import { EventCard } from './EventCard';
import { Event } from '@/context/CalendarContext';

interface ResizableEventProps {
    event: Event;
    style?: React.CSSProperties;
    onClick?: (event: Event) => void;
    onResize?: (eventId: string, newDuration: number) => void;
    hourInterval: number; // e.g., 2 for 2-hour intervals
    rowHeightRem: number; // e.g., 10 for 10rem per interval
    contentPaddingRight?: string; // right padding to keep text in uncovered area
}

export const ResizableEvent: React.FC<ResizableEventProps> = ({
    event,
    style,
    onClick,
    onResize,
    hourInterval,
    rowHeightRem,
    contentPaddingRight
}) => {
    const [isResizing, setIsResizing] = useState(false);
    const [resizeDirection, setResizeDirection] = useState<'top' | 'bottom' | null>(null);
    const [tempHeight, setTempHeight] = useState<number | null>(null);
    const startYRef = useRef<number>(0);
    const startHeightRef = useRef<number>(0);

    const handleResizeStart = (e: React.MouseEvent, direction: 'top' | 'bottom') => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeDirection(direction);
        startYRef.current = e.clientY;

        // Get current height from style
        const currentHeight = typeof style?.height === 'string'
            ? parseFloat(style.height)
            : 0;
        startHeightRef.current = currentHeight;

        // Add global mouse move and mouse up listeners
        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeEnd);
    };

    const handleResizeMove = (e: MouseEvent) => {
        if (!isResizing || !resizeDirection) return;

        const deltaY = e.clientY - startYRef.current;
        const deltaRem = deltaY / 16; // Convert pixels to rem (assuming 16px = 1rem)

        let newHeight = startHeightRef.current;

        if (resizeDirection === 'bottom') {
            // Resizing from bottom - increase/decrease height
            newHeight = startHeightRef.current + deltaRem;
        } else {
            // Resizing from top - decrease/increase height (inverse)
            newHeight = startHeightRef.current - deltaRem;
        }

        // Minimum height: 1.25rem (30 minutes)
        newHeight = Math.max(newHeight, 1.25);

        setTempHeight(newHeight);
    };

    const handleResizeEnd = () => {
        if (tempHeight !== null && onResize) {
            // Calculate new duration in hours
            // rowHeightRem represents hourInterval hours
            // So 1 hour = rowHeightRem / hourInterval rem
            const remPerHour = rowHeightRem / hourInterval;
            const newDurationHours = tempHeight / remPerHour;

            // Round to nearest 0.5 hour (30 minutes)
            const roundedDuration = Math.round(newDurationHours * 2) / 2;

            onResize(event.id, roundedDuration);
        }

        setIsResizing(false);
        setResizeDirection(null);
        setTempHeight(null);

        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    };

    const displayHeight = tempHeight !== null ? `${tempHeight}rem` : style?.height;

    return (
        <div
            className="absolute px-1 pointer-events-auto group"
            style={{
                ...style,
                height: displayHeight,
                cursor: isResizing ? (resizeDirection === 'top' ? 'ns-resize' : 'ns-resize') : 'default'
            }}
        >
            {/* Top Resize Handle */}
            <div
                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
                onMouseDown={(e) => handleResizeStart(e, 'top')}
                style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)'
                }}
            >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
            </div>

            {/* Event Card */}
            <div className={`h-full ${isResizing ? 'pointer-events-none' : ''}`} style={contentPaddingRight ? { paddingRight: contentPaddingRight } : undefined}>
                <EventCard event={event} onClick={onClick} />
            </div>

            {/* Bottom Resize Handle */}
            <div
                className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 transition-opacity z-20"
                onMouseDown={(e) => handleResizeStart(e, 'bottom')}
                style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.2), transparent)'
                }}
            >
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full" />
            </div>
        </div>
    );
};
