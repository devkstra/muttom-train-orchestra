import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YardEvent } from '@/types/yard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Info, AlertTriangle, XCircle, CheckCircle, Filter } from 'lucide-react';

interface EventLogProps {
  events: YardEvent[];
  className?: string;
}

const EventLog: React.FC<EventLogProps> = ({ events, className = '' }) => {
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info': return <Info className="h-3 w-3 text-info" />;
      case 'warning': return <AlertTriangle className="h-3 w-3 text-warning" />;
      case 'error': return <XCircle className="h-3 w-3 text-destructive" />;
      case 'success': return <CheckCircle className="h-3 w-3 text-success" />;
      default: return <Activity className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'border-l-blue-500';
      case 'warning': return 'border-l-warning';
      case 'error': return 'border-l-destructive';
      case 'success': return 'border-l-success';
      default: return 'border-l-muted';
    }
  };

  const filteredEvents = events
    .filter(event => severityFilter === 'all' || event.severity === severityFilter)
    .filter(event => typeFilter === 'all' || event.type.startsWith(typeFilter))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 100); // Limit to last 100 events

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getEventTypeCategory = (type: string) => {
    if (type.startsWith('train:')) return 'train';
    if (type.startsWith('plan:')) return 'plan';
    if (type.startsWith('inspection:')) return 'inspection';
    if (type.startsWith('workshop:')) return 'workshop';
    if (type.startsWith('lock:')) return 'lock';
    return 'system';
  };

  const uniqueTypes = [...new Set(events.map(e => getEventTypeCategory(e.type)))];

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Event Log
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm" onClick={() => {
              setSeverityFilter('all');
              setTypeFilter('all');
            }}>
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-64">
          {filteredEvents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No events match the current filters
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEvents.map(event => (
                <div
                  key={event.id}
                  className={`p-3 border-l-4 bg-card/50 rounded-r-lg ${getSeverityColor(event.severity)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getSeverityIcon(event.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{event.message}</div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {event.type}
                          </Badge>
                          
                          {event.trainId && (
                            <Badge variant="secondary" className="text-xs">
                              {event.trainId}
                            </Badge>
                          )}
                          
                          <span className="text-xs text-muted-foreground">
                            {formatTime(event.timestamp)}
                          </span>
                        </div>
                        
                        {event.data && Object.keys(event.data).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Show details
                            </summary>
                            <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(event.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-info">
                {events.filter(e => e.severity === 'info').length}
              </div>
              <div className="text-xs text-muted-foreground">Info</div>
            </div>
            <div>
              <div className="text-lg font-bold text-warning">
                {events.filter(e => e.severity === 'warning').length}
              </div>
              <div className="text-xs text-muted-foreground">Warnings</div>
            </div>
            <div>
              <div className="text-lg font-bold text-destructive">
                {events.filter(e => e.severity === 'error').length}
              </div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
            <div>
              <div className="text-lg font-bold text-success">
                {events.filter(e => e.severity === 'success').length}
              </div>
              <div className="text-xs text-muted-foreground">Success</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventLog;