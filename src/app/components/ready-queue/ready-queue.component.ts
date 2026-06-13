import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Process, QueueSnapshot, AlgorithmType } from '../../models/process.model';

@Component({
  selector: 'app-ready-queue',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-title">
        <span>📦 就绪队列</span>
        <span class="time-badge">t = {{ currentTime }}</span>
      </div>
      
      <div class="queue-container" *ngIf="algorithmType !== 'mlfq' && algorithmType !== 'cfs'">
        <div class="queue-header">
          <span>就绪队列 ({{ snapshot?.readyQueue?.length || 0 }})</span>
        </div>
        <div class="queue-list">
          <div 
            *ngFor="let pid of snapshot?.readyQueue; let i = index"
            class="queue-item"
            [class.running]="pid === snapshot?.runningPid"
            [class.first]="i === 0"
          >
            <span class="color-dot" [style.background]="getProcessColor(pid)"></span>
            <span class="proc-name">{{ getProcessName(pid) }}</span>
            <span class="proc-info" *ngIf="algorithmType === 'sjf' || algorithmType === 'srtf'">
              剩余 {{ getProcessRemaining(pid) }}
            </span>
            <span class="proc-info" *ngIf="algorithmType === 'priority'">
              优先级 {{ getProcessPriority(pid) }}
            </span>
            <span class="proc-info" *ngIf="algorithmType === 'rr'">
              片内 {{ getProcessSliceRemaining(pid) }}
            </span>
          </div>
          <div class="empty-queue" *ngIf="!snapshot?.readyQueue?.length">
            队列为空
          </div>
        </div>
      </div>
      
      <div class="mlfq-container" *ngIf="algorithmType === 'mlfq'">
        <div 
          *ngFor="let queue of snapshot?.mlfqQueues; let level = index"
          class="mlfq-level"
        >
          <div class="level-header">
            <span class="level-name">Q{{ level + 1 }}</span>
            <span class="level-count">{{ queue.length }} 个进程</span>
            <span class="level-slice">时间片: {{ getTimeSlice(level) }}</span>
          </div>
          <div class="queue-list horizontal">
            <div 
              *ngFor="let pid of queue; let i = index"
              class="queue-item small"
              [class.running]="pid === snapshot?.runningPid"
            >
              <span class="color-dot" [style.background]="getProcessColor(pid)"></span>
              <span class="proc-name">{{ getProcessName(pid) }}</span>
            </div>
            <div class="empty-queue small" *ngIf="queue.length === 0">
              空
            </div>
          </div>
        </div>
      </div>
      
      <div class="cfs-container" *ngIf="algorithmType === 'cfs'">
        <div class="queue-header">
          <span>CFS 红黑树 (按 vruntime 排序)</span>
        </div>
        <div class="cfs-tree">
          <div 
            *ngFor="let pid of snapshot?.cfsTree; let i = index"
            class="cfs-node"
            [class.first]="i === 0"
            [class.running]="pid === snapshot?.runningPid"
          >
            <div class="node-left" *ngIf="i === 0">最左节点 (下一个执行)</div>
            <span class="color-dot" [style.background]="getProcessColor(pid)"></span>
            <span class="proc-name">{{ getProcessName(pid) }}</span>
            <span class="vruntime">vruntime: {{ getVruntime(pid) }}</span>
          </div>
          <div class="empty-queue" *ngIf="!snapshot?.cfsTree?.length">
            树为空
          </div>
        </div>
      </div>
      
      <div class="waiting-section" *ngIf="snapshot?.waitingQueue?.length">
        <div class="queue-header waiting">
          <span>等待队列 ({{ snapshot?.waitingQueue?.length }})</span>
        </div>
        <div class="queue-list">
          <div 
            *ngFor="let pid of snapshot?.waitingQueue"
            class="queue-item waiting"
          >
            <span class="color-dot" [style.background]="getProcessColor(pid)"></span>
            <span class="proc-name">{{ getProcessName(pid) }}</span>
            <span class="proc-info">剩余IO: {{ getProcessIoRemaining(pid) }}</span>
          </div>
        </div>
      </div>
      
      <div class="running-section" *ngIf="runningPid !== null">
        <div class="queue-header running">
          <span>当前执行</span>
        </div>
        <div class="current-running">
          <span class="color-dot large" [style.background]="getProcessColor(runningPid)"></span>
          <span class="proc-name large">{{ getProcessName(runningPid) }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .time-badge {
      font-size: 12px;
      background: #e0e7ff;
      color: #4f46e5;
      padding: 2px 10px;
      border-radius: 12px;
      font-weight: 600;
    }
    
    .queue-header {
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .queue-header.waiting {
      color: #d97706;
      border-bottom-color: #fcd34d;
    }
    
    .queue-header.running {
      color: #059669;
      border-bottom-color: #6ee7b7;
    }
    
    .queue-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .queue-list.horizontal {
      flex-direction: row;
      flex-wrap: wrap;
    }
    
    .queue-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #cbd5e1;
      font-size: 13px;
      transition: all 0.2s;
    }
    
    .queue-item.small {
      padding: 4px 8px;
      font-size: 12px;
    }
    
    .queue-item.first {
      border-left-color: #667eea;
      background: #eef2ff;
    }
    
    .queue-item.running {
      border-left-color: #10b981;
      background: #d1fae5;
      font-weight: 600;
    }
    
    .queue-item.waiting {
      border-left-color: #f59e0b;
      background: #fef3c7;
    }
    
    .proc-name {
      font-weight: 500;
    }
    
    .proc-name.large {
      font-size: 16px;
      font-weight: 600;
    }
    
    .proc-info {
      font-size: 11px;
      color: #64748b;
      margin-left: auto;
    }
    
    .empty-queue {
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      padding: 16px;
      font-style: italic;
    }
    
    .empty-queue.small {
      padding: 8px;
    }
    
    .mlfq-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .mlfq-level {
      background: #f8fafc;
      border-radius: 8px;
      padding: 8px 10px;
    }
    
    .mlfq-level:first-child {
      background: #eff6ff;
    }
    
    .level-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    
    .level-name {
      font-size: 13px;
      font-weight: 700;
      color: #3b82f6;
    }
    
    .level-count {
      font-size: 11px;
      color: #64748b;
    }
    
    .level-slice {
      font-size: 11px;
      color: #94a3b8;
      margin-left: auto;
    }
    
    .cfs-container {
      background: #f0fdf4;
      border-radius: 8px;
      padding: 10px;
    }
    
    .cfs-tree {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .cfs-node {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      background: white;
      border-radius: 6px;
      font-size: 12px;
      position: relative;
    }
    
    .cfs-node.first {
      border: 2px solid #ef4444;
    }
    
    .cfs-node.running {
      background: #d1fae5;
    }
    
    .node-left {
      position: absolute;
      top: -8px;
      right: 8px;
      font-size: 10px;
      color: #ef4444;
      background: #fee2e2;
      padding: 1px 6px;
      border-radius: 8px;
    }
    
    .vruntime {
      margin-left: auto;
      font-family: monospace;
      font-size: 11px;
      color: #059669;
    }
    
    .waiting-section, .running-section {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }
    
    .current-running {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: #d1fae5;
      border-radius: 8px;
    }
    
    .color-dot.large {
      width: 20px;
      height: 20px;
    }
  `]
})
export class ReadyQueueComponent implements OnChanges {
  @Input() snapshot: QueueSnapshot | null = null;
  @Input() processes: Map<number, Process> | null = null;
  @Input() algorithmType: AlgorithmType = 'fcfs';
  @Input() currentTime = 0;
  @Input() mlfqTimeSlices: number[] = [8, 16, 32];
  
  ngOnChanges(changes: SimpleChanges): void {}
  
  get runningPid(): number | null {
    return this.snapshot?.runningPid ?? null;
  }
  
  getProcessColor(pid: number): string {
    return this.processes?.get(pid)?.color || '#ccc';
  }
  
  getProcessName(pid: number): string {
    return this.processes?.get(pid)?.name || `P${pid}`;
  }
  
  getProcessRemaining(pid: number): number {
    return this.processes?.get(pid)?.remainingCpu || 0;
  }
  
  getProcessPriority(pid: number): number {
    return this.processes?.get(pid)?.priority || 0;
  }
  
  getProcessSliceRemaining(pid: number): number {
    return this.processes?.get(pid)?.timeSliceRemaining || 0;
  }
  
  getProcessIoRemaining(pid: number): number {
    return this.processes?.get(pid)?.remainingIo || 0;
  }
  
  getVruntime(pid: number): string {
    const v = this.processes?.get(pid)?.vruntime || 0;
    return v.toFixed(1);
  }
  
  getTimeSlice(level: number): number {
    return this.mlfqTimeSlices[level] || 0;
  }
}
