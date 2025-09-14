import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit, Plus, Send, Settings } from 'lucide-react';
import { useDataForwarding, ForwardingEndpoint } from '@/hooks/useDataForwarding';
import { useDataTypeSelection } from '@/hooks/useDataTypeSelection';

const DataForwardingConfig: React.FC = () => {
  const { endpoints, addEndpoint, updateEndpoint, deleteEndpoint } = useDataForwarding();
  const { availableDataTypes } = useDataTypeSelection();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<ForwardingEndpoint | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'POST' as 'POST' | 'PUT' | 'PATCH',
    dataTypes: [] as string[],
    headers: '',
    enabled: true
  });

  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      method: 'POST',
      dataTypes: [],
      headers: '',
      enabled: true
    });
    setEditingEndpoint(null);
  };

  const handleOpenDialog = (endpoint?: ForwardingEndpoint) => {
    if (endpoint) {
      setEditingEndpoint(endpoint);
      setFormData({
        name: endpoint.name,
        url: endpoint.url,
        method: endpoint.method,
        dataTypes: endpoint.dataTypes,
        headers: JSON.stringify(endpoint.headers || {}, null, 2),
        enabled: endpoint.enabled
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.url) return;

    let headers = {};
    try {
      if (formData.headers.trim()) {
        headers = JSON.parse(formData.headers);
      }
    } catch (error) {
      console.error('Invalid JSON in headers');
      return;
    }

    const endpointData = {
      name: formData.name,
      url: formData.url,
      method: formData.method,
      dataTypes: formData.dataTypes,
      headers,
      enabled: formData.enabled
    };

    if (editingEndpoint) {
      updateEndpoint(editingEndpoint.id, endpointData);
    } else {
      addEndpoint(endpointData);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDataTypeToggle = (dataType: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      dataTypes: checked 
        ? [...prev.dataTypes, dataType]
        : prev.dataTypes.filter(dt => dt !== dataType)
    }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <CardTitle>Data Forwarding</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Endpoint
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingEndpoint ? 'Edit' : 'Add'} Forwarding Endpoint
                </DialogTitle>
                <DialogDescription>
                  Configure an endpoint to forward selected sensor data
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Endpoint Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My API Endpoint"
                    />
                  </div>
                  <div>
                    <Label htmlFor="method">HTTP Method</Label>
                    <Select value={formData.method} onValueChange={(value) => setFormData(prev => ({ ...prev, method: value as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="PUT">PUT</SelectItem>
                        <SelectItem value="PATCH">PATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="url">Endpoint URL</Label>
                  <Input
                    id="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://api.example.com/webhook"
                  />
                </div>

                <div>
                  <Label>Data Types to Forward</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {availableDataTypes.map(dataType => (
                      <div key={dataType} className="flex items-center space-x-2">
                        <Checkbox
                          id={`datatype-${dataType}`}
                          checked={formData.dataTypes.includes(dataType)}
                          onCheckedChange={(checked) => handleDataTypeToggle(dataType, checked as boolean)}
                        />
                        <Label htmlFor={`datatype-${dataType}`} className="text-sm font-mono">
                          {dataType}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="headers">Custom Headers (JSON)</Label>
                  <Textarea
                    id="headers"
                    value={formData.headers}
                    onChange={(e) => setFormData(prev => ({ ...prev, headers: e.target.value }))}
                    placeholder={`{\n  "Authorization": "Bearer your-token",\n  "X-API-Key": "your-key"\n}`}
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={formData.enabled}
                    onCheckedChange={(enabled) => setFormData(prev => ({ ...prev, enabled }))}
                  />
                  <Label htmlFor="enabled">Enable this endpoint</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit}>
                    {editingEndpoint ? 'Update' : 'Add'} Endpoint
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Configure endpoints to forward sensor data automatically
        </CardDescription>
      </CardHeader>
      <CardContent>
        {endpoints.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No forwarding endpoints configured. Add one to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {endpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-background/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{endpoint.name}</h4>
                    <Badge variant={endpoint.enabled ? 'default' : 'secondary'}>
                      {endpoint.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                    <Badge variant="outline" className="font-mono text-xs">
                      {endpoint.method}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono mb-2">
                    {endpoint.url}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {endpoint.dataTypes.map(dataType => (
                      <Badge key={dataType} variant="outline" className="text-xs">
                        {dataType}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Switch
                    checked={endpoint.enabled}
                    onCheckedChange={(enabled) => updateEndpoint(endpoint.id, { enabled })}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenDialog(endpoint)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteEndpoint(endpoint.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DataForwardingConfig;