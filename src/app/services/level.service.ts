import { Injectable } from '@angular/core';
import { Level } from '../models/level.model';

@Injectable({
  providedIn: 'root'
})
export class LevelService {
  private levels: Level[] = [
    {
      id: 1,
      title: '初识 FCFS',
      description: '学习先来先服务调度算法的基本概念。观察进程是如何按照到达顺序依次执行的。',
      difficulty: 'easy',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 8, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 2, cpuBurst: 4, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 4, cpuBurst: 6, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['fcfs'],
      defaultAlgorithm: 'fcfs',
      adjustableParams: {
        contextSwitchOverhead: { min: 0, max: 5, default: 1 }
      },
      goal: {
        type: 'custom',
        targetValue: 0,
        comparison: 'equal',
        description: '运行模拟，观察 FCFS 调度过程'
      },
      hint: 'FCFS 按照进程到达的先后顺序执行，先到达的先执行。'
    },
    {
      id: 2,
      title: 'FCFS 与护航效应',
      description: '观察当一个长进程先到达时，后面的短进程需要等待很长时间的现象。',
      difficulty: 'easy',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 50, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 1, cpuBurst: 3, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 2, cpuBurst: 5, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['fcfs'],
      defaultAlgorithm: 'fcfs',
      adjustableParams: {},
      goal: {
        type: 'min_avg_wait',
        targetValue: 25,
        comparison: 'less_than',
        description: '观察平均等待时间（注意：FCFS 无法改变结果）'
      },
      hint: '长进程先到达会导致护航效应，后面所有短进程都要等长进程执行完。'
    },
    {
      id: 3,
      title: 'FCFS 同时到达',
      description: '当多个进程同时到达时，按添加顺序（PID 递增）入队。',
      difficulty: 'easy',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 6, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 0, cpuBurst: 4, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 0, cpuBurst: 8, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P4', arrivalTime: 0, cpuBurst: 3, ioBurst: 0, priority: 4, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['fcfs'],
      defaultAlgorithm: 'fcfs',
      adjustableParams: {},
      goal: {
        type: 'custom',
        targetValue: 0,
        comparison: 'equal',
        description: '观察同时到达时的执行顺序'
      },
      hint: '同时到达时按 PID 顺序执行，这是 FCFS 的确定性保证。'
    },
    {
      id: 4,
      title: 'SJF 最短作业优先',
      description: '学习非抢占式最短作业优先算法。比较 SJF 和 FCFS 的平均等待时间差异。',
      difficulty: 'medium',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 8, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 1, cpuBurst: 4, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 2, cpuBurst: 9, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' },
        { name: 'P4', arrivalTime: 3, cpuBurst: 5, ioBurst: 0, priority: 4, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['fcfs', 'sjf'],
      defaultAlgorithm: 'sjf',
      adjustableParams: {},
      goal: {
        type: 'min_avg_wait',
        targetValue: 7,
        comparison: 'less_than',
        description: '使用 SJF 使平均等待时间小于 7'
      },
      hint: 'SJF 总是选择剩余 CPU 时间最短的进程执行，可以有效降低平均等待时间。'
    },
    {
      id: 5,
      title: 'SRTF 抢占式 SJF',
      description: '最短剩余时间优先是抢占式的 SJF。新进程到达时如果比当前运行进程更短，会发生抢占。',
      difficulty: 'medium',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 10, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 3, cpuBurst: 4, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 6, cpuBurst: 2, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' },
        { name: 'P4', arrivalTime: 8, cpuBurst: 5, ioBurst: 0, priority: 4, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['sjf', 'srtf'],
      defaultAlgorithm: 'srtf',
      adjustableParams: {},
      goal: {
        type: 'min_avg_wait',
        targetValue: 4,
        comparison: 'less_than',
        description: '使用 SRTF 使平均等待时间小于 4'
      },
      hint: 'SRTF 在新进程到达时检查是否需要抢占，能比非抢占 SJF 进一步降低等待时间。'
    },
    {
      id: 6,
      title: 'SJF vs SRTF 对比',
      description: '使用同一组进程，对比两种算法的调度结果差异。',
      difficulty: 'medium',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 12, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 2, cpuBurst: 3, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 5, cpuBurst: 6, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' },
        { name: 'P4', arrivalTime: 9, cpuBurst: 2, ioBurst: 0, priority: 4, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['sjf', 'srtf'],
      defaultAlgorithm: 'srtf',
      adjustableParams: {},
      goal: {
        type: 'min_avg_turnaround',
        targetValue: 10,
        comparison: 'less_than',
        description: '选择合适的算法使平均周转时间小于 10'
      },
      hint: '周转时间 = 完成时间 - 到达时间。抢占式算法通常能获得更好的响应性。'
    },
    {
      id: 7,
      title: '时间片轮转 RR',
      description: '学习时间片轮转调度算法。时间片大小对性能有重要影响。',
      difficulty: 'medium',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 10, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 0, cpuBurst: 6, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 0, cpuBurst: 8, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' },
        { name: 'P4', arrivalTime: 0, cpuBurst: 4, ioBurst: 0, priority: 4, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['rr'],
      defaultAlgorithm: 'rr',
      adjustableParams: {
        timeQuantum: { min: 1, max: 20, default: 4 }
      },
      goal: {
        type: 'min_avg_response',
        targetValue: 3,
        comparison: 'less_than',
        description: '调整时间片使平均响应时间小于 3'
      },
      hint: '时间片太小会导致频繁上下文切换，太大则退化为 FCFS。响应时间 = 首次运行时间 - 到达时间。'
    },
    {
      id: 8,
      title: 'RR 时间片探索',
      description: '尝试不同的时间片大小，找到平均等待时间最小的配置。',
      difficulty: 'medium',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 15, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 1, cpuBurst: 8, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 2, cpuBurst: 12, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' },
        { name: 'P4', arrivalTime: 3, cpuBurst: 5, ioBurst: 0, priority: 4, nice: 0, ioMode: 'none' },
        { name: 'P5', arrivalTime: 4, cpuBurst: 10, ioBurst: 0, priority: 5, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['rr'],
      defaultAlgorithm: 'rr',
      adjustableParams: {
        timeQuantum: { min: 1, max: 20, default: 4 }
      },
      goal: {
        type: 'min_avg_wait',
        targetValue: 18,
        comparison: 'less_than',
        description: '找到使平均等待时间小于 18 的时间片大小'
      },
      hint: '时间片大小需要平衡上下文切换开销和响应性。试试 3-8 之间的值。'
    },
    {
      id: 9,
      title: 'RR vs FCFS 对比',
      description: '对比 RR 和 FCFS 在响应时间上的差异。',
      difficulty: 'medium',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 20, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 1, cpuBurst: 2, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 2, cpuBurst: 3, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['fcfs', 'rr'],
      defaultAlgorithm: 'rr',
      adjustableParams: {
        timeQuantum: { min: 1, max: 10, default: 2 }
      },
      goal: {
        type: 'min_avg_response',
        targetValue: 2,
        comparison: 'less_than',
        description: '选择算法和参数使平均响应时间小于 2'
      },
      hint: 'RR 让每个进程轮流执行，能显著改善短进程的响应时间。'
    },
    {
      id: 10,
      title: 'MLFQ 多级反馈队列',
      description: '学习多级反馈队列调度算法。进程在不同优先级队列间移动。',
      difficulty: 'hard',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 20, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 5, cpuBurst: 8, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 10, cpuBurst: 4, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['mlfq'],
      defaultAlgorithm: 'mlfq',
      adjustableParams: {
        mlfqLevels: { min: 2, max: 5, default: 3 },
        mlfqBoostInterval: { min: 20, max: 100, default: 30 }
      },
      goal: {
        type: 'min_avg_turnaround',
        targetValue: 15,
        comparison: 'less_than',
        description: '配置 MLFQ 使平均周转时间小于 15'
      },
      hint: 'MLFQ 中 I/O 密集型进程停留在高优先级队列，CPU 密集型进程会逐渐降级。'
    },
    {
      id: 11,
      title: 'MLFQ 优先级提升',
      description: '观察优先级提升机制如何防止进程饥饿。',
      difficulty: 'hard',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 50, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 10, cpuBurst: 5, ioBurst: 2, priority: 2, nice: 0, ioMode: 'periodic', ioPeriod: 3 },
        { name: 'P3', arrivalTime: 20, cpuBurst: 8, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['mlfq'],
      defaultAlgorithm: 'mlfq',
      adjustableParams: {
        mlfqBoostInterval: { min: 10, max: 60, default: 25 }
      },
      goal: {
        type: 'min_avg_wait',
        targetValue: 20,
        comparison: 'less_than',
        description: '调整提升间隔使平均等待时间小于 20'
      },
      hint: '优先级提升间隔越小，低优先级队列的进程越有机会被提升到高优先级。'
    },
    {
      id: 12,
      title: 'MLFQ 级数探索',
      description: '尝试不同的队列级数，观察对调度结果的影响。',
      difficulty: 'hard',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 30, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 2, cpuBurst: 12, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 5, cpuBurst: 6, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' },
        { name: 'P4', arrivalTime: 8, cpuBurst: 18, ioBurst: 0, priority: 4, nice: 0, ioMode: 'none' },
        { name: 'P5', arrivalTime: 12, cpuBurst: 4, ioBurst: 0, priority: 5, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['mlfq'],
      defaultAlgorithm: 'mlfq',
      adjustableParams: {
        mlfqLevels: { min: 2, max: 5, default: 3 },
        mlfqBoostInterval: { min: 10, max: 80, default: 30 }
      },
      goal: {
        type: 'min_avg_turnaround',
        targetValue: 30,
        comparison: 'less_than',
        description: '配置 MLFQ 使平均周转时间小于 30'
      },
      hint: '队列级数越多，调度越精细，但系统开销也越大。'
    },
    {
      id: 13,
      title: 'CFS 完全公平调度',
      description: '学习 Linux 的完全公平调度器。每个进程按权重分配 CPU 时间。',
      difficulty: 'hard',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 20, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 0, cpuBurst: 20, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 0, cpuBurst: 20, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['cfs'],
      defaultAlgorithm: 'cfs',
      adjustableParams: {
        cfsMinGranularity: { min: 1, max: 10, default: 4 },
        cfsLatency: { min: 10, max: 60, default: 24 }
      },
      goal: {
        type: 'custom',
        targetValue: 0,
        comparison: 'equal',
        description: '观察 CFS 如何公平分配 CPU 时间'
      },
      hint: 'CFS 使用虚拟运行时间 vruntime，总是选择 vruntime 最小的进程执行。'
    },
    {
      id: 14,
      title: 'CFS nice 值影响',
      description: '不同 nice 值的进程获得不同的 CPU 时间比例。nice 越小优先级越高。',
      difficulty: 'hard',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 50, ioBurst: 0, priority: 1, nice: -2, ioMode: 'none' },
        { name: 'P2', arrivalTime: 0, cpuBurst: 50, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 0, cpuBurst: 50, ioBurst: 0, priority: 3, nice: 2, ioMode: 'none' }
      ],
      availableAlgorithms: ['cfs'],
      defaultAlgorithm: 'cfs',
      adjustableParams: {
        cfsMinGranularity: { min: 1, max: 10, default: 2 },
        cfsLatency: { min: 10, max: 40, default: 20 }
      },
      goal: {
        type: 'custom',
        targetValue: 0,
        comparison: 'equal',
        description: '观察不同 nice 值的 CPU 时间分配比例'
      },
      hint: 'nice 值每增加 1，权重乘以 0.8。nice -2 的进程获得的 CPU 时间是 nice 0 的约 1.56 倍。'
    },
    {
      id: 15,
      title: '综合对比挑战',
      description: '使用所有学过的算法，找到使平均等待时间最小的方案。',
      difficulty: 'hard',
      processes: [
        { name: 'P1', arrivalTime: 0, cpuBurst: 15, ioBurst: 0, priority: 1, nice: 0, ioMode: 'none' },
        { name: 'P2', arrivalTime: 2, cpuBurst: 8, ioBurst: 0, priority: 2, nice: 0, ioMode: 'none' },
        { name: 'P3', arrivalTime: 4, cpuBurst: 12, ioBurst: 0, priority: 3, nice: 0, ioMode: 'none' },
        { name: 'P4', arrivalTime: 6, cpuBurst: 5, ioBurst: 0, priority: 4, nice: 0, ioMode: 'none' },
        { name: 'P5', arrivalTime: 8, cpuBurst: 10, ioBurst: 0, priority: 5, nice: 0, ioMode: 'none' },
        { name: 'P6', arrivalTime: 10, cpuBurst: 3, ioBurst: 0, priority: 6, nice: 0, ioMode: 'none' }
      ],
      availableAlgorithms: ['fcfs', 'sjf', 'srtf', 'rr', 'priority', 'mlfq', 'cfs'],
      defaultAlgorithm: 'srtf',
      adjustableParams: {
        timeQuantum: { min: 1, max: 20, default: 4 }
      },
      goal: {
        type: 'min_avg_wait',
        targetValue: 8,
        comparison: 'less_than',
        description: '选择最优算法使平均等待时间小于 8'
      },
      hint: '理论上 SRTF 能达到最优的平均等待时间，但需要结合具体参数配置。'
    }
  ];

  getLevels(): Level[] {
    return [...this.levels];
  }

  getLevel(id: number): Level | undefined {
    return this.levels.find(l => l.id === id);
  }

  checkLevelGoal(level: Level, stats: { avgWaitingTime: number; avgTurnaroundTime: number; avgResponseTime: number; cpuUtilization: number }): boolean {
    const goal = level.goal;
    let actualValue: number;

    switch (goal.type) {
      case 'min_avg_wait':
        actualValue = stats.avgWaitingTime;
        break;
      case 'min_avg_turnaround':
        actualValue = stats.avgTurnaroundTime;
        break;
      case 'min_avg_response':
        actualValue = stats.avgResponseTime;
        break;
      case 'max_cpu_util':
        actualValue = stats.cpuUtilization;
        break;
      default:
        return true;
    }

    switch (goal.comparison) {
      case 'less_than':
        return actualValue < goal.targetValue;
      case 'greater_than':
        return actualValue > goal.targetValue;
      case 'equal':
        return Math.abs(actualValue - goal.targetValue) < 0.001;
      default:
        return false;
    }
  }
}
