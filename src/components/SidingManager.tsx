import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { YardState } from '@/types/yard';
import { Train as TrainIcon, Clock, AlertTriangle, Move, Trash2 } from 'lucide-react';

interface SidingManagerProps {
  yardState: YardState;
  onRemoveTrain: (trainId: string) => void;
  onMoveTrain: (trainId: string, targetSlotId: string) => void;
  className?: string;
}

const SidingManager: React.FC<SidingManagerProps> = ({
  yardState,
  onRemoveTrain,
  onMoveTrain,
  className = ''
}) => {
  const [selectedSiding, setSelectedSiding] = useState<number | null>(null);

  // Group siding slots by siding number
  const sidingGroups = Object.values(yardState.sidingSlots).reduce((groups, slot) => {
    const sidingNum = parseInt(slot.sidingId.substring(1));
    if (!groups[sidingNum]) {
      groups[sidingNum] = { a: null, b: null };
    }
    groups[sidingNum][slot.slot] = slot;
    return groups;
  }, {} as Record<number, { a: any; b: any }>);

  const getTrainAtSlot = (slotId: string) => {
    const slot = yardState.sidingSlots[slotId];
    return slot?.occupiedBy ? yardState.trains[slot.occupiedBy] : null;
  };

  const formatDuration = (timestamp: number): string => {
    const hours = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60));
    const minutes = Math.floor((Date.now() - timestamp) / (1000 * 60)) % 60;
    return `${hours}h ${minutes}m`;
  };

  const getSidingUtilization = () => {
    const totalSlots = Object.keys(yardState.sidingSlots).length;
    const occupiedSlots = Object.values(yardState.sidingSlots).filter(slot => slot.occupiedBy).length;
    return Math.round((occupiedSlots / totalSlots) * 100);
  };

  const getBlockingTrains = () => {
    const blockingTrains: string[] = [];
    
    Object.entries(sidingGroups).forEach(([sidingNum, siding]) => {
      const slotA = siding.a;
      const slotB = siding.b;
      
      if (slotA?.occupiedBy && slotB?.occupiedBy) {
        // If both slots occupied, 'a' is potentially blocking 'b'
        const trainA = yardState.trains[slotA.occupiedBy];
        const trainB = yardState.trains[slotB.occupiedBy];
        
        if (trainB?.departSoon && !trainA?.departSoon) {
          blockingTrains.push(slotA.occupiedBy);
        }
      }
    });
    
    return blockingTrains;
  };

  const blockingTrains = getBlockingTrains();

  const SidingSlotCard: React.FC<{ 
    slot: any; 
    train: any; 
    sidingNum: number; 
    isBlocking?: boolean;
  }> = ({ slot, train, sidingNum, isBlocking = false }) => {
    if (!train) {
      return (
        <Card className="border-dashed border-muted h-20 flex items-center justify-center">
          <span className="text-muted-foreground text-sm">Empty</span>
        </Card>
      );
    }

    return (
      <Card className={`h-20 ${isBlocking ? 'border-warning bg-warning/5' : 'border-primary/20'}`}>
        <CardContent className="p-2">
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium text-sm">{train.number}</div>
            <div className="flex gap-1">
              {train.priority && (
                <Badge variant="outline" className="text-xs">
                  <AlertTriangle className="h-2 w-2 mr-1" />
                  Priority
                </Badge>
              )}
              {train.departSoon && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-2 w-2 mr-1" />
                  Depart Soon
                </Badge>
              )}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground mb-2">
            Parked: {formatDuration(train.lastUpdated)}
          </div>
          
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="text-xs px-2 py-1 h-6"
              onClick={() => onMoveTrain(train.id, 'preview')}
            >
              <Move className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs px-2 py-1 h-6"
              onClick={() => onRemoveTrain(train.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          
          {isBlocking && (
            <div className="mt-1 text-xs text-warning flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Blocking departure
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Siding Overview */}
      <Card className="bg-gradient-control shadow-control">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrainIcon className="h-5 w-5 text-primary" />
            Siding Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {getSidingUtilization()}%
              </div>
              <div className="text-sm text-muted-foreground">Utilization</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {Object.values(yardState.sidingSlots).filter(s => !s.occupiedBy).length}
              </div>
              <div className="text-sm text-muted-foreground">Free Slots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {blockingTrains.length}
              </div>
              <div className="text-sm text-muted-foreground">Blocking</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {Object.values(yardState.trains).filter(t => t.departSoon && t.status === 'parked').length}
              </div>
              <div className="text-sm text-muted-foreground">Depart Soon</div>
            </div>
          </div>
          
          {blockingTrains.length > 0 && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="font-medium">
                  {blockingTrains.length} train(s) potentially blocking departures
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Siding Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Siding Layout (S1-S12)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-4">
            {Object.entries(sidingGroups)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([sidingNum, siding]) => {
                const trainA = siding.a?.occupiedBy ? yardState.trains[siding.a.occupiedBy] : null;
                const trainB = siding.b?.occupiedBy ? yardState.trains[siding.b.occupiedBy] : null;
                const isABlocking = blockingTrains.includes(siding.a?.occupiedBy);

                return (
                  <Card key={sidingNum} className="border-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-center">S{sidingNum}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Slot A (Front)</div>
                        <SidingSlotCard
                          slot={siding.a}
                          train={trainA}
                          sidingNum={parseInt(sidingNum)}
                          isBlocking={isABlocking}
                        />
                      </div>
                      
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Slot B (Rear)</div>
                        <SidingSlotCard
                          slot={siding.b}
                          train={trainB}
                          sidingNum={parseInt(sidingNum)}
                        />
                      </div>
                      
                      <div className="text-xs text-center text-muted-foreground">
                        Reverse Cost: {siding.a?.reverseCost || 'N/A'}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <Button variant="outline" className="flex flex-col h-20 gap-2">
              <Move className="h-6 w-6" />
              <span className="text-sm">Optimize Layout</span>
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex flex-col h-20 gap-2">
                  <Clock className="h-6 w-6" />
                  <span className="text-sm">Departure Queue</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Departure Queue</DialogTitle>
                </DialogHeader>
                <div className="space-y-2">
                  {Object.values(yardState.trains)
                    .filter(train => train.departSoon && train.status === 'parked')
                    .map(train => (
                      <div key={train.id} className="flex items-center justify-between p-2 border rounded">
                        <span>{train.number}</span>
                        <Button size="sm" onClick={() => onRemoveTrain(train.id)}>
                          Prepare for Departure
                        </Button>
                      </div>
                    ))}
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" className="flex flex-col h-20 gap-2">
              <AlertTriangle className="h-6 w-6" />
              <span className="text-sm">Resolve Conflicts</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SidingManager;