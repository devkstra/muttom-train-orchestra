import React, { useRef, useEffect, useState, useCallback } from 'react';
import { YardDefinition, Node, Train } from '@/types/yard';

interface YardMapProps {
  yardDefinition: YardDefinition;
  trains: Record<string, Train>;
  onNodeClick?: (nodeId: string) => void;
  onTrainClick?: (trainId: string) => void;
  className?: string;
}

const YardMap: React.FC<YardMapProps> = ({ 
  yardDefinition, 
  trains, 
  onNodeClick, 
  onTrainClick,
  className = '' 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 1200, height: 700 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Pan functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = (e.clientX - dragStart.x) / zoom;
      const deltaY = (e.clientY - dragStart.y) / zoom;
      
      setViewBox(prev => ({
        ...prev,
        x: prev.x - deltaX,
        y: prev.y - deltaY
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom functionality
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
    
    setZoom(newZoom);
    
    // Zoom towards mouse position
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      setViewBox(prev => ({
        x: prev.x + (mouseX / zoom - mouseX / newZoom),
        y: prev.y + (mouseY / zoom - mouseY / newZoom),
        width: prev.width,
        height: prev.height
      }));
    }
  }, [zoom]);

  // Render track connections
  const renderConnections = () => {
    return yardDefinition.connections.map((connection, index) => {
      const fromNode = yardDefinition.nodes[connection.from];
      const toNode = yardDefinition.nodes[connection.to];
      
      if (!fromNode || !toNode) return null;

      return (
        <line
          key={`connection-${index}`}
          x1={fromNode.x}
          y1={fromNode.y}
          x2={toNode.x}
          y2={toNode.y}
          stroke="hsl(var(--track))"
          strokeWidth="3"
          className="hover:stroke-track-active transition-colors duration-200"
        />
      );
    });
  };

  // Render nodes
  const renderNodes = () => {
    return Object.values(yardDefinition.nodes).map(node => {
      const isOccupied = Object.values(trains).some(train => train.locationNodeId === node.id);
      
      return (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.type === 'switch' ? 8 : 6}
            fill="hsl(var(--node))"
            stroke="hsl(var(--track))"
            strokeWidth="2"
            className={`cursor-pointer transition-all duration-200 hover:r-10 ${
              isOccupied ? 'fill-train' : ''
            }`}
            onClick={() => onNodeClick?.(node.id)}
          />
          
          {/* Node labels */}
          {node.label && (
            <text
              x={node.x}
              y={node.y - 15}
              textAnchor="middle"
              fontSize="10"
              fill="hsl(var(--foreground))"
              className="pointer-events-none select-none font-mono text-xs"
            >
              {node.label}
            </text>
          )}
          
          {/* Area backgrounds for special zones */}
          {node.type === 'bay' && yardDefinition.inspectionBays.includes(node.id) && (
            <rect
              x={node.x - 25}
              y={node.y - 25}
              width="50"
              height="50"
              fill="hsl(var(--inspection-bay))"
              fillOpacity="0.2"
              rx="5"
              className="pointer-events-none"
            />
          )}
          
          {node.type === 'bay' && yardDefinition.workshopLines.includes(node.id) && (
            <rect
              x={node.x - 25}
              y={node.y - 25}
              width="50"
              height="50"
              fill="hsl(var(--workshop))"
              fillOpacity="0.2"
              rx="5"
              className="pointer-events-none"
            />
          )}
          
          {node.type === 'siding-slot' && (
            <rect
              x={node.x - 20}
              y={node.y - 15}
              width="40"
              height="30"
              fill="hsl(var(--siding))"
              fillOpacity="0.15"
              rx="3"
              className="pointer-events-none"
            />
          )}
        </g>
      );
    });
  };

  // Render trains
  const renderTrains = () => {
    return Object.values(trains).map(train => {
      const node = yardDefinition.nodes[train.locationNodeId];
      if (!node) return null;

      const trainColor = train.status === 'moving' ? 'hsl(var(--train-moving))' : 
                        train.failures.length > 0 ? 'hsl(var(--train-error))' : 
                        'hsl(var(--train))';

      return (
        <g key={train.id}>
          <rect
            x={node.x - 8}
            y={node.y - 4}
            width="16"
            height="8"
            fill={trainColor}
            rx="2"
            className="cursor-pointer shadow-train transition-all duration-300 hover:scale-110"
            onClick={() => onTrainClick?.(train.id)}
          />
          
          {/* Train number label */}
          {train.number && (
            <text
              x={node.x}
              y={node.y + 15}
              textAnchor="middle"
              fontSize="8"
              fill="hsl(var(--foreground))"
              className="pointer-events-none select-none font-mono text-xs font-bold"
            >
              {train.number}
            </text>
          )}
          
          {/* Status indicator */}
          <circle
            cx={node.x + 10}
            cy={node.y - 10}
            r="3"
            fill={train.priority ? 'hsl(var(--warning))' : 'transparent'}
            className="pointer-events-none"
          />
        </g>
      );
    });
  };

  // Zone labels
  const renderZoneLabels = () => {
    return (
      <g className="pointer-events-none select-none">
        <text x={50} y={150} fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">Entry/Exit Point</text>
        <text x={50} y={250} fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">WORKSHOP</text>
        <text x={300} y={150} fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">Track Interchange</text>
        <text x={600} y={130} fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">Inspection Bay</text>
        <text x={950} y={200} fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">Sidings</text>
        <text x={970} y={220} fontSize="12" fill="hsl(var(--muted-foreground))">12 siding X 2 trains each</text>
        <text x={300} y={580} fontSize="14" fontWeight="bold" fill="hsl(var(--foreground))">Test Track</text>
      </g>
    );
  };

  return (
    <div className={`relative bg-background border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setZoom(zoom * 1.2)}
          className="bg-card border border-border rounded p-2 hover:bg-secondary transition-colors"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => setZoom(zoom / 1.2)}
          className="bg-card border border-border rounded p-2 hover:bg-secondary transition-colors"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={() => {
            setViewBox({ x: 0, y: 0, width: 1200, height: 700 });
            setZoom(1);
          }}
          className="bg-card border border-border rounded p-2 hover:bg-secondary transition-colors text-xs"
          title="Reset View"
        >
          Reset
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-card/90 border border-border rounded-lg p-3 text-xs">
        <h4 className="font-semibold mb-2">Legend</h4>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-node"></div>
            <span>Nodes/Switches</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm bg-train"></div>
            <span>Train (Normal)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm bg-train-moving"></div>
            <span>Train (Moving)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm bg-train-error"></div>
            <span>Train (Error)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning"></div>
            <span>Priority</span>
          </div>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width / zoom} ${viewBox.height / zoom}`}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" opacity="0.3"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Render all elements */}
        {renderConnections()}
        {renderNodes()}
        {renderTrains()}
        {renderZoneLabels()}
      </svg>
    </div>
  );
};

export default YardMap;