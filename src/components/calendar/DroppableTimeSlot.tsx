import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableTimeSlotProps {
    id: string;
    children?: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

export const DroppableTimeSlot: React.FC<DroppableTimeSlotProps> = ({ id, children, className, onClick }) => {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div
            ref={setNodeRef}
            onClick={onClick}
            className={`${className || ''} ${isOver ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
        >
            {children}
        </div>
    );
};
