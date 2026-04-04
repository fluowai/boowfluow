import React from 'react';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from '@dnd-kit/sortable';
import { KanbanColumn } from './KanbanColumn';

export function KanbanBoard({ columns, searchTerm, onRefresh }: { columns: any[], searchTerm: string, onRefresh: () => void }) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: any) => {
    const { active, over } = event;
    
    if (!over) return;

    if (active.id !== over.id) {
       // Lógica de movimentação aqui
       // Por enquanto, apenas para visual
       console.log('Movido:', active.id, 'para', over.id);
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full w-full overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex gap-6 h-full min-w-max p-1">
          <SortableContext 
            items={columns.map(c => c.id)}
            strategy={horizontalListSortingStrategy}
          >
            {columns.map((column) => (
              <KanbanColumn 
                key={column.id} 
                column={column} 
                searchTerm={searchTerm} 
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </DndContext>
  );
}
