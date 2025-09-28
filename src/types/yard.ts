// Metro Yard Simulation TypeScript Interfaces

export interface Train {
  id: string;
  number?: string;
  status: 'arriving' | 'queued' | 'inspection' | 'moving' | 'parked' | 'workshop' | 'test' | 'departed';
  locationNodeId: string;
  orientation: 'north' | 'south' | 'east' | 'west';
  fitness: number; // 0-100
  mileage: number;
  jobCard: { 
    tasks: { id: string; desc: string; done: boolean }[] 
  };
  failures: string[]; // e.g., ['wheel-alignment', 'brake']
  priority: boolean;
  departSoon?: boolean; // morning-ready flag
  plannedMoves?: PlanStep[]; // optional, for preview & execution
  arrivalTime: number; // timestamp
  lastUpdated: number; // timestamp
}

export interface Node {
  id: string;
  type: 'switch' | 'bay' | 'siding-slot' | 'track' | 'entry' | 'exit' | 'test' | 'shunting';
  x: number;
  y: number;
  connections: string[]; // node ids
  label?: string;
  metadata?: Record<string, any>;
}

export interface SidingSlot {
  id: string;
  sidingId: string; // S1..S12
  slot: 'a' | 'b';
  occupiedBy?: string; // trainId
  reverseCost?: number; // precomputed cost from yardDefinition
  blockingRisk?: 'low' | 'medium' | 'high'; // configurable / computed
}

export interface PlanStep {
  id: string;
  description: string;
  segments: string[]; // track segments reserved
  type: 'move' | 'switch' | 'reserve' | 'release';
  durationMs: number;
  fromNode: string;
  toNode: string;
}

export interface Plan {
  id: string;
  trainId: string;
  steps: PlanStep[];
  estimatedDuration: number;
  requiredLocks: string[];
  warnings: string[];
  cost: number;
  status: 'preview' | 'executing' | 'completed' | 'failed';
  createdAt: number;
}

export interface InspectionBay {
  id: string;
  name: string;
  nodeId: string;
  occupiedBy?: string;
  inspectionStartTime?: number;
  inspectionDuration: number; // default 5 minutes
  status: 'free' | 'occupied' | 'cleaning';
}

export interface WorkshopLine {
  id: string;
  name: string;
  nodeId: string;
  occupiedBy?: string;
  specialization?: string; // e.g., 'wheel-alignment'
  capacity: number;
  status: 'free' | 'occupied' | 'maintenance';
}

export interface YardState {
  trains: Record<string, Train>;
  inspectionBays: Record<string, InspectionBay>;
  workshopLines: Record<string, WorkshopLine>;
  sidingSlots: Record<string, SidingSlot>;
  lockedSegments: Set<string>;
  activePlans: Record<string, Plan>;
  eventLog: YardEvent[];
  simulationSpeed: number; // multiplier for time
  lastUpdate: number;
}

export interface YardEvent {
  id: string;
  timestamp: number;
  type: 'train:created' | 'train:moved' | 'train:updated' | 'switch:changed' | 
        'inspection:result' | 'workshop:updated' | 'log:new' | 'plan:preview' | 
        'plan:start' | 'plan:step' | 'plan:complete' | 'error' | 'lock:acquired' | 'lock:released';
  trainId?: string;
  message: string;
  data?: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'success';
}

export interface YardDefinition {
  nodes: Record<string, Node>;
  connections: Array<{
    from: string;
    to: string;
    segments: string[];
    bidirectional: boolean;
  }>;
  inspectionBays: string[];
  workshopLines: string[];
  sidingSlots: string[];
  shuntingNecks: string[];
  entryPoints: string[];
  exitPoints: string[];
}

export interface AssignmentRecommendation {
  targetId: string;
  targetType: 'siding' | 'workshop' | 'test';
  slot?: 'a' | 'b';  
  score: number;
  reverseCost: number;
  distanceEstimate: number;
  blockingRisk: 'low' | 'medium' | 'high';
  ETAToPark: number;
  estimatedShuntSteps: number;
  reasoning: string[];
  warnings: string[];
}

export interface SimulatorCommand {
  type: 'create_train' | 'assign_train' | 'remove_train' | 'preview_plan' | 'execute_plan' | 'pause' | 'resume' | 'speed_change';
  trainId?: string;
  data?: Record<string, any>;
}