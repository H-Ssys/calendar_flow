import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableTimeSlotProps {
    id: string;
    children?: React.ReactNode;
    className?: string;
}

export const DroppableTimeSlot: React.FC<DroppableTimeSlotProps> = ({ id, children, className }) => {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            className={`${className || ''} ${isOver ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
        >
            {children}
        </div>
    );
};
