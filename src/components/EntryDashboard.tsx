import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Train, YardState } from '@/types/yard';
import { Plus, Train as TrainIcon, Clock, AlertTriangle } from 'lucide-react';

interface EntryDashboardProps {
  yardState: YardState;
  onCreateTrain: (trainData: Partial<Train>) => void;
  className?: string;
}

const EntryDashboard: React.FC<EntryDashboardProps> = ({
  yardState,
  onCreateTrain,
  className = ''
}) => {
  const [newTrain, setNewTrain] = useState({
    number: '',
    fitness: 85,
    mileage: 25000,
    priority: false,
    departSoon: false,
    failures: [] as string[]
  });

  const [failureInput, setFailureInput] = useState('');

  const handleCreateTrain = () => {
    if (!newTrain.number.trim()) {
      setNewTrain(prev => ({ ...prev, number: `T${Object.keys(yardState.trains).length + 1}` }));
    }
    
    onCreateTrain({
      ...newTrain,
      jobCard: {
        tasks: [
          { id: '1', desc: 'Pre-departure inspection', done: false },
          { id: '2', desc: 'Brake system check', done: false },
          { id: '3', desc: 'Door operation test', done: false }
        ]
      }
    });

    // Reset form
    setNewTrain({
      number: '',
      fitness: 85,
      mileage: 25000,
      priority: false,
      departSoon: false,
      failures: []
    });
    setFailureInput('');
  };

  const addFailure = () => {
    if (failureInput.trim() && !newTrain.failures.includes(failureInput.trim())) {
      setNewTrain(prev => ({
        ...prev,
        failures: [...prev.failures, failureInput.trim()]
      }));
      setFailureInput('');
    }
  };

  const removeFailure = (failure: string) => {
    setNewTrain(prev => ({
      ...prev,
      failures: prev.failures.filter(f => f !== failure)
    }));
  };

  const arrivingTrains = Object.values(yardState.trains).filter(train => 
    train.status === 'arriving' || train.status === 'queued'
  );

  const recentArrivals = Object.values(yardState.trains)
    .sort((a, b) => b.arrivalTime - a.arrivalTime)
    .slice(0, 5);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Train Creation Form */}
      <Card className="bg-gradient-control shadow-control">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Create New Train
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="trainNumber">Train Number</Label>
              <Input
                id="trainNumber"
                placeholder="Auto-generated if empty"
                value={newTrain.number}
                onChange={(e) => setNewTrain(prev => ({ ...prev, number: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="mileage">Mileage</Label>
              <Input
                id="mileage"
                type="number"
                value={newTrain.mileage}
                onChange={(e) => setNewTrain(prev => ({ ...prev, mileage: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="fitness">Fitness Score (%)</Label>
            <Input
              id="fitness"
              type="range"
              min="0"
              max="100"
              value={newTrain.fitness}
              onChange={(e) => setNewTrain(prev => ({ ...prev, fitness: parseInt(e.target.value) }))}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground mt-1">
              Current: {newTrain.fitness}%
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Switch
                id="priority"
                checked={newTrain.priority}
                onCheckedChange={(checked) => setNewTrain(prev => ({ ...prev, priority: checked }))}
              />
              <Label htmlFor="priority" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Priority Train
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="departSoon"
                checked={newTrain.departSoon}
                onCheckedChange={(checked) => setNewTrain(prev => ({ ...prev, departSoon: checked }))}
              />
              <Label htmlFor="departSoon" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                Depart Soon (Morning Ready)
              </Label>
            </div>
          </div>

          <div>
            <Label>Failures/Issues</Label>
            <div className="flex gap-2 mt-1">
              <Input
                placeholder="e.g., wheel-alignment, brake"
                value={failureInput}
                onChange={(e) => setFailureInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addFailure()}
              />
              <Button onClick={addFailure} size="sm">Add</Button>
            </div>
            
            {newTrain.failures.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newTrain.failures.map(failure => (
                  <div
                    key={failure}
                    className="bg-destructive/10 text-destructive px-2 py-1 rounded text-sm flex items-center gap-1"
                  >
                    {failure}
                    <button
                      onClick={() => removeFailure(failure)}
                      className="ml-1 text-destructive hover:text-destructive/70"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleCreateTrain} className="w-full" size="lg">
            <TrainIcon className="h-4 w-4 mr-2" />
            Create & Send to Yard
          </Button>
        </CardContent>
      </Card>

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle>Arrival Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {arrivingTrains.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No trains in queue</p>
          ) : (
            <div className="space-y-2">
              {arrivingTrains.map(train => (
                <div
                  key={train.id}
                  className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <TrainIcon className="h-4 w-4 text-train" />
                    <div>
                      <div className="font-medium">{train.number}</div>
                      <div className="text-sm text-muted-foreground">
                        Status: {train.status}
                        {train.priority && <span className="text-warning ml-2">• Priority</span>}
                        {train.departSoon && <span className="text-accent ml-2">• Depart Soon</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(train.arrivalTime).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Arrivals */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Arrivals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentArrivals.map(train => (
              <div
                key={train.id}
                className="flex items-center justify-between p-2 border-l-4 border-l-primary/20 bg-card/50"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    train.status === 'parked' ? 'bg-success' :
                    train.status === 'inspection' ? 'bg-warning' :
                    train.status === 'moving' ? 'bg-train-moving' :
                    'bg-muted'
                  }`} />
                  <span className="font-medium">{train.number}</span>
                  <span className="text-sm text-muted-foreground">{train.status}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(train.arrivalTime).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EntryDashboard;