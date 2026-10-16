/**
 * Types for PAVEMENT-PINN System
 * Physics-Informed Neural Network Road Pavement Degradation Prediction
 * & Multi-Stakeholder Edge AI Decision Support System
 */

// Public type surface. Domain files own the definitions; every consumer keeps importing
// from this barrel, so the pre-restructure import contract (src/types) is unchanged.
export * from './rbac';
export * from './road';
export * from './runtime';
export * from './reports';
export * from './simulation';
export * from './audit';
export * from './api';
export * from './engine';
