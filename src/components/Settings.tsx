import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Database, Send } from 'lucide-react';
import DataTypeSelector from './DataTypeSelector';
import DataForwardingConfig from './DataForwardingConfig';

const Settings: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="data-types" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="data-types" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data Types
          </TabsTrigger>
          <TabsTrigger value="forwarding" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Data Forwarding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data-types" className="space-y-4">
          <DataTypeSelector />
        </TabsContent>

        <TabsContent value="forwarding" className="space-y-4">
          <DataForwardingConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;