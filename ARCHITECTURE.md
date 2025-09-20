# Development Environment Architecture Plan

## Problem Statement

The current development setup requires manual code changes between development and production environments:

- **Current Issue**: `src/client/api.js` contains hardcoded connection logic requiring manual commenting/uncommenting
- **Dev Environment**: Frontend connects to hardcoded backend port (3001) 
- **Prod Environment**: Frontend connects via same-origin (no URL specified)
- **Pain Point**: Manual code changes needed for each environment switch

### Current Problematic Code
```javascript
function getSocket() {
  const port = 3001; // Backend dev port - HARDCODED!
  const socketUrl = window.location.protocol + '//' +
   window.location.hostname + ':' + port;
  return openSocket(socketUrl);
}
//const socket = getSocket();      // Dev - manually uncommented
const socket = openSocket();       // Prod - manually commented
```

## Architecture Options Analysis

### Option 1: Single-Codebase Solution with Environment Variables ✅ CHOSEN

**Approach**: Use environment variables and CRA proxy to eliminate manual code changes

#### Development Environment
- **Frontend**: React dev server on port 5000 (Replit webview requirement)
- **Backend**: Express/Socket.io server on port 5050
- **Connection**: CRA proxy forwards `/socket.io` requests to backend
- **Socket.io**: Same-origin connection (no CORS complexity)

#### Production Environment  
- **Architecture**: Single Express server on Replit's provided PORT
- **Serves**: Static React build files + Socket.io WebSocket connections
- **Connection**: Same-origin (no CORS complexity)

#### Key Implementation Strategy
```javascript
// Clean environment-aware connection - no manual changes!
const socket = process.env.REACT_APP_SOCKET_URL 
  ? openSocket(process.env.REACT_APP_SOCKET_URL)
  : openSocket(); // Same-origin default
```

**Pros**:
- ✅ Zero manual code changes between environments
- ✅ No CORS complexity in any environment
- ✅ Single deployment to manage
- ✅ Automatic environment detection
- ✅ Hot module reloading in development
- ✅ Compatible with Socket.io v2
- ✅ Leverages CRA's built-in proxy capabilities

**Cons**:
- ❌ Frontend and backend scale together in production
- ❌ Single point of failure for both static and dynamic content

### Option 2: Two-Deployment Strategy

**Approach**: Separate Static frontend deployment and Autoscale backend deployment

#### Architecture
- **Frontend Deployment**: Static deployment serving React build files
- **Backend Deployment**: Autoscale deployment running Express/Socket.io server
- **Connection**: Cross-origin WebSocket with CORS configuration

**Pros**:
- ✅ Independent scaling of frontend and backend
- ✅ Static frontend = faster loading, better caching  
- ✅ Backend scales based on actual WebSocket load
- ✅ True separation of concerns

**Cons**:
- ❌ CORS configuration complexity
- ❌ Two separate deployments to manage
- ❌ Two URLs for users to understand
- ❌ Socket.io v2 CORS can be finicky
- ❌ More complex environment variable management

## Chosen Solution: Option 1 Implementation Plan

### Phase 1: Package Configuration Updates

#### 1.1 Update `package.json`
```json
{
  "proxy": "http://localhost:5050",
  "scripts": {
    "devfrontend": "PORT=5000 react-scripts start",
    "devbackend": "PORT=5050 nodemon src/server/server.js",
    "start": "node src/server/server.js",
    "build": "react-scripts build"
  }
}
```

#### 1.2 Update Replit Workflows
- **Frontend Dev Workflow**: `npm run devfrontend` (port 5000)
- **Backend Dev Workflow**: `npm run devbackend` (port 5050)
- **Remove**: Conflicting single-process workflows

### Phase 2: Client Code Refactoring

#### 2.1 Update `src/client/api.js`
**Before**:
```javascript
function getSocket() {
  const port = 3001;
  const socketUrl = window.location.protocol + '//' +
   window.location.hostname + ':' + port;
  return openSocket(socketUrl);
}
//const socket = getSocket();
const socket = openSocket();
```

**After**:
```javascript
// Environment-aware connection - works in dev and prod
const socket = process.env.REACT_APP_SOCKET_URL 
  ? openSocket(process.env.REACT_APP_SOCKET_URL)
  : openSocket(); // Same-origin default

// Remove old getSocket function entirely
```

### Phase 3: Server Configuration Verification

#### 3.1 Verify `src/server/server.js`
- ✅ Already respects `process.env.PORT` (line 70)
- ✅ Already serves static files from `build` directory (line 10)
- ✅ No changes needed

### Phase 4: Environment Variables (Optional)

#### 4.1 Development Environment Variables
- **Not needed** - CRA proxy handles everything automatically
- **Default behavior**: Same-origin connection works seamlessly

#### 4.2 Production Environment Variables  
- **Not needed** - Same-origin connection works seamlessly
- **Override option**: Set `REACT_APP_SOCKET_URL` for custom backend URL if needed

## Development Workflow

### Starting Development Environment
1. **Terminal 1**: `npm run devfrontend` (starts React dev server on 5000)
2. **Terminal 2**: `npm run devbackend` (starts Express server on 5050)
3. **Result**: Hot module reloading for React, automatic server restarts for backend changes

### CRA Proxy Behavior
- Requests to `/socket.io/*` automatically forwarded to `http://localhost:5050`
- WebSocket upgrade requests handled seamlessly
- No CORS headers needed
- Socket.io client connects to same-origin (port 5000) and gets proxied

## Production Deployment

### Single Express Server
- Serves static React build files from `/build` directory
- Handles Socket.io WebSocket connections on same port
- Uses Replit's provided `PORT` environment variable
- Same-origin connection eliminates CORS complexity

## Benefits of Chosen Solution

1. **Developer Experience**: Instant React hot reloading + fast backend restarts
2. **Zero Configuration**: Works out of the box in both environments
3. **No Manual Changes**: Environment automatically detected
4. **Replit Compatible**: Follows Replit best practices for port usage
5. **CORS-Free**: Same-origin in both dev and prod eliminates complexity
6. **Socket.io v2 Compatible**: No version upgrade required

## Risk Mitigation

### Development Risks
- **Port Conflicts**: Ensured frontend (5000) and backend (5050) use different ports
- **Proxy Issues**: CRA proxy is well-established and handles WebSocket upgrades

### Production Risks  
- **Single Point of Failure**: Acceptable for current scale and use case
- **Resource Scaling**: Express can handle both static files and WebSocket connections efficiently

## Success Criteria

- ✅ No manual code changes between dev and prod
- ✅ Hot module reloading works in development
- ✅ Production deployment works with single Express server
- ✅ Socket.io connections work in both environments
- ✅ No CORS errors in any scenario
- ✅ Replit webview displays correctly (port 5000 in dev)

## Future Considerations

If scaling requirements change and Option 2 becomes necessary:
- The environment variable structure is already in place
- Migration path: Set `REACT_APP_SOCKET_URL` and configure CORS
- Can split deployments without major code changes