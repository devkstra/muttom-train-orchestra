import React, { useState, useEffect } from 'react';
import YardControlSystem from '@/components/YardControlSystem';
import { YardDefinition } from '@/types/yard';

const Index = () => {
  const [yardDefinition, setYardDefinition] = useState<YardDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load yard definition
    fetch('/yardDefinition.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to load yard definition');
        }
        return response.json();
      })
      .then((data: YardDefinition) => {
        setYardDefinition(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Yard System</h2>
          <p className="text-muted-foreground">Initializing Kochi Metro Muttom Yard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-destructive">System Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!yardDefinition) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Yard Definition</h2>
          <p className="text-muted-foreground">Unable to load yard configuration.</p>
        </div>
      </div>
    );
  }

  return <YardControlSystem yardDefinition={yardDefinition} />;
};

export default Index;
