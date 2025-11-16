# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the frontend for an IoT Device Tracking system built with Vite, React, TypeScript, and Supabase. The application provides a dashboard for monitoring IoT devices with NB-IoT connectivity, tracking their activity, power consumption, sensor data, and reboot events.

## Development Commands

```bash
# Start development server (runs on localhost:8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Tech Stack & Key Dependencies

- **Frontend**: Vite + React + TypeScript
- **UI Components**: shadcn-ui with Radix UI primitives
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form with Zod validation
- **Maps**: Leaflet with marker clustering
- **Charts**: Recharts

## Architecture Overview

### Database Schema
The application connects to a Supabase database with these core tables:
- `device_config`: Master device information (devid, name, versions, last_seen, battery, temperature, sensor_type)
- `activity`: Power consumption tracking per uplink message (sleep, modem, GNSS, WiFi durations)
- `reboot`: Device restart/crash event logging with file/line information
- `sensor_data`: Flexible JSONB storage for various sensor types
- `locations`: Dedicated location table with lat/lng coordinates and accuracy
- `profiles`: User profile information linked to Supabase Auth
- `user_roles`: Role-based access control (admin, moderator, developer, user)
- `device_access`: User-to-device access permissions

### Authentication & Authorization
- Supabase Auth with email/password
- Role-based access via `user_roles` table
- Row Level Security (RLS) policies enforced
- AuthProvider context manages auth state

### Key Components Structure

```
src/
├── pages/
│   ├── Auth.tsx           # Login/signup page
│   ├── Dashboard.tsx      # Main app layout with sidebar
│   ├── Index.tsx          # Landing/redirect logic
│   └── NotFound.tsx       # 404 error page
├── components/
│   ├── DeviceList.tsx     # Device overview table
│   ├── MapView.tsx        # Leaflet map with device locations
│   ├── DeviceLogViewer.tsx # Activity/sensor data logs
│   ├── UserManagement.tsx  # Admin user role management
│   └── ui/                # shadcn-ui components
├── integrations/supabase/
│   ├── client.ts          # Supabase client configuration
│   └── types.ts           # Auto-generated database types
├── hooks/
│   ├── useAuth.tsx        # Authentication logic
│   └── useUserRole.tsx    # Role checking utilities
└── contexts/
    └── LayoutContext.tsx  # Sidebar state management
```

### Routing Structure
- `/auth` - Authentication (redirects to `/` if logged in)
- `/` - Protected dashboard (redirects to `/auth` if not logged in)
- `/*` - 404 Not Found page

### Data Flow
1. Device data flows from IoT devices → Supabase → React Query → Components
2. Real-time updates via Supabase subscriptions where needed
3. Power consumption and sensor data visualized through charts and maps
4. Device locations plotted on Leaflet map with clustering

### Key Features
- **Device Monitoring**: Real-time device status, last seen timestamps
- **Power Analytics**: Track sleep, modem, GNSS, WiFi power consumption
- **Mapping**: WiFi-based device positioning with marker clusters
- **Log Viewing**: Browse activity, reboot, and sensor data
- **User Management**: Admin interface for managing user roles
- **Responsive Design**: Mobile-friendly sidebar layout

## Database Integration Notes

The frontend expects specific database table structures as defined in `public.sql`:
- Device identification via `devid` string primary key
- All tables use UUID primary keys (except device_config which uses devid)
- Power metrics stored as integers representing seconds (sleep, modem, gnss, wifi, other)
- Sensor data stored as JSONB with `data_type` field for filtering
- Location data in dedicated `locations` table with lat/lng coordinates
- Automatic `last_seen` updates via database triggers
- Row Level Security (RLS) policies enforce role-based access

## Development Tips

- Use the existing shadcn-ui components from `components/ui/`
- Follow the established pattern of hooks for data fetching with React Query
- Maintain consistency with the existing Tailwind CSS classes
- Respect the role-based access patterns established in the codebase
- Database types are auto-generated in `integrations/supabase/types.ts`