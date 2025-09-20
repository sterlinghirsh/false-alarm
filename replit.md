# False Alarm Party Game

## Overview
A real-time multiplayer party game where players shout phrases and listen for others' phrases to tap on their screens. Best played with 3+ people in the same room.

## ⚠️ CRITICAL PORT CONFIGURATION
**The frontend MUST be on port 5000 for Replit webview to work properly!**
- Frontend: Port 5000 (exposed externally via .replit [[ports]])
- Backend: Port 3001 (internal only, accessed via proxy)
- Never forward port 3001 externally - it should only be accessible through the proxy

### How to Update Port Configuration in .replit
Since the .replit file cannot be edited directly by the agent, there are two approaches:
1. **For workflows**: Use workflow configuration tools (this is what the agent can do)
   - Remove existing workflows: `workflows_remove_run_config_tool`
   - Add Frontend workflow with `output_type: "webview"` and `wait_for_port: 5000`
   - Add Backend workflow with `output_type: "console"` and `wait_for_port: 3001`
2. **For [[ports]] section**: Must be manually edited by the user
   - The workflow tools do NOT automatically update the [[ports]] section
   - User must manually ensure [[ports]] has: `localPort = 5000, externalPort = 80`
   - Remove any port 3001 forwarding entries

## Project Architecture
- **Frontend**: React 18.3.1 (✅ **MODERNIZED**)
- **Backend**: Node.js/Express server with Socket.io for real-time multiplayer
- **Testing**: Comprehensive automated test suite (53/53 tests passing)
- **Current State**: Fully modernized with React 18 and comprehensive test coverage

## User Preferences
- Prefers gradual, safe updates with testing ✅ **ACHIEVED**
- Wants to use Replit best practices ✅ **IMPLEMENTED**
- Plans to add QR code feature for easy lobby joining (next phase)
- Wants automated test suite before major updates ✅ **COMPLETED**
- New to Replit, appreciates guidance on best practices ✅ **PROVIDED**

## Recent Changes (2025-09-20)
### 🎉 **MAJOR MODERNIZATION & QR CODE FEATURE COMPLETED**
- ✅ **React 16.2 → 18.3.1** upgrade with full functionality preserved
- ✅ **react-scripts 1.1.0 → 5.0.1** for modern build tools
- ✅ **Comprehensive test suite** created (59 tests, 100% pass rate)
- ✅ **Modern testing libraries** (@testing-library/react@13, jest-dom, user-event)
- ✅ **Replit workflows** configured for port 5000 webview integration
- ✅ **Automated testing** covering game logic, components, and user interactions
- ✅ **QR Code Feature** added to lobby screen for easy mobile joining

### Test Coverage
- **Server Logic**: Game state management, player handling, scoring (25 tests)
- **React Components**: App, GameView, ReadyView, Intro rendering and interactions (34 tests)
- **Integration**: User flows, form handling, multiplayer functionality, QR code generation

### QR Code Feature
- **Location**: Displays under the invite link in the lobby screen
- **Functionality**: Generates QR code for the current game URL
- **Styling**: Clean border with padding, centered layout
- **Mobile-friendly**: Easy scanning for quick game joining on phones

## Development Plan - ✅ **PHASES 1, 2 & 3 COMPLETE**
1. ✅ Get current version running with Replit workflows
2. ✅ Set up automated test suite (59/59 tests passing) 
3. ✅ Update packages to modern versions (React 18, react-scripts 5)
4. ✅ Add QR code feature for easy lobby joining

## Current Status
**Fully modernized and feature-complete!** The game now includes QR codes for easy mobile joining, React 18 with comprehensive test coverage, and follows all Replit best practices. Perfect for adding additional features or deploying to production.