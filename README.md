# IoT Device Tracking Dashboard

A real-time web dashboard for monitoring NB-IoT connected devices. Built with React, TypeScript, and Supabase.

## Features

- **Device Monitoring**: Track device status, battery levels, temperature, and last-seen timestamps
- **Live Location Mapping**: WiFi-based device positioning with interactive Leaflet maps and marker clustering
- **Power Analytics**: Visualize power consumption across sleep, modem, GNSS, and WiFi components
- **Activity Logs**: Browse device activity, sensor data, and reboot events with filtering
- **User Management**: Role-based access control (admin, moderator, developer, user)
- **Real-time Updates**: Live data synchronization via Supabase subscriptions

## Tech Stack

- **Frontend**: Vite + React 18 + TypeScript
- **UI**: shadcn-ui components, Tailwind CSS, Radix UI primitives
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **State**: TanStack Query (React Query)
- **Maps**: Leaflet with marker clustering
- **Charts**: Recharts for data visualization
- **Auth**: Supabase Auth with role-based permissions

## Development

```bash
# Install dependencies
npm install

# Start development server (localhost:8080)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Architecture

```
IoT Devices → CoAP Server → Supabase PostgreSQL → React Dashboard
```

### Key Components

- `Dashboard.tsx`: Main application layout with navigation
- `DeviceList.tsx`: Device overview with status table
- `MapView.tsx`: Interactive map showing device locations
- `DeviceLogViewer.tsx`: Activity and sensor data logs
- `UserManagement.tsx`: Admin interface for role management

### Database Tables

- `device_config`: Device information, versions, heartbeat, battery, temperature
- `activity`: Power consumption per uplink message
- `reboot`: Device restart/crash events with diagnostics
- `sensor_data`: Flexible JSONB storage for sensor readings
- `locations`: Device location data with coordinates and accuracy
- `profiles` & `user_roles`: Authentication and authorization
- `device_access`: User-device access permissions

## Environment Setup

Requires a Supabase project with the database schema deployed. Configure Supabase credentials in the environment.

## Deployment

Deploy via [Lovable](https://lovable.dev/projects/458a931f-d2bc-422b-b5b4-33cb24cd5b10) by clicking Share → Publish.
