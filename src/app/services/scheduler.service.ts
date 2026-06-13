import { Injectable } from '@angular/core';
import { Process, AlgorithmConfig, SchedulerResult, GanttBlock, QueueSnapshot, SchedulerStats } from '../models/process.model';
import { niceToWeight } from '../utils/helpers';

@Injectable({
  providedIn: 'root'
})
export class SchedulerService {

  runSimulation(inputProcesses: Process[], config: AlgorithmConfig): SchedulerResult {
    const processes = this.cloneProcesses(inputProcesses);
    const ganttBlocks = new Map<number, GanttBlock[]>();
    const cpuTimeline: (number | null)[] = [];
    const queueSnapshots: QueueSnapshot[] = [];
    
    processes.forEach(p => {
      ganttBlocks.set(p.pid, []);
    });
    
    const contextSwitchOverhead = config.contextSwitchOverhead ?? 1;
    
    let currentTime = 0;
    let runningPid: number | null = null;
    let readyQueue: number[] = [];
    let waitingQueue: number[] = [];
    let contextSwitchRemaining = 0;
    let totalBusyTime = 0;
    let totalContextSwitches = 0;
    let nextPidToSwitch: number | null = null;
    
    let mlfqQueues: number[][] = [];
    let mlfqBoostCounter = 0;
    
    let cfsReadyList: number[] = [];
    
    if (config.type === 'mlfq') {
      const levels = config.mlfqLevels ?? 3;
      mlfqQueues = Array.from({ length: levels }, () => []);
    }
    
    const sortedPids = Array.from(processes.keys()).sort((a, b) => a - b);
    
    const maxSteps = 10000;
    let steps = 0;
    
    while (steps < maxSteps) {
      steps++;
      
      this.checkArrivals(processes, readyQueue, currentTime, config, mlfqQueues, cfsReadyList);
      
      if (contextSwitchRemaining > 0) {
        contextSwitchRemaining--;
        cpuTimeline.push(null);
        this.takeSnapshot(queueSnapshots, currentTime, readyQueue, waitingQueue, null, mlfqQueues, cfsReadyList, config);
        currentTime++;
        
        if (contextSwitchRemaining === 0 && nextPidToSwitch !== null) {
          runningPid = nextPidToSwitch;
          nextPidToSwitch = null;
          const proc = processes.get(runningPid)!;
          proc.status = 'running';
          if (!proc.hasStarted) {
            proc.hasStarted = true;
            proc.firstResponseTime = currentTime;
            proc.startTime = currentTime;
          }
        }
        continue;
      }
      
      const shouldPreempt = this.checkPreemption(processes, runningPid, readyQueue, config, mlfqQueues, cfsReadyList, currentTime);
      
      if (shouldPreempt && runningPid !== null) {
        const proc = processes.get(runningPid)!;
        proc.status = 'ready';
        this.addToReadyQueue(readyQueue, runningPid, processes, config, mlfqQueues, cfsReadyList, true);
        runningPid = null;
        if (contextSwitchOverhead > 0) {
          contextSwitchRemaining = contextSwitchOverhead;
          totalContextSwitches++;
          cpuTimeline.push(null);
          this.takeSnapshot(queueSnapshots, currentTime, readyQueue, waitingQueue, null, mlfqQueues, cfsReadyList, config);
          currentTime++;
          continue;
        }
      }
      
      if (runningPid === null) {
        const selected = this.selectNextProcess(processes, readyQueue, config, mlfqQueues, cfsReadyList, currentTime);
        if (selected !== null) {
          runningPid = selected;
          
          this.removeFromReadyQueue(readyQueue, runningPid, config, mlfqQueues, cfsReadyList);
          
          const proc = processes.get(runningPid)!;
          proc.status = 'running';
          if (!proc.hasStarted) {
            proc.hasStarted = true;
            proc.firstResponseTime = currentTime;
            proc.startTime = currentTime;
          }
          
          if (config.type === 'rr') {
            proc.timeSliceRemaining = config.timeQuantum ?? 4;
          } else if (config.type === 'mlfq') {
            const level = proc.currentQueueLevel;
            const timeSlices = config.mlfqTimeSlices ?? [8, 16, 32];
            proc.timeSliceRemaining = timeSlices[level] ?? 8;
            proc.cpuExecutedInSlice = 0;
          }
        }
      }
      
      const snapshotRunning = runningPid;
      
      if (runningPid !== null) {
        const proc = processes.get(runningPid)!;
        proc.remainingCpu--;
        totalBusyTime++;
        cpuTimeline.push(runningPid);
        
        proc.cpuExecutedInSlice++;
        
        if (config.type === 'rr') {
          proc.timeSliceRemaining--;
        } else if (config.type === 'mlfq') {
          proc.timeSliceRemaining--;
        } else if (config.type === 'cfs') {
          proc.vruntime += 1024 / proc.weight;
        }
        
        if (this.shouldTriggerIo(proc, currentTime)) {
          proc.remainingIo = proc.ioBurst;
          proc.status = 'waiting';
          proc.cpuExecutedInSlice = 0;
          waitingQueue.push(runningPid);
          
          if (config.type === 'mlfq') {
            const levelIdx = mlfqQueues[proc.currentQueueLevel].indexOf(runningPid);
            if (levelIdx > -1) mlfqQueues[proc.currentQueueLevel].splice(levelIdx, 1);
          }
          if (config.type === 'cfs') {
            const cfsIdx = cfsReadyList.indexOf(runningPid);
            if (cfsIdx > -1) cfsReadyList.splice(cfsIdx, 1);
          }
          
          runningPid = null;
          if (contextSwitchOverhead > 0) {
            contextSwitchRemaining = contextSwitchOverhead;
            totalContextSwitches++;
          }
        } else if (proc.remainingCpu <= 0) {
          proc.status = 'completed';
          proc.completionTime = currentTime + 1;
          proc.turnaroundTime = proc.completionTime - proc.arrivalTime;
          
          if (config.type === 'mlfq') {
            const levelIdx = mlfqQueues[proc.currentQueueLevel].indexOf(runningPid);
            if (levelIdx > -1) mlfqQueues[proc.currentQueueLevel].splice(levelIdx, 1);
          }
          if (config.type === 'cfs') {
            const cfsIdx = cfsReadyList.indexOf(runningPid);
            if (cfsIdx > -1) cfsReadyList.splice(cfsIdx, 1);
          }
          
          runningPid = null;
          if (contextSwitchOverhead > 0) {
            contextSwitchRemaining = contextSwitchOverhead;
            totalContextSwitches++;
          }
        } else if (config.type === 'rr' && proc.timeSliceRemaining <= 0) {
          if (readyQueue.length > 0) {
            proc.status = 'ready';
            this.addToReadyQueue(readyQueue, runningPid, processes, config, mlfqQueues, cfsReadyList, false);
            runningPid = null;
            if (contextSwitchOverhead > 0) {
              contextSwitchRemaining = contextSwitchOverhead;
              totalContextSwitches++;
            }
          } else {
            proc.timeSliceRemaining = config.timeQuantum ?? 4;
          }
        } else if (config.type === 'mlfq' && proc.timeSliceRemaining <= 0) {
          const currentLevel = proc.currentQueueLevel;
          const maxLevel = (config.mlfqLevels ?? 3) - 1;
          const levelIdx = mlfqQueues[currentLevel].indexOf(runningPid);
          if (levelIdx > -1) mlfqQueues[currentLevel].splice(levelIdx, 1);
          
          if (currentLevel < maxLevel) {
            proc.currentQueueLevel++;
          }
          proc.status = 'ready';
          
          const newLevel = proc.currentQueueLevel;
          if (config.mlfqBottomPolicy === 'fcfs' && newLevel === maxLevel) {
            mlfqQueues[newLevel].push(runningPid);
          } else {
            mlfqQueues[newLevel].push(runningPid);
          }
          
          const rdyIdx = readyQueue.indexOf(runningPid);
          if (rdyIdx > -1) readyQueue.splice(rdyIdx, 1);
          readyQueue.push(runningPid);
          
          runningPid = null;
          if (contextSwitchOverhead > 0) {
            contextSwitchRemaining = contextSwitchOverhead;
            totalContextSwitches++;
          }
        }
      } else {
        cpuTimeline.push(null);
      }
      
      this.updateWaitingProcesses(processes, waitingQueue, readyQueue, config, mlfqQueues, cfsReadyList);
      this.updateWaitingTimes(processes, readyQueue);
      
      this.takeSnapshot(queueSnapshots, currentTime, readyQueue, waitingQueue, snapshotRunning, mlfqQueues, cfsReadyList, config);
      
      if (config.type === 'mlfq' && config.mlfqBoostInterval) {
        mlfqBoostCounter++;
        if (mlfqBoostCounter >= config.mlfqBoostInterval) {
          mlfqBoostCounter = 0;
          this.mlfqBoost(processes, mlfqQueues, readyQueue, config.mlfqLevels ?? 3);
        }
      }
      
      currentTime++;
      
      const allDone = Array.from(processes.values()).every(p => p.status === 'completed');
      if (allDone && waitingQueue.length === 0 && runningPid === null && contextSwitchRemaining === 0) {
        break;
      }
    }
    
    this.buildGanttBlocks(ganttBlocks, cpuTimeline, processes, contextSwitchOverhead);
    
    const stats = this.calculateStats(processes, totalBusyTime, currentTime, totalContextSwitches);
    
    return {
      ganttBlocks,
      cpuTimeline,
      queueSnapshots,
      processes,
      stats,
      totalTime: currentTime
    };
  }
  
