import { Injectable } from '@angular/core';
import { Process, SchedulerResult, GanttBlock, QueueSnapshot, SchedulerStats } from '../models/process.model';
import { 
  CustomSchedulerPolicy, 
  SchedulerRule, 
  SchedulerCondition, 
  SchedulerAction,
  ComparisonOperator 
} from '../models/custom-scheduler.model';
import { niceToWeight } from '../utils/helpers';

@Injectable({
  providedIn: 'root'
})
export class CustomSchedulerService {

  runSimulation(
    inputProcesses: Process[], 
    policy: CustomSchedulerPolicy,
    contextSwitchOverhead: number = 1
  ): SchedulerResult {
    const processes = this.cloneProcesses(inputProcesses);
    const ganttBlocks = new Map<number, GanttBlock[]>();
    const cpuTimeline: (number | null)[] = [];
    const queueSnapshots: QueueSnapshot[] = [];
    
    processes.forEach(p => {
      ganttBlocks.set(p.pid, []);
    });
    
    const queueEntryTimes = new Map<number, number>();
    const orderCounter = { value: 0 };
    const queueEntryOrder = new Map<number, number>();
    
    let currentTime = 0;
    let runningPid: number | null = null;
    let readyQueue: number[] = [];
    let waitingQueue: number[] = [];
    let contextSwitchRemaining = 0;
    let totalBusyTime = 0;
    let totalContextSwitches = 0;
    let nextPidToSwitch: number | null = null;
    
    let currentRunStartTime = 0;
    
    const maxSteps = 10000;
    let steps = 0;
    
    while (steps < maxSteps) {
      steps++;
      
      this.checkArrivals(processes, readyQueue, currentTime, queueEntryTimes, queueEntryOrder, orderCounter);
      
      if (contextSwitchRemaining > 0) {
        contextSwitchRemaining--;
        cpuTimeline.push(null);
        this.takeSnapshot(queueSnapshots, currentTime, readyQueue, waitingQueue, null);
        currentTime++;
        
        if (contextSwitchRemaining === 0 && nextPidToSwitch !== null) {
          runningPid = nextPidToSwitch;
          nextPidToSwitch = null;
          currentRunStartTime = currentTime;
          const proc = processes.get(runningPid)!;
          proc.status = 'running';
          queueEntryTimes.delete(runningPid);
          queueEntryOrder.delete(runningPid);
          if (!proc.hasStarted) {
            proc.hasStarted = true;
            proc.firstResponseTime = currentTime;
            proc.startTime = currentTime;
          }
        }
        continue;
      }
      
      const shouldPreempt = this.checkPreemptionWithRules(
        processes, runningPid, readyQueue, policy.rules, currentTime, currentRunStartTime, queueEntryTimes, queueEntryOrder
      );
      
      if (shouldPreempt && runningPid !== null) {
        const proc = processes.get(runningPid)!;
        proc.status = 'ready';
        readyQueue.push(runningPid);
        queueEntryTimes.set(runningPid, currentTime);
        queueEntryOrder.set(runningPid, orderCounter.value++);
        runningPid = null;
        
        if (contextSwitchOverhead > 0) {
          contextSwitchRemaining = contextSwitchOverhead;
          totalContextSwitches++;
          cpuTimeline.push(null);
          this.takeSnapshot(queueSnapshots, currentTime, readyQueue, waitingQueue, null);
          currentTime++;
          continue;
        }
      }
      
      if (runningPid === null) {
        const selected = this.selectNextProcessWithRules(
          processes, readyQueue, policy.rules, currentTime, queueEntryTimes, queueEntryOrder
        );
        
        if (selected !== null) {
          runningPid = selected;
          
          const idx = readyQueue.indexOf(runningPid);
          if (idx > -1) {
            readyQueue.splice(idx, 1);
          }
          queueEntryTimes.delete(runningPid);
          queueEntryOrder.delete(runningPid);
          
          const proc = processes.get(runningPid)!;
          proc.status = 'running';
          if (!proc.hasStarted) {
            proc.hasStarted = true;
            proc.firstResponseTime = currentTime;
            proc.startTime = currentTime;
          }
          
          currentRunStartTime = currentTime;
        }
      }
      
      const snapshotRunning = runningPid;
      
      if (runningPid !== null) {
        const proc = processes.get(runningPid)!;
        proc.remainingCpu--;
        totalBusyTime++;
        cpuTimeline.push(runningPid);
        
        proc.cpuExecutedInSlice++;
        
        if (this.shouldTriggerIo(proc, currentTime)) {
          proc.remainingIo = proc.ioBurst;
          proc.status = 'waiting';
          proc.cpuExecutedInSlice = 0;
          waitingQueue.push(runningPid);
          queueEntryTimes.delete(runningPid);
          queueEntryOrder.delete(runningPid);
          
          runningPid = null;
          if (contextSwitchOverhead > 0) {
            contextSwitchRemaining = contextSwitchOverhead;
            totalContextSwitches++;
          }
        } else if (proc.remainingCpu <= 0) {
          proc.status = 'completed';
          proc.completionTime = currentTime + 1;
          proc.turnaroundTime = proc.completionTime - proc.arrivalTime;
          queueEntryTimes.delete(runningPid);
          queueEntryOrder.delete(runningPid);
          
          runningPid = null;
          if (contextSwitchOverhead > 0) {
            contextSwitchRemaining = contextSwitchOverhead;
            totalContextSwitches++;
          }
        }
      } else {
        cpuTimeline.push(null);
      }
      
      this.updateWaitingProcesses(processes, waitingQueue, readyQueue, queueEntryTimes, queueEntryOrder, orderCounter, currentTime);
      this.updateWaitingTimes(processes, readyQueue);
      
      this.takeSnapshot(queueSnapshots, currentTime, readyQueue, waitingQueue, snapshotRunning);
      
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
  
  private checkPreemptionWithRules(
    processes: Map<number, Process>,
    runningPid: number | null,
    readyQueue: number[],
    rules: SchedulerRule[],
    currentTime: number,
    currentRunStartTime: number,
    queueEntryTimes: Map<number, number>,
    queueEntryOrder: Map<number, number>
  ): boolean {
    if (runningPid === null || readyQueue.length === 0) return false;
    
    const runningProc = processes.get(runningPid)!;
    const currentRunTime = currentTime - currentRunStartTime + 1;
    
    for (const rule of rules) {
      if (rule.enabled === false) continue;
      if (this.evaluateConditions(rule.conditions, processes, runningPid, readyQueue, currentRunTime)) {
        if (rule.action.type === 'preempt_to_tail') {
          return true;
        }
        if (rule.action.type === 'select_highest_priority' ||
            rule.action.type === 'select_shortest_remaining' ||
            rule.action.type === 'select_longest_waiting') {
          const selectedPid = this.executeSelectionAction(
            rule.action, processes, readyQueue, runningPid, currentTime, queueEntryTimes, queueEntryOrder
          );
          if (selectedPid !== null && selectedPid !== runningPid) {
            return true;
          }
        }
        if (rule.action.type === 'continue_current') {
          return false;
        }
      }
    }
    
    return false;
  }
  
  private selectNextProcessWithRules(
    processes: Map<number, Process>,
    readyQueue: number[],
    rules: SchedulerRule[],
    currentTime: number,
    queueEntryTimes: Map<number, number>,
    queueEntryOrder: Map<number, number>
  ): number | null {
    if (readyQueue.length === 0) return null;
    
    const runningPid: number | null = null;
    const currentRunTime = 0;
    
    for (const rule of rules) {
      if (rule.enabled === false) continue;
      if (this.evaluateConditions(rule.conditions, processes, runningPid, readyQueue, currentRunTime)) {
        const selectedPid = this.executeSelectionAction(
          rule.action, processes, readyQueue, runningPid, currentTime, queueEntryTimes, queueEntryOrder
        );
        if (selectedPid !== null) {
          return selectedPid;
        }
      }
    }
    
    return readyQueue[0] ?? null;
  }
  
  private evaluateConditions(
    conditions: SchedulerCondition[],
    processes: Map<number, Process>,
    runningPid: number | null,
    readyQueue: number[],
    currentRunTime: number
  ): boolean {
    if (conditions.length === 0) return false;
    
    for (const condition of conditions) {
      if (!this.evaluateSingleCondition(condition, processes, runningPid, readyQueue, currentRunTime)) {
        return false;
      }
    }
    
    return true;
  }
  
  private evaluateSingleCondition(
    condition: SchedulerCondition,
    processes: Map<number, Process>,
    runningPid: number | null,
    readyQueue: number[],
    currentRunTime: number
  ): boolean {
    switch (condition.type) {
      case 'ready_queue_length':
        return this.compareValues(readyQueue.length, condition.operator!, condition.value!);
      
      case 'current_run_time':
        if (runningPid === null) return false;
        return this.compareValues(currentRunTime, condition.operator!, condition.value!);
      
      case 'higher_priority_exists':
        if (runningPid === null || readyQueue.length === 0) return false;
        const runningPriority = processes.get(runningPid)!.priority;
        return readyQueue.some(pid => processes.get(pid)!.priority < runningPriority);
      
      case 'remaining_time':
        if (runningPid === null) return false;
        const remaining = processes.get(runningPid)!.remainingCpu;
        return this.compareValues(remaining, condition.operator!, condition.value!);
      
      case 'cpu_idle':
        return runningPid === null;
      
      default:
        return false;
    }
  }
  
  private compareValues(a: number, operator: ComparisonOperator, b: number): boolean {
    switch (operator) {
      case '>': return a > b;
      case '<': return a < b;
      case '=': return a === b;
      case '>=': return a >= b;
      case '<=': return a <= b;
      default: return false;
    }
  }
  
  private executeSelectionAction(
    action: SchedulerAction,
    processes: Map<number, Process>,
    readyQueue: number[],
    currentRunningPid: number | null,
    currentTime: number,
    queueEntryTimes: Map<number, number>,
    queueEntryOrder: Map<number, number>
  ): number | null {
    if (readyQueue.length === 0) return null;
    
    switch (action.type) {
      case 'select_highest_priority':
        return this.selectByPriority(readyQueue, processes);
      
      case 'select_shortest_remaining':
        return this.selectByShortestRemaining(readyQueue, processes);
      
      case 'select_longest_waiting':
        return this.selectByLongestWaiting(readyQueue, processes, currentTime, queueEntryTimes, queueEntryOrder);
      
      case 'preempt_to_tail':
        return readyQueue[0] ?? null;
      
      case 'continue_current':
        return currentRunningPid;
      
      default:
        return readyQueue[0] ?? null;
    }
  }
  
  private selectByPriority(readyQueue: number[], processes: Map<number, Process>): number | null {
    if (readyQueue.length === 0) return null;
    
    let bestPid = readyQueue[0];
    let bestPriority = processes.get(bestPid)!.priority;
    
    for (const pid of readyQueue) {
      const p = processes.get(pid)!;
      if (p.priority < bestPriority || (p.priority === bestPriority && pid < bestPid)) {
        bestPriority = p.priority;
        bestPid = pid;
      }
    }
    
    return bestPid;
  }
  
  private selectByShortestRemaining(readyQueue: number[], processes: Map<number, Process>): number | null {
    if (readyQueue.length === 0) return null;
    
    let bestPid = readyQueue[0];
    let bestRemaining = processes.get(bestPid)!.remainingCpu;
    
    for (const pid of readyQueue) {
      const p = processes.get(pid)!;
      if (p.remainingCpu < bestRemaining || (p.remainingCpu === bestRemaining && pid < bestPid)) {
        bestRemaining = p.remainingCpu;
        bestPid = pid;
      }
    }
    
    return bestPid;
  }
  
  private selectByLongestWaiting(
    readyQueue: number[], 
    processes: Map<number, Process>,
    currentTime: number,
    queueEntryTimes: Map<number, number>,
    queueEntryOrder: Map<number, number>
  ): number | null {
    if (readyQueue.length === 0) return null;
    
    let bestPid = readyQueue[0];
    let bestEntryTime = queueEntryTimes.get(bestPid) ?? 0;
    let bestOrder = queueEntryOrder.get(bestPid) ?? 0;
    
    for (const pid of readyQueue) {
      const entryTime = queueEntryTimes.get(pid) ?? 0;
      const order = queueEntryOrder.get(pid) ?? 0;
      const pidWaitTime = currentTime - entryTime;
      const bestWaitTime = currentTime - bestEntryTime;
      if (pidWaitTime > bestWaitTime || 
          (pidWaitTime === bestWaitTime && order < bestOrder)) {
        bestEntryTime = entryTime;
        bestOrder = order;
        bestPid = pid;
      }
    }
    
    return bestPid;
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
    queueEntryTimes: Map<number, number>,
    queueEntryOrder: Map<number, number>,
    orderCounter: { value: number }
  ): void {
    processes.forEach((proc, pid) => {
      if (proc.status === 'not_arrived' && proc.arrivalTime <= currentTime) {
        proc.status = 'ready';
        readyQueue.push(pid);
        queueEntryTimes.set(pid, currentTime);
        queueEntryOrder.set(pid, orderCounter.value++);
      }
    });
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
    queueEntryTimes: Map<number, number>,
    queueEntryOrder: Map<number, number>,
    orderCounter: { value: number },
    currentTime: number
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
      
      readyQueue.push(pid);
      queueEntryTimes.set(pid, currentTime);
      queueEntryOrder.set(pid, orderCounter.value++);
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
    runningPid: number | null
  ): void {
    snapshots.push({
      time,
      readyQueue: [...readyQueue],
      waitingQueue: [...waitingQueue],
      runningPid
    });
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
