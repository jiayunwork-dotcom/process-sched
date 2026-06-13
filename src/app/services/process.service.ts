import { Injectable } from '@angular/core';
import { Process, IoMode } from '../models/process.model';
import { getColor, generateProcessName, randomInt } from '../utils/helpers';

@Injectable({
  providedIn: 'root'
})
export class ProcessService {
  private nextPid = 1;
  private processes: Process[] = [];

  constructor() {
    this.loadDefaultProcesses();
  }

  getProcesses(): Process[] {
    return [...this.processes];
  }

  setProcesses(processes: Process[]): void {
    this.processes = processes;
    this.nextPid = Math.max(...processes.map(p => p.pid), 0) + 1;
  }

  addProcess(processData: Partial<Process>): Process {
    const pid = this.nextPid++;
    const process: Process = {
      pid,
      name: generateProcessName(pid),
      arrivalTime: processData.arrivalTime ?? 0,
      cpuBurst: processData.cpuBurst ?? 10,
      ioBurst: processData.ioBurst ?? 0,
      priority: processData.priority ?? 5,
      color: processData.color ?? getColor(pid - 1),
      nice: processData.nice ?? 0,
      ioMode: processData.ioMode ?? 'none',
      ioPeriod: processData.ioPeriod ?? 5,
      ioProbability: processData.ioProbability ?? 10,
      remainingCpu: processData.cpuBurst ?? 10,
      remainingIo: 0,
      status: 'not_arrived',
      startTime: 0,
      completionTime: 0,
      waitingTime: 0,
      turnaroundTime: 0,
      responseTime: 0,
      firstResponseTime: -1,
      hasStarted: false,
      vruntime: 0,
      weight: 1024,
      currentQueueLevel: 0,
      timeSliceRemaining: 0,
      cpuExecutedInSlice: 0,
      lastIoTriggerTime: -1
    };
    this.processes.push(process);
    return process;
  }

  updateProcess(pid: number, updates: Partial<Process>): void {
    const idx = this.processes.findIndex(p => p.pid === pid);
    if (idx !== -1) {
      this.processes[idx] = { ...this.processes[idx], ...updates };
    }
  }

  removeProcess(pid: number): void {
    const idx = this.processes.findIndex(p => p.pid === pid);
    if (idx !== -1) {
      this.processes.splice(idx, 1);
    }
  }

  clearAll(): void {
    this.processes = [];
    this.nextPid = 1;
  }

  generateRandom(count: number, options?: {
    arrivalMin?: number;
    arrivalMax?: number;
    cpuMin?: number;
    cpuMax?: number;
    ioMin?: number;
    ioMax?: number;
    priorityMin?: number;
    priorityMax?: number;
  }): Process[] {
    this.clearAll();
    const opts = {
      arrivalMin: 0,
      arrivalMax: 10,
      cpuMin: 5,
      cpuMax: 30,
      ioMin: 0,
      ioMax: 10,
      priorityMin: 1,
      priorityMax: 10,
      ...options
    };

    for (let i = 0; i < count; i++) {
      const cpuBurst = randomInt(opts.cpuMin, opts.cpuMax);
      const ioBurst = randomInt(opts.ioMin, opts.ioMax);
      const hasIo = ioBurst > 0;
      
      this.addProcess({
        arrivalTime: randomInt(opts.arrivalMin, opts.arrivalMax),
        cpuBurst,
        ioBurst,
        priority: randomInt(opts.priorityMin, opts.priorityMax),
        nice: randomInt(-2, 2),
        ioMode: hasIo ? 'periodic' : 'none',
        ioPeriod: Math.max(2, Math.floor(cpuBurst / 3))
      });
    }

    return this.getProcesses();
  }

  private loadDefaultProcesses(): void {
    this.addProcess({ arrivalTime: 0, cpuBurst: 10, ioBurst: 0, priority: 3 });
    this.addProcess({ arrivalTime: 1, cpuBurst: 5, ioBurst: 3, priority: 1, ioMode: 'periodic', ioPeriod: 3 });
    this.addProcess({ arrivalTime: 3, cpuBurst: 8, ioBurst: 0, priority: 5 });
    this.addProcess({ arrivalTime: 5, cpuBurst: 15, ioBurst: 5, priority: 2, ioMode: 'periodic', ioPeriod: 5 });
  }
}