  private cloneProcesses(inputProcesses: Process[]): Map<number, Process> {
    const map = new Map<number, Process>();
    inputProcesses.forEach(p => {
      const clone: Process = {
        ...p,
        remainingCpu: p.cpuBurst,
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
        weight: niceToWeight(p.nice ?? 0),
        currentQueueLevel: 0,
        timeSliceRemaining: 0,
        cpuExecutedInSlice: 0,
        lastIoTriggerTime: -1
      };
      map.set(p.pid, clone);
    });
    return map;
  }
  
  private checkArrivals(
    processes: Map<number, Process>,
    readyQueue: number[],
    currentTime: number,
    config: AlgorithmConfig,
    mlfqQueues: number[][],
    cfsReadyList: number[]
  ): void {
    processes.forEach((proc, pid) => {
      if (proc.status === 'not_arrived' && proc.arrivalTime <= currentTime) {
        proc.status = 'ready';
        this.addToReadyQueue(readyQueue, pid, processes, config, mlfqQueues, cfsReadyList, false);
        
        if (config.type === 'cfs') {
          let minVruntime = 0;
          cfsReadyList.forEach(p => {
            if (processes.get(p)!.vruntime < minVruntime) {
              minVruntime = processes.get(p)!.vruntime;
            }
          });
          proc.vruntime = minVruntime;
        }
      }
    });
  }
  
