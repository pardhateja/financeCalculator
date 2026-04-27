/**
 * Multi-Goal Planner — life-phase expense planning with per-phase inflation
 * Scaffold only (fe-001). Phase CRUD, math, allocation, and projection
 * land in fe-002, fe-003, fe-004, fe-005.
 */
RP._multigoal = {
    phases: []
};

RP.initMultiGoal = function () {
    console.log('Multi-Goal tab initialized');
};

// Run init at script-load so the scaffold is observable in the console
// without requiring app.js wiring (that's fe-002's responsibility).
RP.initMultiGoal();
