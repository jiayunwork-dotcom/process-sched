import { AlgorithmType, Process } from './process.model';

export interface LevelGoal {
  type: 'min_avg_wait' | 'min_avg_turnaround' | 'min_avg_response' | 'max_cpu_util' | 'custom';
  targetValue: number;
  comparison: 'less_than' | 'greater_than' | 'equal';
  description: string;
}

export interface Level {
  id: number;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  
  processes: Omit<Process, 'pid' | 'color' | 'status' | 'remainingCpu' | 'remainingIo' | 
    'startTime' | 'completionTime' | 'waitingTime' | 'turnaroundTime' | 'responseTime' | 
    'firstResponseTime' | 'hasStarted' | 'vruntime' | 'weight' | 'currentQueueLevel' | 
    'timeSliceRemaining' | 'cpuExecutedInSlice' | 'lastIoTriggerTime'>[];
  
  availableAlgorithms: AlgorithmType[];
  defaultAlgorithm: AlgorithmType;
  
  adjustableParams: {
    timeQuantum?: { min: number; max: number; default: number };
    mlfqLevels?: { min: number; max: number; default: number };
    mlfqBoostInterval?: { min: number; max: number; default: number };
    cfsMinGranularity?: { min: number; max: number; default: number };
    cfsLatency?: { min: number; max: number; default: number };
    contextSwitchOverhead?: { min: number; max: number; default: number };
  };
  
  goal: LevelGoal;
  hint: string;
}