  private addToReadyQueue(
    readyQueue: number[],
    pid: number,
    processes: Map<number, Process>,
    config: AlgorithmConfig,
    mlfqQueues: number[][],
    cfsReadyList: number[],
    isPreempted: boolean
  ): void {
    const proc = processes.get(pid)!;
    
    switch (config.type) {
      case 'fcfs':
        readyQueue.push(pid);
        break;
      case 'sjf':
      case 'srtf':
        this.insertByRemainingTime(readyQueue, pid, processes);
        break;
      case 'rr':
        readyQueue.push(pid);
        break;
      case 'priority':
        this.insertByPriority(readyQueue, pid, processes, config.preemptive ?? false);
        break;
      case 'mlfq':
        const level = proc.currentQueueLevel;
        if (!mlfqQueues[level].includes(pid)) {
          mlfqQueues[level].push(pid);
        }
        if (!readyQueue.includes(pid)) {
          readyQueue.push(pid);
        }
        break;
      case 'cfs':
        if (!cfsReadyList.includes(pid)) {
          cfsReadyList.push(pid);
          cfsReadyList.sort((a, b) => processes.get(a)!.vruntime - processes.get(b)!.vruntime);
        }
        if (!readyQueue.includes(pid)) {
          readyQueue.push(pid);
        }
        break;
    }
  }
  
  private insertByRemainingTime(queue: number[], pid: number, processes: Map<number, Process>): void {
    const remaining = processes.get(pid)!.remainingCpu;
    let i = 0;
    for (; i < queue.length; i++) {
      const r = processes.get(queue[i])!.remainingCpu;
      if (remaining < r) break;
      if (remaining === r && pid < queue[i]) break;
    }
    queue.splice(i, 0, pid);
  }
  
  private insertByPriority(queue: number[], pid: number, processes: Map<number, Process>, preemptive: boolean): void {
    const priority = processes.get(pid)!.priority;
    let i = 0;
    for (; i < queue.length; i++) {
      const p = processes.get(queue[i])!.priority;
      if (priority < p) break;
      if (priority === p && pid < queue[i]) break;
    }
    queue.splice(i, 0, pid);
  }
  
