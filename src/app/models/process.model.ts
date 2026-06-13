export type ProcessStatus = 'not_arrived' | 'ready' | 'running' | 'waiting' | 'completed';

export type IoMode = 'periodic' | 'probabilistic' | 'none';

export interface Process {
  pid: number;
  name: string;
  arrivalTime: number;
  cpuBurst: number;
  ioBurst: number;
  priority: number;
  color: string;
  nice: number;
  
  ioMode: IoMode;
  ioPeriod?: number;
  ioProbability?: number;
  
  remainingCpu: number;
  remainingIo: number;
  status: ProcessStatus;
  startTime: number;
  completionTime: number;
  waitingTime: number;
  turnaroundTime: number;
  responseTime: number;
  firstResponseTime: number;
  hasStarted: boolean;
  
  vruntime: number;
  weight: number;
  
  currentQueueLevel: number;
  timeSliceRemaining: number;
  cpuExecutedInSlice: number;
  lastIoTriggerTime: number;
}

export interface GanttBlock {
  pid: number;
  startTime: number;
  endTime: number;
  status: ProcessStatus;
  label?: string;
}

export interface QueueSnapshot {
  time: number;
  readyQueue: number[];
  waitingQueue: number[];
  runningPid: number | null;
  mlfqQueues?: number[][];
  cfsTree?: number[];
}

export interface SchedulerStats {
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  cpuUtilization: number;
  throughput: number;
  totalTime: number;
  totalBusyTime: number;
  contextSwitches: number;
}

export interface SchedulerResult {
  ganttBlocks: Map<number, GanttBlock[]>;
  cpuTimeline: (number | null)[];
  queueSnapshots: QueueSnapshot[];
  processes: Map<number, Process>;
  stats: SchedulerStats;
  totalTime: number;
}

export type AlgorithmType = 'fcfs' | 'sjf' | 'srtf' | 'rr' | 'priority' | 'mlfq' | 'cfs';

export interface AlgorithmConfig {
  type: AlgorithmType;
  name: string;
  
  timeQuantum?: number;
  preemptive?: boolean;
  
  mlfqLevels?: number;
  mlfqTimeSlices?: number[];
  mlfqBoostInterval?: number;
  mlfqBottomPolicy?: 'fcfs' | 'rr';
  
  cfsMinGranularity?: number;
  cfsLatency?: number;
  
  contextSwitchOverhead?: number;
}
