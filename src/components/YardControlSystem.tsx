import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

import YardMap from './YardMap';
import EntryDashboard from './EntryDashboard';
import InspectionDashboard from './InspectionDashboard';
import WorkshopDashboard from './WorkshopDashboard';
import SidingManager from './SidingManager';
import EventLog from './EventLog';

import { YardSimulator } from '@/lib/simulator';
import { YardDefinition, Train, YardState, AssignmentRecommendation } from '@/types/yard';
import { Play, Pause, RotateCcw, Settings, Activity, Zap } from 'lucide-react';

interface YardControlSystemProps {
  yardDefinition: YardDefinition;
}

const YardControlSystem: React.FC<YardControlSystemProps> = ({ yardDefinition }) => {
  const [simulator] = useState(() => new YardSimulator(yardDefinition));
  const [yardState, setYardState] = useState<YardState>(simulator.getState());
  const [recommendations, setRecommendations] = useState<Record<string, AssignmentRecommendation[]>>({});
  const [selectedTrain, setSelectedTrain] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(true);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [activeTab, setActiveTab] = useState('entry');

  // Update yard state when simulator emits events
  useEffect(() => {
    const handleEvent = (event: any) => {
      setYardState(simulator.getState());
      
      // Handle recommendation events
      if (event.type === 'plan:preview' && event.data?.recommendations) {
        setRecommendations(prev => ({
          ...prev,
          [event.trainId]: event.data.recommendations
        }));
      }
    };

    simulator.addEventListener(handleEvent);
    return () => simulator.removeEventListener(handleEvent);
  }, [simulator]);

  // Simulation controls
  const toggleSimulation = () => {
    setIsRunning(!isRunning);
  };

  const changeSpeed = (newSpeed: number[]) => {
    const speed = newSpeed[0];
    setSimulationSpeed(speed);
    simulator.processCommand({ type: 'speed_change', data: { speed } });
  };

  const resetSimulation = () => {
    // This would reinitialize the simulator - for now just clear trains
    Object.keys(yardState.trains).forEach(trainId => {
      // In a real implementation, we'd have a reset command
    });
  };

  // Event handlers
  const handleCreateTrain = (trainData: Partial<Train>) => {
    simulator.processCommand({ type: 'create_train', data: trainData });
  };

  const handleAssignTrain = (trainId: string, targetId: string, slot?: 'a' | 'b') => {
    const targetType = targetId.startsWith('S') ? 'siding' : 
                      targetId.startsWith('WL') ? 'workshop' : 'test';
    
    simulator.processCommand({ 
      type: 'assign_train', 
      trainId, 
      data: { targetId, targetType, slot } 
    });
  };

  const handleAssignToWorkshop = (trainId: string, workshopId: string) => {
    simulator.processCommand({ 
      type: 'assign_train', 
      trainId, 
      data: { targetId: workshopId, targetType: 'workshop' } 
    });
  };

  const handleCompleteRepair = (trainId: string) => {
    // This would be handled by the simulator automatically
    // For now, we'll just trigger a workshop completion
  };

  const handleRemoveTrain = (trainId: string) => {
    simulator.processCommand({ type: 'remove_train', trainId });
  };

  const handleMoveTrain = (trainId: string, targetSlotId: string) => {
    // Preview move for now
    console.log(`Preview move: ${trainId} to ${targetSlotId}`);
  };

  const handlePreviewPlan = (trainId: string, targetId: string) => {
    // This would trigger plan preview
    console.log(`Preview plan: ${trainId} to ${targetId}`);
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
  };

  const handleTrainClick = (trainId: string) => {
    setSelectedTrain(trainId);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const trains = Object.values(yardState.trains);
    return {
      total: trains.length,
      arriving: trains.filter(t => t.status === 'arriving' || t.status === 'queued').length,
      inspection: trains.filter(t => t.status === 'inspection').length,
      parked: trains.filter(t => t.status === 'parked').length,
      workshop: trains.filter(t => t.status === 'workshop').length,
      moving: trains.filter(t => t.status === 'moving').length,
      priority: trains.filter(t => t.priority).length,
      departSoon: trains.filter(t => t.departSoon).length,
      failed: trains.filter(t => t.failures.length > 0).length
    };
  }, [yardState.trains]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-panel p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-primary">
              Kochi Metro Muttom Yard Control System
            </h1>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {isRunning ? 'Running' : 'Paused'}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Statistics */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-train rounded-full"></div>
                <span>{stats.total} Total</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-warning rounded-full"></div>
                <span>{stats.inspection} Inspection</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-success rounded-full"></div>
                <span>{stats.parked} Parked</span>
              </div>
              {stats.failed > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-destructive rounded-full"></div>
                  <span>{stats.failed} Failed</span>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant={isRunning ? "default" : "outline"}
                size="sm"
                onClick={toggleSimulation}
              >
                {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button variant="outline" size="sm" onClick={resetSimulation}>
                <RotateCcw className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 min-w-32">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[simulationSpeed]}
                  onValueChange={changeSpeed}
                  min={0.1}
                  max={5}
                  step={0.1}
                  className="w-20"
                />
                <span className="text-xs text-muted-foreground min-w-8">
                  {simulationSpeed.toFixed(1)}x
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Entry Dashboard */}
        <div className="w-80 border-r bg-card p-4 overflow-y-auto">
          <EntryDashboard
            yardState={yardState}
            onCreateTrain={handleCreateTrain}
          />
        </div>

        {/* Center - Yard Map */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4">
            <YardMap
              yardDefinition={yardDefinition}
              trains={yardState.trains}
              onNodeClick={handleNodeClick}
              onTrainClick={handleTrainClick}
              className="h-full"
            />
          </div>
          
          {/* Bottom Event Log */}
          <div className="h-80 border-t bg-card p-4">
            <EventLog events={yardState.eventLog} />
          </div>
        </div>

        {/* Right Panel - Context Dashboards */}
        <div className="w-96 border-l bg-card overflow-y-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
            <TabsList className="grid w-full grid-cols-3 m-4">
              <TabsTrigger value="inspection">Inspection</TabsTrigger>
              <TabsTrigger value="workshop">Workshop</TabsTrigger>
              <TabsTrigger value="siding">Sidings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inspection" className="p-4 pt-0">
              <InspectionDashboard
                yardState={yardState}
                recommendations={recommendations}
                onAssignTrain={handleAssignTrain}
                onPreviewPlan={handlePreviewPlan}
              />
            </TabsContent>
            
            <TabsContent value="workshop" className="p-4 pt-0">
              <WorkshopDashboard
                yardState={yardState}
                recommendations={recommendations}
                onAssignToWorkshop={handleAssignToWorkshop}
                onCompleteRepair={handleCompleteRepair}
              />
            </TabsContent>
            
            <TabsContent value="siding" className="p-4 pt-0">
              <SidingManager
                yardState={yardState}
                onRemoveTrain={handleRemoveTrain}
                onMoveTrain={handleMoveTrain}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Selected Train/Node Info Modal */}
      {(selectedTrain || selectedNode) && (
        <div className="fixed bottom-4 right-4 w-80">
          <Card className="shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {selectedTrain ? `Train ${yardState.trains[selectedTrain]?.number}` : `Node ${selectedNode}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {selectedTrain && yardState.trains[selectedTrain] && (
                <div className="space-y-2 text-sm">
                  <div>Status: <Badge variant="outline">{yardState.trains[selectedTrain].status}</Badge></div>
                  <div>Location: {yardState.trains[selectedTrain].locationNodeId}</div>
                  <div>Fitness: {yardState.trains[selectedTrain].fitness}%</div>
                  <div>Mileage: {yardState.trains[selectedTrain].mileage.toLocaleString()} km</div>
                  {yardState.trains[selectedTrain].failures.length > 0 && (
                    <div>Issues: {yardState.trains[selectedTrain].failures.join(', ')}</div>
                  )}
                </div>
              )}
              
              {selectedNode && (
                <div className="space-y-2 text-sm">
                  <div>Type: {yardDefinition.nodes[selectedNode]?.type}</div>
                  <div>Connections: {yardDefinition.nodes[selectedNode]?.connections.length}</div>
                </div>
              )}
              
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                onClick={() => {
                  setSelectedTrain(null);
                  setSelectedNode(null);
                }}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default YardControlSystem;