  private removeFromReadyQueue(
    readyQueue: number[],
    pid: number,
    config: AlgorithmConfig,
    mlfqQueues: number[][],
    cfsReadyList: number[]
  ): void {
    const idx = readyQueue.indexOf(pid);
    if (idx > -1) {
      readyQueue.splice(idx, 1);
    }
    
    if (config.type === 'mlfq') {
      for (let i = 0; i < mlfqQueues.length; i++) {
        const mlfqIdx = mlfqQueues[i].indexOf(pid);
        if (mlfqIdx > -1) {
          mlfqQueues[i].splice(mlfqIdx, 1);
          break;
        }
      }
    }
    
    if (config.type === 'cfs') {
      const cfsIdx = cfsReadyList.indexOf(pid);
      if (cfsIdx > -1) {
        cfsReadyList.splice(cfsIdx, 1);
      }
    }
  }
  
  private checkPreemption(
    processes: Map<number, Process>,
    runningPid: number | null,
    readyQueue: number[],
    config: AlgorithmConfig,
    mlfqQueues: number[][],
    cfsReadyList: number[],
    currentTime: number
  ): boolean {
    if (runningPid === null) return false;
    
    switch (config.type) {
      case 'srtf':
        if (readyQueue.length > 0) {
          const nextPid = readyQueue[0];
          return processes.get(nextPid)!.remainingCpu < processes.get(runningPid)!.remainingCpu;
        }
        return false;
      case 'priority':
        if (config.preemptive && readyQueue.length > 0) {
          const nextPid = readyQueue[0];
          return processes.get(nextPid)!.priority < processes.get(runningPid)!.priority;
        }
        return false;
      case 'mlfq':
        const runningProc = processes.get(runningPid)!;
        const runningLevel = runningProc.currentQueueLevel;
        for (let i = 0; i < runningLevel; i++) {
          if (mlfqQueues[i].length > 0) return true;
        }
        return false;
      default:
        return false;
    }
  }
  
  private selectNextProcess(
    processes: Map<number, Process>,
    readyQueue: number[],
    config: AlgorithmConfig,
    mlfqQueues: number[][],
    cfsReadyList: number[],
    currentTime: number
  ): number | null {
    if (readyQueue.length === 0) return null;
    
    switch (config.type) {
      case 'fcfs':
      case 'sjf':
      case 'srtf':
      case 'rr':
      case 'priority':
        return readyQueue[0] ?? null;
      case 'mlfq':
        for (let i = 0; i < mlfqQueues.length; i++) {
          if (mlfqQueues[i].length > 0) {
            return mlfqQueues[i][0];
          }
        }
        return null;
      case 'cfs':
        return cfsReadyList.length > 0 ? cfsReadyList[0] : null;
      default:
        return readyQueue[0] ?? null;
    }
  }
  
  private shouldTriggerIo(proc: Process, currentTime: number): boolean {
    if (proc.ioBurst <= 0) return false;
    if (proc.remainingCpu <= 0) return false;
    
    switch (proc.ioMode) {
      case 'periodic':
        const period = proc.ioPeriod ?? 5;
        return proc.cpuExecutedInSlice > 0 && proc.cpuExecutedInSlice % period === 0;
      case 'probabilistic':
        const prob = (proc.ioProbability ?? 10) / 100;
        return Math.random() < prob;
      case 'none':
      default:
        return false;
    }
  }
  
  private updateWaitingProcesses(
    processes: Map<number, Process>,
    waitingQueue: number[],
    readyQueue: number[],
    config: AlgorithmConfig,
    mlfqQueues: number[][],
    cfsReadyList: number[]
  ): void {
    const completedIo: number[] = [];
    
    waitingQueue.forEach(pid => {
      const proc = processes.get(pid)!;
      if (proc.remainingIo > 0) {
        proc.remainingIo--;
        if (proc.remainingIo <= 0) {
          completedIo.push(pid);
        }
      }
    });
    
    completedIo.forEach(pid => {
      const idx = waitingQueue.indexOf(pid);
      if (idx > -1) waitingQueue.splice(idx, 1);
      
      const proc = processes.get(pid)!;
      proc.status = 'ready';
      proc.lastIoTriggerTime = -1;
      proc.cpuExecutedInSlice = 0;
      
      this.addToReadyQueue(readyQueue, pid, processes, config, mlfqQueues, cfsReadyList, false);
    });
  }
  
  private updateWaitingTimes(processes: Map<number, Process>, readyQueue: number[]): void {
    readyQueue.forEach(pid => {
      const proc = processes.get(pid)!;
      if (proc.status === 'ready') {
        proc.waitingTime++;
      }
    });
  }
  
