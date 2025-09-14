import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useApplicationContext } from '@/contexts/ApplicationContext';
import { MapPin, Sprout, Wind, Cog, Puzzle } from 'lucide-react';

const getApplicationIcon = (type: string) => {
  switch (type) {
    case 'geotracking':
      return <MapPin className="h-4 w-4" />;
    case 'agriculture':
      return <Sprout className="h-4 w-4" />;
    case 'environmental':
      return <Wind className="h-4 w-4" />;
    case 'industrial':
      return <Cog className="h-4 w-4" />;
    default:
      return <Puzzle className="h-4 w-4" />;
  }
};

const getApplicationColor = (type: string) => {
  switch (type) {
    case 'geotracking':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'agriculture':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'environmental':
      return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300';
    case 'industrial':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
    default:
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
  }
};

export const ApplicationSelector = () => {
  const { currentProfile, setCurrentProfile, sensorProfiles, loading } = useApplicationContext();

  if (loading || sensorProfiles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">Application:</span>
      <Select
        value={currentProfile?.id || ''}
        onValueChange={(value) => {
          const profile = sensorProfiles.find(p => p.id === value);
          setCurrentProfile(profile || null);
        }}
      >
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="Select application type">
            {currentProfile && (
              <div className="flex items-center gap-2">
                {getApplicationIcon(currentProfile.application_type)}
                <span>{currentProfile.name}</span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getApplicationColor(currentProfile.application_type)}`}
                >
                  {currentProfile.application_type}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sensorProfiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center gap-2 py-1">
                {getApplicationIcon(profile.application_type)}
                <div className="flex flex-col">
                  <span className="font-medium">{profile.name}</span>
                  {profile.description && (
                    <span className="text-xs text-muted-foreground">{profile.description}</span>
                  )}
                </div>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ml-auto ${getApplicationColor(profile.application_type)}`}
                >
                  {profile.application_type}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};