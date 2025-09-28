import { 
  Train, 
  YardState, 
  YardDefinition, 
  YardEvent, 
  Plan, 
  PlanStep, 
  AssignmentRecommendation,
  SimulatorCommand,
  InspectionBay,
  WorkshopLine,
  SidingSlot
} from '@/types/yard';

export class YardSimulator {
  private state: YardState;
  private definition: YardDefinition;
  private eventHandlers: ((event: YardEvent) => void)[] = [];

  constructor(definition: YardDefinition) {
    this.definition = definition;
    this.state = this.initializeState();
  }

  private initializeState(): YardState {
    // Initialize inspection bays
    const inspectionBays: Record<string, InspectionBay> = {};
    this.definition.inspectionBays.forEach((nodeId, index) => {
      inspectionBays[nodeId] = {
        id: nodeId,
        name: this.definition.nodes[nodeId].label || `IL-${index + 1}`,
        nodeId,
        inspectionDuration: 5 * 60 * 1000, // 5 minutes in ms
        status: 'free'
      };
    });

    // Initialize workshop lines
    const workshopLines: Record<string, WorkshopLine> = {};
    this.definition.workshopLines.forEach((nodeId, index) => {
      const specialization = nodeId === 'WL4' ? 'wheel-alignment' : undefined;
      workshopLines[nodeId] = {
        id: nodeId,
        name: this.definition.nodes[nodeId].label || `WL-${index + 1}`,
        nodeId,
        specialization,
        capacity: 1,
        status: 'free'
      };
    });

    // Initialize siding slots
    const sidingSlots: Record<string, SidingSlot> = {};
    this.definition.sidingSlots.forEach(nodeId => {
      const node = this.definition.nodes[nodeId];
      const metadata = node.metadata;
      if (metadata) {
        sidingSlots[nodeId] = {
          id: nodeId,
          sidingId: metadata.sidingId,
          slot: metadata.slot,
          reverseCost: metadata.reverseCost,
          blockingRisk: this.calculateBlockingRisk(metadata.sidingId, metadata.slot)
        };
      }
    });

    return {
      trains: {},
      inspectionBays,
      workshopLines,
      sidingSlots,
      lockedSegments: new Set(),
      activePlans: {},
      eventLog: [],
      simulationSpeed: 1,
      lastUpdate: Date.now()
    };
  }

  private calculateBlockingRisk(sidingId: string, slot: 'a' | 'b'): 'low' | 'medium' | 'high' {
    // Slot 'a' has lower blocking risk since it doesn't block 'b'
    // Higher numbered sidings have lower blocking risk (easier access)
    const sidingNum = parseInt(sidingId.substring(1));
    
    if (slot === 'a') {
      return sidingNum > 8 ? 'low' : sidingNum > 4 ? 'medium' : 'high';
    } else {
      return sidingNum > 8 ? 'medium' : 'high';
    }
  }

