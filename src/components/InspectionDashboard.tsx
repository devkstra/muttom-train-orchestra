import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { YardState, AssignmentRecommendation } from '@/types/yard';
import { Search, Clock, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';

interface InspectionDashboardProps {
  yardState: YardState;
  recommendations: Record<string, AssignmentRecommendation[]>;
  onAssignTrain: (trainId: string, targetId: string, slot?: 'a' | 'b') => void;
  onPreviewPlan: (trainId: string, targetId: string) => void;
  className?: string;
}

const InspectionDashboard: React.FC<InspectionDashboardProps> = ({
  yardState,
  recommendations,
  onAssignTrain,
  onPreviewPlan,
  className = ''
}) => {
  const [selectedTrain, setSelectedTrain] = useState<string | null>(null);

  const inspectionBays = Object.values(yardState.inspectionBays);
  const trainsInInspection = Object.values(yardState.trains).filter(train => 
    train.status === 'inspection'
  );

  const getInspectionProgress = (trainId: string, bayId: string) => {
    const bay = yardState.inspectionBays[bayId];
    if (!bay.inspectionStartTime) return 0;
    
    const elapsed = Date.now() - bay.inspectionStartTime;
    const progress = Math.min(100, (elapsed / bay.inspectionDuration) * 100);
    return progress;
  };

  const formatTimeRemaining = (trainId: string, bayId: string) => {
    const bay = yardState.inspectionBays[bayId];
    if (!bay.inspectionStartTime) return 'Starting...';
    
    const elapsed = Date.now() - bay.inspectionStartTime;
    const remaining = Math.max(0, bay.inspectionDuration - elapsed);
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const RecommendationCard: React.FC<{ 
    recommendation: AssignmentRecommendation; 
    trainId: string;
    rank: number;
  }> = ({ recommendation, trainId, rank }) => (
    <Card className={`border-l-4 ${rank === 1 ? 'border-l-success' : rank === 2 ? 'border-l-warning' : 'border-l-muted'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant={rank === 1 ? 'default' : 'secondary'}>
              #{rank} Score: {recommendation.score}
            </Badge>
            <span className="font-medium">
              {recommendation.targetType === 'siding' ? 
                `${recommendation.targetId.replace(/[AB]$/, '')}-${recommendation.slot}` :
                recommendation.targetId
              }
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPreviewPlan(trainId, recommendation.targetId)}
            >
              <Eye className="h-3 w-3 mr-1" />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={() => onAssignTrain(trainId, recommendation.targetId, recommendation.slot)}
            >
              Assign
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm mb-2">
          <div>
            <span className="text-muted-foreground">Distance:</span> {Math.round(recommendation.distanceEstimate)}px
          </div>
          <div>
            <span className="text-muted-foreground">ETA:</span> {Math.round(recommendation.ETAToPark / 1000)}s
          </div>
          <div>
            <span className="text-muted-foreground">Reverse Cost:</span> {recommendation.reverseCost}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Risk:</span>
            <Badge variant={
              recommendation.blockingRisk === 'low' ? 'default' :
              recommendation.blockingRisk === 'medium' ? 'secondary' : 'destructive'
            }>
              {recommendation.blockingRisk}
            </Badge>
          </div>
        </div>

        {recommendation.reasoning.length > 0 && (
          <div className="mb-2">
            <div className="text-xs text-muted-foreground mb-1">Reasoning:</div>
            <ul className="text-xs space-y-1">
              {recommendation.reasoning.map((reason, idx) => (
                <li key={idx} className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-success" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {recommendation.warnings.length > 0 && (
          <div>
            <div className="text-xs text-muted-foreground mb-1">Warnings:</div>
            <ul className="text-xs space-y-1">
              {recommendation.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-warning" />
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Inspection Bay Status */}
      <Card className="bg-gradient-control shadow-control">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Inspection Bay Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {inspectionBays.map(bay => {
              const train = bay.occupiedBy ? yardState.trains[bay.occupiedBy] : null;
              const progress = train ? getInspectionProgress(train.id, bay.id) : 0;
              const timeRemaining = train ? formatTimeRemaining(train.id, bay.id) : null;

              return (
                <Card key={bay.id} className={`${bay.status === 'occupied' ? 'border-warning' : 'border-muted'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{bay.name}</div>
                      <Badge variant={bay.status === 'occupied' ? 'default' : 'secondary'}>
                        {bay.status}
                      </Badge>
                    </div>
                    
                    {train ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{train.number}</span>
                          <span className="text-xs text-muted-foreground">
                            {timeRemaining}
                          </span>
                        </div>
                        
                        <div className="w-full bg-secondary rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-1000"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs">
                          <span>Fitness: {train.fitness}%</span>
                          {train.failures.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {train.failures.length} issues
                            </Badge>
                          )}
                          {train.priority && (
                            <Badge variant="outline" className="text-xs">
                              Priority
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-sm">Available</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Inspection Results & Recommendations */}
      {trainsInInspection.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trains Awaiting Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {trainsInInspection.map(train => {
                const trainRecommendations = recommendations[train.id] || [];
                const inspectionComplete = !Object.values(yardState.inspectionBays)
                  .find(bay => bay.occupiedBy === train.id);

                if (!inspectionComplete) return null;

                return (
                  <div key={train.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-lg">{train.number}</div>
                        <div className="flex items-center gap-2">
                          {train.failures.length === 0 ? (
                            <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Passed
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              Failed
                            </Badge>
                          )}
                          {train.priority && (
                            <Badge variant="outline">Priority</Badge>
                          )}
                          {train.departSoon && (
                            <Badge variant="outline">Depart Soon</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => onAssignTrain(train.id, 'auto', undefined)}
                        >
                          Auto Assign
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button>View All Options</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Assignment Options for {train.number}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {trainRecommendations.map((rec, idx) => (
                                <RecommendationCard
                                  key={rec.targetId}
                                  recommendation={rec}
                                  trainId={train.id}
                                  rank={idx + 1}
                                />
                              ))}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Top 3 Recommendations Preview */}
                    {trainRecommendations.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground">
                          Top Recommendations:
                        </div>
                        <div className="grid gap-3">
                          {trainRecommendations.slice(0, 3).map((rec, idx) => (
                            <RecommendationCard
                              key={rec.targetId}
                              recommendation={rec}
                              trainId={train.id}
                              rank={idx + 1}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InspectionDashboard;