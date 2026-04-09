import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableCellProps {
    id: string;
    children?: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

export const DroppableCell: React.FC<DroppableCellProps> = ({ id, children, className, style, onClick }) => {
    const { isOver, setNodeRef } = useDroppable({
        id
    });

    return (
        <div
            ref={setNodeRef}
            className={`${className} ${isOver ? 'bg-primary/10 ring-2 ring-primary/30' : ''}`}
            style={style}
            onClick={onClick}
        >
            {children}
        </div>
    );
};
