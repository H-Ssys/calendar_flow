import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Event } from '@/context/CalendarContext';

interface DraggableDailyEventProps {
    event: Event;
    children: React.ReactNode;
    style?: React.CSSProperties;
}

export const DraggableDailyEvent: React.FC<DraggableDailyEventProps> = ({ event, children, style }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `daily-event-${event.id}`,
        data: { event }
    });

    const dragStyle: React.CSSProperties = {
        ...style,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 50 : (style?.zIndex ?? 10),
        transition: isDragging ? 'none' : 'opacity 150ms ease'
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            style={dragStyle}
        >
            {children}
        </div>
    );
};
