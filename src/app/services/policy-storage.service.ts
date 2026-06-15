import { Injectable } from '@angular/core';
import { CustomSchedulerPolicy, generatePolicyId } from '../models/custom-scheduler.model';

const STORAGE_KEY = 'custom_scheduler_policies';

@Injectable({
  providedIn: 'root'
})
export class PolicyStorageService {

  constructor() { }

  getAllPolicies(): CustomSchedulerPolicy[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load policies from localStorage', e);
    }
    return [];
  }

  getPolicy(id: string): CustomSchedulerPolicy | null {
    const policies = this.getAllPolicies();
    return policies.find(p => p.id === id) || null;
  }

  savePolicy(policy: CustomSchedulerPolicy): CustomSchedulerPolicy {
    const policies = this.getAllPolicies();
    const now = Date.now();
    
    if (policy.id) {
      const idx = policies.findIndex(p => p.id === policy.id);
      if (idx > -1) {
        policies[idx] = {
          ...policy,
          updatedAt: now
        };
      } else {
        policy.createdAt = now;
        policy.updatedAt = now;
        policies.push(policy);
      }
    } else {
      policy.id = generatePolicyId();
      policy.createdAt = now;
      policy.updatedAt = now;
      policies.push(policy);
    }
    
    this.saveToStorage(policies);
    return policy;
  }

  deletePolicy(id: string): void {
    const policies = this.getAllPolicies();
    const filtered = policies.filter(p => p.id !== id);
    this.saveToStorage(filtered);
  }

  private saveToStorage(policies: CustomSchedulerPolicy[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(policies));
    } catch (e) {
      console.error('Failed to save policies to localStorage', e);
    }
  }
}