  private takeSnapshot(
    snapshots: QueueSnapshot[],
    time: number,
    readyQueue: number[],
    waitingQueue: number[],
    runningPid: number | null,
    mlfqQueues: number[][],
    cfsReadyList: number[],
    config: AlgorithmConfig
  ): void {
    const snapshot: QueueSnapshot = {
      time,
      readyQueue: [...readyQueue],
      waitingQueue: [...waitingQueue],
      runningPid
    };
    
    if (config.type === 'mlfq') {
      snapshot.mlfqQueues = mlfqQueues.map(q => [...q]);
    }
    if (config.type === 'cfs') {
      snapshot.cfsTree = [...cfsReadyList];
    }
    
    snapshots.push(snapshot);
  }
  
  private mlfqBoost(
    processes: Map<number, Process>,
    mlfqQueues: number[][],
    readyQueue: number[],
    levels: number
  ): void {
    for (let i = 1; i < levels; i++) {
      while (mlfqQueues[i].length > 0) {
        const pid = mlfqQueues[i].shift()!;
        const proc = processes.get(pid)!;
        proc.currentQueueLevel = 0;
        mlfqQueues[0].push(pid);
      }
    }
  }
  
  private buildGanttBlocks(
    ganttBlocks: Map<number, GanttBlock[]>,
    cpuTimeline: (number | null)[],
    processes: Map<number, Process>,
    contextSwitchOverhead: number
  ): void {
    processes.forEach((proc, pid) => {
      const blocks: GanttBlock[] = [];
      
      if (proc.arrivalTime > 0) {
        blocks.push({
          pid,
          startTime: 0,
          endTime: proc.arrivalTime,
          status: 'not_arrived'
        });
      }
      
      const firstBlock: GanttBlock = {
        pid,
        startTime: proc.arrivalTime,
        endTime: proc.arrivalTime,
        status: 'ready'
      };
      blocks.push(firstBlock);
      
      let currentStatus: string = 'ready';
      let currentStart = proc.arrivalTime;
      
      for (let t = proc.arrivalTime; t < cpuTimeline.length; t++) {
        const cpuPid = cpuTimeline[t];
        let newStatus: string;
        
        if (cpuPid === pid) {
          newStatus = 'running';
        } else if (proc.completionTime > 0 && t >= proc.completionTime) {
          newStatus = 'completed';
        } else if (proc.remainingIo > 0 || (t >= proc.arrivalTime && t < proc.completionTime && cpuPid !== pid && this.isWaitingAtTime(proc, t))) {
          newStatus = 'waiting';
        } else if (t >= proc.arrivalTime && cpuPid !== pid) {
          newStatus = 'ready';
        } else {
          newStatus = 'not_arrived';
        }
        
        if (newStatus !== currentStatus) {
          const lastBlock = blocks[blocks.length - 1];
          lastBlock.endTime = t;
          
          blocks.push({
            pid,
            startTime: t,
            endTime: t + 1,
            status: newStatus as any
          });
          
          currentStatus = newStatus;
          currentStart = t;
        } else {
          const lastBlock = blocks[blocks.length - 1];
          lastBlock.endTime = t + 1;
        }
      }
      
      ganttBlocks.set(pid, blocks.filter(b => b.startTime < b.endTime));
    });
  }
  
  private isWaitingAtTime(proc: Process, time: number): boolean {
    if (proc.ioBurst <= 0) return false;
    if (time < proc.arrivalTime) return false;
    if (proc.completionTime > 0 && time >= proc.completionTime) return false;
    return proc.remainingIo > 0 || time % (proc.ioPeriod ?? 10) === 0;
  }
  
  private calculateStats(
    processes: Map<number, Process>,
    totalBusyTime: number,
    totalTime: number,
    contextSwitches: number
  ): SchedulerStats {
    const procs = Array.from(processes.values());
    const n = procs.length;
    
    const totalWaiting = procs.reduce((sum, p) => sum + p.waitingTime, 0);
    const totalTurnaround = procs.reduce((sum, p) => sum + p.turnaroundTime, 0);
    const totalResponse = procs.reduce((sum, p) => sum + (p.firstResponseTime >= 0 ? p.firstResponseTime - p.arrivalTime : 0), 0);
    
    return {
      avgWaitingTime: n > 0 ? totalWaiting / n : 0,
      avgTurnaroundTime: n > 0 ? totalTurnaround / n : 0,
      avgResponseTime: n > 0 ? totalResponse / n : 0,
      cpuUtilization: totalTime > 0 ? (totalBusyTime / totalTime) * 100 : 0,
      throughput: totalTime > 0 ? n / totalTime : 0,
      totalTime,
      totalBusyTime,
      contextSwitches
    };
  }
}
