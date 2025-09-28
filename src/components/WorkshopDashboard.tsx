import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { YardState, AssignmentRecommendation } from '@/types/yard';
import { Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface WorkshopDashboardProps {
  yardState: YardState;
  recommendations: Record<string, AssignmentRecommendation[]>;
  onAssignToWorkshop: (trainId: string, workshopId: string) => void;
  onCompleteRepair: (trainId: string) => void;
  className?: string;
}

const WorkshopDashboard: React.FC<WorkshopDashboardProps> = ({
  yardState,
  recommendations,
  onAssignToWorkshop,
  onCompleteRepair,
  className = ''
}) => {
  const workshopLines = Object.values(yardState.workshopLines);
  const failedTrains = Object.values(yardState.trains).filter(train => 
    train.failures.length > 0 && train.status === 'moving'
  );

  const getJobProgress = (trainId: string): number => {
    const train = yardState.trains[trainId];
    if (!train) return 0;
    
    const completedTasks = train.jobCard.tasks.filter(task => task.done).length;
    return train.jobCard.tasks.length > 0 ? (completedTasks / train.jobCard.tasks.length) * 100 : 0;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Workshop Status */}
      <Card className="bg-gradient-control shadow-control">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Workshop Lines Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {workshopLines.map(workshop => {
              const train = workshop.occupiedBy ? yardState.trains[workshop.occupiedBy] : null;
              const progress = train ? getJobProgress(train.id) : 0;

              return (
                <Card key={workshop.id} className={`${workshop.status === 'occupied' ? 'border-warning' : 'border-muted'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{workshop.name}</div>
                      <Badge variant={workshop.status === 'occupied' ? 'default' : 'secondary'}>
                        {workshop.status}
                      </Badge>
                    </div>
                    
                    {workshop.specialization && (
                      <div className="text-xs text-muted-foreground mb-2">
                        Specialization: {workshop.specialization}
                      </div>
                    )}
                    
                    {train ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{train.number}</span>
                          <span className="text-xs text-muted-foreground">
                            {Math.round(progress)}% complete
                          </span>
                        </div>
                        
                        <Progress value={progress} className="h-2" />
                        
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Issues:</div>
                          <div className="flex flex-wrap gap-1">
                            {train.failures.map(failure => (
                              <Badge key={failure} variant="destructive" className="text-xs">
                                {failure}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">Job Tasks:</div>
                          {train.jobCard.tasks.map(task => (
                            <div key={task.id} className="flex items-center gap-2 text-xs">
                              {task.done ? (
                                <CheckCircle className="h-3 w-3 text-success" />
                              ) : (
                                <Clock className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className={task.done ? 'line-through text-muted-foreground' : ''}>
                                {task.desc}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {progress >= 100 && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => onCompleteRepair(train.id)}
                          >
                            Complete Repair
                          </Button>
                        )}
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

      {/* Failed Trains Awaiting Workshop Assignment */}
      {failedTrains.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trains Requiring Workshop Attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {failedTrains.map(train => {
                const trainRecommendations = recommendations[train.id] || [];
                const needsWheelAlignment = train.failures.includes('wheel-alignment');

                return (
                  <div key={train.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-lg">{train.number}</div>
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Failed Inspection
                          </Badge>
                          {train.priority && (
                            <Badge variant="outline">Priority</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="text-sm text-muted-foreground mb-1">Issues Detected:</div>
                      <div className="flex flex-wrap gap-2">
                        {train.failures.map(failure => (
                          <Badge key={failure} variant="destructive">
                            {failure}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {needsWheelAlignment && (
                      <div className="mb-3 p-2 bg-warning/10 border border-warning/20 rounded">
                        <div className="flex items-center gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <span className="font-medium">Wheel alignment required - only WL-4 suitable</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        Workshop Recommendations:
                      </div>
                      <div className="grid gap-2">
                        {trainRecommendations.length > 0 ? (
                          trainRecommendations.map((rec, idx) => (
                            <Card key={rec.targetId} className="border-l-4 border-l-primary/50">
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline">#{idx + 1}</Badge>
                                    <span className="font-medium">{rec.targetId}</span>
                                    <Badge variant="secondary">Score: {rec.score}</Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() => onAssignToWorkshop(train.id, rec.targetId)}
                                  >
                                    Assign
                                  </Button>
                                </div>
                                
                                {rec.reasoning.length > 0 && (
                                  <div className="mt-2">
                                    <ul className="text-xs text-muted-foreground">
                                      {rec.reasoning.map((reason, idx) => (
                                        <li key={idx} className="flex items-center gap-1">
                                          <CheckCircle className="h-3 w-3 text-success" />
                                          {reason}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))
                        ) : (
                          <div className="text-center py-4 text-muted-foreground">
                            No workshop lines available for this train's requirements
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Alternative Actions */}
                    <div className="mt-4 pt-3 border-t">
                      <div className="text-xs text-muted-foreground mb-2">Alternative Actions:</div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Queue in SL-2
                        </Button>
                        <Button variant="outline" size="sm">
                          Temporary Siding
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workshop Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Workshop Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {workshopLines.filter(w => w.status === 'occupied').length}
              </div>
              <div className="text-sm text-muted-foreground">Lines Occupied</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {Object.values(yardState.trains).filter(t => 
                  t.status === 'workshop' && t.failures.length === 0
                ).length}
              </div>
              <div className="text-sm text-muted-foreground">Repairs Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {failedTrains.length}
              </div>
              <div className="text-sm text-muted-foreground">Awaiting Repair</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkshopDashboard;