import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { EventCard } from './EventCard';
import { Event } from '@/context/CalendarContext';

interface DraggableEventProps {
    event: Event;
    style?: React.CSSProperties;
    onClick?: (event: Event) => void;
}

export const DraggableEvent: React.FC<DraggableEventProps> = ({ event, style, onClick }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: event.id,
        data: { event }
    });

    const dragStyle = {
        ...style,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        zIndex: isDragging ? 1000 : (style?.zIndex || 10)
    };

    return (
        <div
            ref={setNodeRef}
            style={dragStyle}
            {...listeners}
            {...attributes}
            className="absolute px-1 pointer-events-auto"
        >
            <EventCard event={event} onClick={onClick} />
        </div>
    );
};
