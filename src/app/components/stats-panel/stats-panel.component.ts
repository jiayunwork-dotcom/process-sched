import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Process, SchedulerStats } from '../../models/process.model';

type SortField = 'name' | 'waitingTime' | 'turnaroundTime' | 'responseTime' | 'completionTime';
type SortOrder = 'asc' | 'desc';

@Component({
  selector: 'app-stats-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card">
      <div class="card-title">📈 统计指标</div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.avgWaitingTime.toFixed(2) }}</div>
          <div class="stat-label">平均等待时间</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.avgTurnaroundTime.toFixed(2) }}</div>
          <div class="stat-label">平均周转时间</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.avgResponseTime.toFixed(2) }}</div>
          <div class="stat-label">平均响应时间</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.cpuUtilization.toFixed(1) }}%</div>
          <div class="stat-label">CPU 利用率</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.throughput.toFixed(3) }}</div>
          <div class="stat-label">吞吐量</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.contextSwitches }}</div>
          <div class="stat-label">上下文切换</div>
        </div>
      </div>
      
      <div class="section-title">各进程详情</div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th (click)="sortBy('name')">
                进程
                <span class="sort-icon" *ngIf="sortField === 'name'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th (click)="sortBy('waitingTime')">
                等待时间
                <span class="sort-icon" *ngIf="sortField === 'waitingTime'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th (click)="sortBy('turnaroundTime')">
                周转时间
                <span class="sort-icon" *ngIf="sortField === 'turnaroundTime'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th (click)="sortBy('responseTime')">
                响应时间
                <span class="sort-icon" *ngIf="sortField === 'responseTime'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th (click)="sortBy('completionTime')">
                完成时间
                <span class="sort-icon" *ngIf="sortField === 'completionTime'">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of sortedProcesses">
              <td>
                <span class="color-dot" [style.background]="p.color"></span>
                {{ p.name }}
              </td>
              <td>{{ p.waitingTime }}</td>
              <td>{{ p.turnaroundTime }}</td>
              <td>{{ p.firstResponseTime >= 0 ? p.firstResponseTime - p.arrivalTime : '-' }}</td>
              <td>{{ p.completionTime }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="charts-section" *ngIf="processes.length > 0">
        <div class="section-title">等待时间分布</div>
        <div class="bar-chart">
          <div 
            *ngFor="let p of sortedProcesses"
            class="bar-item"
          >
            <div class="bar-label">{{ p.name }}</div>
            <div class="bar-track">
              <div 
                class="bar-fill waiting"
                [style.width]="(p.waitingTime / maxWaitingTime * 100) + '%'"
                [style.background]="p.color"
              ></div>
            </div>
            <div class="bar-value">{{ p.waitingTime }}</div>
          </div>
        </div>
        
        <div class="section-title">周转时间对比</div>
        <div class="bar-chart">
          <div 
            *ngFor="let p of sortedProcesses"
            class="bar-item"
          >
            <div class="bar-label">{{ p.name }}</div>
            <div class="bar-track">
              <div 
                class="bar-fill turnaround"
                [style.width]="(p.turnaroundTime / maxTurnaroundTime * 100) + '%'"
                [style.background]="p.color"
              ></div>
            </div>
            <div class="bar-value">{{ p.turnaroundTime }}</div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .stat-card {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #0284c7;
      margin-bottom: 4px;
    }
    
    .stat-label {
      font-size: 12px;
      color: #64748b;
    }
    
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
      margin: 16px 0 10px 0;
    }
    
    .table-container {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th {
      cursor: pointer;
      user-select: none;
      background: #f8fafc;
      position: sticky;
      top: 0;
    }
    
    th:hover {
      background: #eef2ff;
    }
    
    .sort-icon {
      font-size: 10px;
      color: #667eea;
    }
    
    .charts-section {
      margin-top: 20px;
    }
    
    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 16px;
    }
    
    .bar-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .bar-label {
      width: 50px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-align: right;
    }
    
    .bar-track {
      flex: 1;
      height: 20px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .bar-fill.waiting {
      opacity: 0.8;
    }
    
    .bar-fill.turnaround {
      opacity: 0.6;
    }
    
    .bar-value {
      width: 50px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-align: left;
    }
  `]
})
export class StatsPanelComponent implements OnChanges {
  @Input() processes: Process[] = [];
  @Input() stats: SchedulerStats = {
    avgWaitingTime: 0,
    avgTurnaroundTime: 0,
    avgResponseTime: 0,
    cpuUtilization: 0,
    throughput: 0,
    totalTime: 0,
    totalBusyTime: 0,
    contextSwitches: 0
  };
  
  sortField: SortField = 'name';
  sortOrder: SortOrder = 'asc';
  
  sortedProcesses: Process[] = [];
  maxWaitingTime = 0;
  maxTurnaroundTime = 0;
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processes']) {
      this.sortProcesses();
      this.calculateMaxValues();
    }
  }
  
  sortBy(field: SortField): void {
    if (this.sortField === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortOrder = 'asc';
    }
    this.sortProcesses();
  }
  
  sortProcesses(): void {
    this.sortedProcesses = [...this.processes].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;
      
      switch (this.sortField) {
        case 'name':
          valA = a.name;
          valB = b.name;
          break;
        case 'waitingTime':
          valA = a.waitingTime;
          valB = b.waitingTime;
          break;
        case 'turnaroundTime':
          valA = a.turnaroundTime;
          valB = b.turnaroundTime;
          break;
        case 'responseTime':
          valA = a.firstResponseTime >= 0 ? a.firstResponseTime - a.arrivalTime : 99999;
          valB = b.firstResponseTime >= 0 ? b.firstResponseTime - b.arrivalTime : 99999;
          break;
        case 'completionTime':
          valA = a.completionTime;
          valB = b.completionTime;
          break;
      }
      
      if (typeof valA === 'string') {
        return this.sortOrder === 'asc' ? valA.localeCompare(valB as string) : (valB as string).localeCompare(valA);
      }
      
      return this.sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }
  
  calculateMaxValues(): void {
    this.maxWaitingTime = Math.max(...this.processes.map(p => p.waitingTime), 1);
    this.maxTurnaroundTime = Math.max(...this.processes.map(p => p.turnaroundTime), 1);
  }
}