  public addEventListener(handler: (event: YardEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  public removeEventListener(handler: (event: YardEvent) => void): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index > -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  private emitEvent(event: Omit<YardEvent, 'id' | 'timestamp'>): void {
    const fullEvent: YardEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    
    this.state.eventLog.push(fullEvent);
    this.eventHandlers.forEach(handler => handler(fullEvent));
  }

  public enqueueTrain(trainData: Partial<Train>): string {
    const trainId = `train_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const train: Train = {
      id: trainId,
      number: trainData.number || `T${Object.keys(this.state.trains).length + 1}`,
      status: 'arriving',
      locationNodeId: 'E1', // Always start at entry point
      orientation: 'east',
      fitness: trainData.fitness || Math.floor(Math.random() * 100),
      mileage: trainData.mileage || Math.floor(Math.random() * 50000),
      jobCard: trainData.jobCard || { tasks: [] },
      failures: trainData.failures || [],
      priority: trainData.priority || false,
      departSoon: trainData.departSoon || false,
      arrivalTime: Date.now(),
      lastUpdated: Date.now()
    };

    this.state.trains[trainId] = train;
    
    this.emitEvent({
      type: 'train:created',
      trainId,
      message: `Train ${train.number} arrived at entry point`,
      severity: 'info',
      data: { train }
    });

    // Auto-assign to inspection bay
    setTimeout(() => {
      this.autoAssignToInspection(trainId);
    }, 2000); // 2 second delay for visual effect

    return trainId;
  }

  private autoAssignToInspection(trainId: string): void {
    const train = this.state.trains[trainId];
    if (!train || train.status !== 'arriving') return;

    // Find first available inspection bay (IL-1 → IL-2 → IL-3 → DIC)
    const availableBay = this.definition.inspectionBays.find(bayId => 
      this.state.inspectionBays[bayId].status === 'free'
    );

    if (availableBay) {
      this.assignTrainToInspection(trainId, availableBay);
    } else {
      // Queue the train
      train.status = 'queued';
      this.emitEvent({
        type: 'train:updated',
        trainId,
        message: `Train ${train.number} queued - all inspection bays occupied`,
        severity: 'warning'
      });
    }
  }

  private assignTrainToInspection(trainId: string, bayId: string): void {
    const train = this.state.trains[trainId];
    const bay = this.state.inspectionBays[bayId];
    
    if (!train || !bay || bay.status !== 'free') return;

    // Move train to inspection bay
    train.status = 'inspection';
    train.locationNodeId = bayId;
    train.lastUpdated = Date.now();

    // Update bay status
    bay.status = 'occupied';
    bay.occupiedBy = trainId;
    bay.inspectionStartTime = Date.now();

    this.emitEvent({
      type: 'train:moved',
      trainId,
      message: `Train ${train.number} moved to ${bay.name} for inspection`,
      severity: 'info',
      data: { fromNode: 'E1', toNode: bayId }
    });

    // Schedule inspection completion
    setTimeout(() => {
      this.completeInspection(trainId, bayId);
    }, bay.inspectionDuration * this.state.simulationSpeed);
  }

  private completeInspection(trainId: string, bayId: string): void {
    const train = this.state.trains[trainId];
    const bay = this.state.inspectionBays[bayId];
    
    if (!train || !bay || bay.occupiedBy !== trainId) return;

    // Simulate inspection result
    const passRate = train.failures.length > 0 ? 0.3 : 0.8;
    const inspectionPassed = Math.random() < passRate;

    // Free up the bay
    bay.status = 'free';
    bay.occupiedBy = undefined;
    bay.inspectionStartTime = undefined;

    train.status = 'moving';
    train.lastUpdated = Date.now();

    this.emitEvent({
      type: 'inspection:result',
      trainId,
      message: `Train ${train.number} inspection ${inspectionPassed ? 'passed' : 'failed'}`,
      severity: inspectionPassed ? 'success' : 'warning',
      data: { bayId, passed: inspectionPassed }
    });

    if (inspectionPassed) {
      // Generate siding recommendations
      const recommendations = this.generateSidingRecommendations(trainId);
      this.emitEvent({
        type: 'plan:preview',
        trainId,
        message: `Generated ${recommendations.length} siding recommendations for train ${train.number}`,
        severity: 'info',
        data: { recommendations }
      });
      
      // Auto-assign if not priority or departSoon
      if (!train.priority && !train.departSoon) {
        const bestRecommendation = recommendations[0];
        if (bestRecommendation) {
          setTimeout(() => {
            this.assignTrainToSiding(trainId, bestRecommendation.targetId, bestRecommendation.slot);
          }, 1000);
        }
      }
    } else {
      // Generate workshop recommendations
      const recommendations = this.generateWorkshopRecommendations(trainId);
      this.emitEvent({
        type: 'plan:preview',
        trainId,
        message: `Generated ${recommendations.length} workshop recommendations for train ${train.number}`,
        severity: 'info',
        data: { recommendations }
      });

      // Auto-assign to workshop if available
      const bestRecommendation = recommendations[0];
      if (bestRecommendation) {
        setTimeout(() => {
          this.assignTrainToWorkshop(trainId, bestRecommendation.targetId);
        }, 1000);
      }
    }

    // Check for queued trains
    this.processQueuedTrains();
  }

  private processQueuedTrains(): void {
    const queuedTrains = Object.values(this.state.trains).filter(train => train.status === 'queued');
    queuedTrains.forEach(train => {
      this.autoAssignToInspection(train.id);
    });
  }

  public generateSidingRecommendations(trainId: string): AssignmentRecommendation[] {
    const train = this.state.trains[trainId];
    if (!train) return [];

    const recommendations: AssignmentRecommendation[] = [];

    // Check each siding slot
    Object.values(this.state.sidingSlots).forEach(slot => {
      if (!slot.occupiedBy) {
        const score = this.calculateSidingScore(train, slot);
        const recommendation: AssignmentRecommendation = {
          targetId: slot.id,
          targetType: 'siding',
          slot: slot.slot,
          score,
          reverseCost: slot.reverseCost || 1,
          distanceEstimate: this.calculateDistance(train.locationNodeId, slot.id),
          blockingRisk: slot.blockingRisk || 'medium',
          ETAToPark: this.calculateETA(train.locationNodeId, slot.id),
          estimatedShuntSteps: slot.slot === 'b' ? 1 : 0,
          reasoning: this.generateSidingReasoning(train, slot),
          warnings: this.generateSidingWarnings(train, slot)
        };
        recommendations.push(recommendation);
      }
    });

    // Sort by score (higher is better)
    return recommendations.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  public generateWorkshopRecommendations(trainId: string): AssignmentRecommendation[] {
    const train = this.state.trains[trainId];
    if (!train) return [];

    const recommendations: AssignmentRecommendation[] = [];

    // Check workshop requirements
    const needsWheelAlignment = train.failures.includes('wheel-alignment');

    Object.values(this.state.workshopLines).forEach(workshop => {
      if (!workshop.occupiedBy) {
        // If wheel alignment needed, only WL-4 is suitable
        if (needsWheelAlignment && workshop.specialization !== 'wheel-alignment') {
          return;
        }

        const score = this.calculateWorkshopScore(train, workshop);
        const recommendation: AssignmentRecommendation = {
          targetId: workshop.id,
          targetType: 'workshop',
          score,
          reverseCost: 1,
          distanceEstimate: this.calculateDistance(train.locationNodeId, workshop.nodeId),
          blockingRisk: 'low',
          ETAToPark: this.calculateETA(train.locationNodeId, workshop.nodeId),
          estimatedShuntSteps: 0,
          reasoning: this.generateWorkshopReasoning(train, workshop),
          warnings: []
        };
        recommendations.push(recommendation);
      }
    });

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private calculateSidingScore(train: Train, slot: SidingSlot): number {
    let score = 100;

    // Prefer 'a' slots for departSoon trains
    if (train.departSoon && slot.slot === 'a') score += 20;
    if (train.departSoon && slot.slot === 'b') score -= 10;

    // Lower reverse cost is better
    score -= (slot.reverseCost || 1) * 5;

    // Lower blocking risk is better
    if (slot.blockingRisk === 'low') score += 10;
    if (slot.blockingRisk === 'high') score -= 10;

    // Priority trains get preference for lower-numbered sidings (closer to exit)
    const sidingNum = parseInt(slot.sidingId.substring(1));
    if (train.priority) {
      score += (13 - sidingNum) * 2;
    }

    return Math.max(0, score);
  }

  private calculateWorkshopScore(train: Train, workshop: WorkshopLine): number {
    let score = 100;

    // Prefer specialized workshops for specific failures
    if (train.failures.includes('wheel-alignment') && workshop.specialization === 'wheel-alignment') {
      score += 50;
    }

    // Priority trains get slight preference for WL-1 (assuming it's fastest)
    if (train.priority && workshop.id === 'WL1') {
      score += 10;
    }

    return score;
  }

  private generateSidingReasoning(train: Train, slot: SidingSlot): string[] {
    const reasons: string[] = [];
    
    if (slot.slot === 'a') reasons.push('Front position - easier departure');
    if (slot.blockingRisk === 'low') reasons.push('Low blocking risk');
    if (train.departSoon && slot.slot === 'a') reasons.push('Suitable for morning departure');
    if (train.priority) reasons.push('Priority train - close to exit');

    return reasons;
  }

  private generateSidingWarnings(train: Train, slot: SidingSlot): string[] {
    const warnings: string[] = [];
    
    if (slot.blockingRisk === 'high') warnings.push('High blocking risk for future operations');
    if (slot.slot === 'b' && train.departSoon) warnings.push('Rear position may delay morning departure');
    if ((slot.reverseCost || 0) > 2) warnings.push('High reverse cost for positioning');

    return warnings;
  }

  private generateWorkshopReasoning(train: Train, workshop: WorkshopLine): string[] {
    const reasons: string[] = [];
    
    if (workshop.specialization === 'wheel-alignment' && train.failures.includes('wheel-alignment')) {
      reasons.push('Specialized for wheel alignment repairs');
    }
    if (workshop.id === 'WL1') reasons.push('Primary workshop line');
    
    return reasons;
  }

  private calculateDistance(fromNodeId: string, toNodeId: string): number {
    const fromNode = this.definition.nodes[fromNodeId];
    const toNode = this.definition.nodes[toNodeId];
    
    if (!fromNode || !toNode) return 999;
    
    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateETA(fromNodeId: string, toNodeId: string): number {
    const distance = this.calculateDistance(fromNodeId, toNodeId);
    const avgSpeed = 50; // pixels per second
    return (distance / avgSpeed) * 1000; // Convert to milliseconds
  }

  public assignTrainToSiding(trainId: string, slotId: string, slot?: 'a' | 'b'): void {
    const train = this.state.trains[trainId];
    const sidingSlot = this.state.sidingSlots[slotId];
    
    if (!train || !sidingSlot || sidingSlot.occupiedBy) return;

    // Execute the assignment
    train.status = 'parked';
    train.locationNodeId = slotId;
    train.lastUpdated = Date.now();

    sidingSlot.occupiedBy = trainId;

    this.emitEvent({
      type: 'train:moved',
      trainId,
      message: `Train ${train.number} parked in ${sidingSlot.sidingId}-${sidingSlot.slot}`,
      severity: 'success',
      data: { targetId: slotId, slot: sidingSlot.slot }
    });
  }

  public assignTrainToWorkshop(trainId: string, workshopId: string): void {
    const train = this.state.trains[trainId];
    const workshop = this.state.workshopLines[workshopId];
    
    if (!train || !workshop || workshop.occupiedBy) return;

    // Execute the assignment
    train.status = 'workshop';
    train.locationNodeId = workshopId;
    train.lastUpdated = Date.now();

    workshop.status = 'occupied';
    workshop.occupiedBy = trainId;

    this.emitEvent({
      type: 'train:moved',
      trainId,
      message: `Train ${train.number} sent to ${workshop.name}`,
      severity: 'info',
      data: { workshopId }
    });

    // Simulate workshop completion
    setTimeout(() => {
      this.completeWorkshop(trainId, workshopId);
    }, 10000 * this.state.simulationSpeed); // 10 seconds
  }

  private completeWorkshop(trainId: string, workshopId: string): void {
    const train = this.state.trains[trainId];
    const workshop = this.state.workshopLines[workshopId];
    
    if (!train || !workshop || workshop.occupiedBy !== trainId) return;

    // Clear failures (simulate repair)
    train.failures = [];
    train.fitness = Math.min(100, train.fitness + 20);
    train.status = 'moving';
    train.lastUpdated = Date.now();

    workshop.status = 'free';
    workshop.occupiedBy = undefined;

    this.emitEvent({
      type: 'workshop:updated',
      trainId,
      message: `Train ${train.number} repairs completed at ${workshop.name}`,
      severity: 'success',
      data: { workshopId }
    });

    // Generate new siding recommendations
    const recommendations = this.generateSidingRecommendations(trainId);
    this.emitEvent({
      type: 'plan:preview',
      trainId,
      message: `Generated ${recommendations.length} siding recommendations after repair`,
      severity: 'info',
      data: { recommendations }
    });

    // Auto-assign to best siding
    const bestRecommendation = recommendations[0];
    if (bestRecommendation) {
      setTimeout(() => {
        this.assignTrainToSiding(trainId, bestRecommendation.targetId, bestRecommendation.slot);
      }, 1000);
    }
  }

  public getState(): YardState {
    return { ...this.state };
  }

  public processCommand(command: SimulatorCommand): void {
    switch (command.type) {
      case 'create_train':
        this.enqueueTrain(command.data || {});
        break;
      case 'assign_train':
        if (command.trainId && command.data) {
          const { targetId, slot } = command.data;
          if (command.data.targetType === 'siding') {
            this.assignTrainToSiding(command.trainId, targetId, slot);
          } else if (command.data.targetType === 'workshop') {
            this.assignTrainToWorkshop(command.trainId, targetId);
          }
        }
        break;
      case 'speed_change':
        if (command.data?.speed) {
          this.state.simulationSpeed = Math.max(0.1, Math.min(10, command.data.speed));
        }
        break;
    }
  }
}