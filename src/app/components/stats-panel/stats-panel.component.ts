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
        <div class="svg-chart-block">
          <div class="section-title">📊 等待时间分布（柱状图）</div>
          <div class="svg-container">
            <svg [attr.viewBox]="'0 0 ' + waitingChartWidth + ' ' + waitingChartHeight" preserveAspectRatio="xMidYMid meet" class="chart-svg">
              <g>
                <text [attr.x]="waitingChartWidth / 2" [attr.y]="22" text-anchor="middle" class="chart-title">各进程等待时间</text>
                <line [attr.x1]="waitingChartPadding.left" [attr.y1]="waitingChartHeight - waitingChartPadding.bottom" [attr.x2]="waitingChartWidth - waitingChartPadding.right" [attr.y2]="waitingChartHeight - waitingChartPadding.bottom" stroke="#94a3b8" stroke-width="1.5"/>
                <line [attr.x1]="waitingChartPadding.left" [attr.y1]="waitingChartPadding.top + 20" [attr.x2]="waitingChartPadding.left" [attr.y2]="waitingChartHeight - waitingChartPadding.bottom" stroke="#94a3b8" stroke-width="1.5"/>
                <text [attr.x]="waitingChartWidth / 2" [attr.y]="waitingChartHeight - 4" text-anchor="middle" class="axis-label-x">进程名称</text>
                <text [attr.x]="waitingAxisLabelX" [attr.y]="waitingAxisLabelY" text-anchor="middle" class="axis-label-y" [attr.transform]="waitingAxisLabelTransform">等待时间</text>
                <ng-container *ngFor="let tick of waitingYTicks">
                  <line [attr.x1]="waitingChartPadding.left - 4" [attr.y1]="tick.y" [attr.x2]="waitingChartPadding.left" [attr.y2]="tick.y" stroke="#94a3b8" stroke-width="1"/>
                  <text [attr.x]="waitingChartPadding.left - 8" [attr.y]="tick.y + 4" text-anchor="end" class="tick-text">{{ tick.value }}</text>
                  <line [attr.x1]="waitingChartPadding.left" [attr.y1]="tick.y" [attr.x2]="waitingChartWidth - waitingChartPadding.right" [attr.y2]="tick.y" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3,3"/>
                </ng-container>
                <g *ngFor="let bar of waitingBars; let i = index">
                  <rect 
                    [attr.x]="bar.x" 
                    [attr.y]="bar.y" 
                    [attr.width]="bar.width" 
                    [attr.height]="bar.height" 
                    [attr.fill]="bar.color"
                    class="bar-rect"
                    rx="3"
                    (mouseenter)="showBarTooltip($event, bar.label, bar.value + ' 时间单位')"
                    (mousemove)="updateBarTooltip($event)"
                    (mouseleave)="hideBarTooltip()"
                  />
                  <text [attr.x]="bar.x + bar.width / 2" [attr.y]="bar.y - 6" text-anchor="middle" class="bar-value-text">{{ bar.value }}</text>
                  <text [attr.x]="bar.x + bar.width / 2" [attr.y]="waitingChartHeight - waitingChartPadding.bottom + 16" text-anchor="middle" class="x-label-text">{{ bar.label }}</text>
                </g>
              </g>
            </svg>
          </div>
        </div>
        
        <div class="svg-chart-block">
          <div class="section-title">📈 周转时间对比（条形图）</div>
          <div class="svg-container">
            <svg [attr.viewBox]="'0 0 ' + turnaroundChartWidth + ' ' + turnaroundChartHeight" preserveAspectRatio="xMidYMid meet" class="chart-svg">
              <g>
                <text [attr.x]="turnaroundChartWidth / 2" [attr.y]="22" text-anchor="middle" class="chart-title">周转时间对比（降序排列）</text>
                <line [attr.x1]="turnaroundChartPadding.left" [attr.y1]="turnaroundChartPadding.top + 20" [attr.x2]="turnaroundChartWidth - turnaroundChartPadding.right" [attr.y2]="turnaroundChartPadding.top + 20" stroke="#94a3b8" stroke-width="1.5"/>
                <line [attr.x1]="turnaroundChartPadding.left" [attr.y1]="turnaroundChartPadding.top + 20" [attr.x2]="turnaroundChartPadding.left" [attr.y2]="turnaroundChartHeight - turnaroundChartPadding.bottom" stroke="#94a3b8" stroke-width="1.5"/>
                <text [attr.x]="turnaroundChartWidth / 2" [attr.y]="turnaroundChartHeight - 4" text-anchor="middle" class="axis-label-x">周转时间</text>
                <text [attr.x]="turnaroundAxisLabelX" [attr.y]="turnaroundAxisLabelY" text-anchor="middle" class="axis-label-y" [attr.transform]="turnaroundAxisLabelTransform">进程名称</text>
                <ng-container *ngFor="let tick of turnaroundXTicks">
                  <line [attr.x1]="tick.x" [attr.y1]="turnaroundChartPadding.top + 20 + 4" [attr.x2]="tick.x" [attr.y2]="turnaroundChartPadding.top + 20" stroke="#94a3b8" stroke-width="1"/>
                  <text [attr.x]="tick.x" [attr.y]="turnaroundChartHeight - turnaroundChartPadding.bottom + 16" text-anchor="middle" class="tick-text">{{ tick.value }}</text>
                  <line [attr.x1]="tick.x" [attr.y1]="turnaroundChartPadding.top + 20" [attr.x2]="tick.x" [attr.y2]="turnaroundChartHeight - turnaroundChartPadding.bottom" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3,3"/>
                </ng-container>
                <g *ngFor="let bar of turnaroundBars; let i = index">
                  <text [attr.x]="turnaroundChartPadding.left - 8" [attr.y]="bar.y + bar.height / 2 + 4" text-anchor="end" class="y-label-text">{{ bar.label }}</text>
                  <rect 
                    [attr.x]="bar.x" 
                    [attr.y]="bar.y" 
                    [attr.width]="bar.width" 
                    [attr.height]="bar.height" 
                    [attr.fill]="bar.color"
                    class="bar-rect"
                    rx="3"
                    (mouseenter)="showBarTooltip($event, bar.label, bar.value + ' 时间单位')"
                    (mousemove)="updateBarTooltip($event)"
                    (mouseleave)="hideBarTooltip()"
                  />
                  <text [attr.x]="bar.x + bar.width + 6" [attr.y]="bar.y + bar.height / 2 + 4" text-anchor="start" class="bar-value-text">{{ bar.value }}</text>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </div>
      
      <div 
        class="bar-tooltip"
        *ngIf="barTooltipVisible"
        [style.left]="barTooltipX + 'px'"
        [style.top]="barTooltipY + 'px'"
      >
        <div class="bar-tooltip-title">{{ barTooltipLabel }}</div>
        <div class="bar-tooltip-value">{{ barTooltipValue }}</div>
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
    
    .svg-chart-block {
      margin-bottom: 24px;
    }
    
    .svg-chart-block:last-child {
      margin-bottom: 0;
    }
    
    .svg-container {
      width: 100%;
      min-width: 360px;
      background: #fafbfc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px;
      box-sizing: border-box;
    }
    
    .chart-svg {
      width: 100%;
      height: auto;
      display: block;
    }
    
    .chart-title {
      font-size: 13px;
      font-weight: 700;
      fill: #334155;
    }
    
    .axis-label-x,
    .axis-label-y {
      font-size: 11px;
      font-weight: 600;
      fill: #64748b;
    }
    
    .tick-text {
      font-size: 10px;
      fill: #94a3b8;
    }
    
    .x-label-text,
    .y-label-text {
      font-size: 11px;
      font-weight: 600;
      fill: #475569;
    }
    
    .bar-value-text {
      font-size: 10px;
      font-weight: 700;
      fill: #334155;
    }
    
    .bar-rect {
      cursor: pointer;
      transition: filter 0.15s ease;
      filter: drop-shadow(0 1px 2px rgba(0,0,0,0.1));
    }
    
    .bar-rect:hover {
      filter: brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.15));
    }
    
    .bar-tooltip {
      position: fixed;
      z-index: 1000;
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      color: white;
      border-radius: 8px;
      padding: 8px 14px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      font-size: 12px;
      pointer-events: none;
      min-width: 120px;
    }
    
    .bar-tooltip-title {
      font-weight: 700;
      font-size: 13px;
      margin-bottom: 2px;
    }
    
    .bar-tooltip-value {
      color: #e2e8f0;
      font-size: 11px;
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
  
  waitingChartWidth = 520;
  waitingChartHeight = 320;
  waitingChartPadding = { top: 40, right: 30, bottom: 44, left: 60 };
  waitingBars: { x: number; y: number; width: number; height: number; color: string; value: number; label: string }[] = [];
  waitingYTicks: { y: number; value: number }[] = [];
  waitingAxisLabelX = 16;
  waitingAxisLabelY = 160;
  waitingAxisLabelTransform = 'rotate(-90, 16, 160)';
  
  turnaroundChartWidth = 520;
  turnaroundChartHeight = 320;
  turnaroundChartPadding = { top: 40, right: 60, bottom: 44, left: 80 };
  turnaroundBars: { x: number; y: number; width: number; height: number; color: string; value: number; label: string }[] = [];
  turnaroundXTicks: { x: number; value: number }[] = [];
  turnaroundAxisLabelX = 16;
  turnaroundAxisLabelY = 160;
  turnaroundAxisLabelTransform = 'rotate(-90, 16, 160)';
  
  barTooltipVisible = false;
  barTooltipX = 0;
  barTooltipY = 0;
  barTooltipLabel = '';
  barTooltipValue = '';
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['processes']) {
      this.sortProcesses();
      this.calculateMaxValues();
      this.calculateWaitingChart();
      this.calculateTurnaroundChart();
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
  
  calculateWaitingChart(): void {
    if (this.processes.length === 0) {
      this.waitingBars = [];
      this.waitingYTicks = [];
      return;
    }
    
    const innerWidth = this.waitingChartWidth - this.waitingChartPadding.left - this.waitingChartPadding.right;
    const innerHeight = this.waitingChartHeight - this.waitingChartPadding.top - this.waitingChartPadding.bottom - 20;
    const chartTop = this.waitingChartPadding.top + 20;
    const chartBottom = this.waitingChartHeight - this.waitingChartPadding.bottom;
    
    this.waitingAxisLabelX = 18;
    this.waitingAxisLabelY = chartTop + innerHeight / 2;
    this.waitingAxisLabelTransform = `rotate(-90, ${this.waitingAxisLabelX}, ${this.waitingAxisLabelY})`;
    
    const n = this.processes.length;
    const barGap = 12;
    const barWidth = Math.max(18, Math.min(60, (innerWidth - barGap * (n + 1)) / n));
    const totalBarWidth = n * barWidth + (n + 1) * barGap;
    const startX = this.waitingChartPadding.left + (innerWidth - totalBarWidth) / 2 + barGap;
    
    this.waitingBars = [];
    const sortedByPid = [...this.processes].sort((a, b) => a.pid - b.pid);
    for (let i = 0; i < sortedByPid.length; i++) {
      const p = sortedByPid[i];
      const barHeight = Math.max(2, (p.waitingTime / this.maxWaitingTime) * innerHeight);
      this.waitingBars.push({
        x: startX + i * (barWidth + barGap),
        y: chartBottom - barHeight,
        width: barWidth,
        height: barHeight,
        color: p.color,
        value: p.waitingTime,
        label: p.name
      });
    }
    
    this.waitingYTicks = [];
    const tickCount = 5;
    const niceMax = this.niceCeil(this.maxWaitingTime);
    for (let i = 0; i <= tickCount; i++) {
      const val = Math.round((niceMax / tickCount) * i);
      const yRatio = 1 - val / niceMax;
      const y = chartBottom - yRatio * innerHeight;
      if (y >= chartTop - 4 && y <= chartBottom + 4) {
        this.waitingYTicks.push({ y, value: val });
      }
    }
  }
  
  calculateTurnaroundChart(): void {
    if (this.processes.length === 0) {
      this.turnaroundBars = [];
      this.turnaroundXTicks = [];
      return;
    }
    
    const innerWidth = this.turnaroundChartWidth - this.turnaroundChartPadding.left - this.turnaroundChartPadding.right;
    const innerHeight = this.turnaroundChartHeight - this.turnaroundChartPadding.top - this.turnaroundChartPadding.bottom - 20;
    const chartLeft = this.turnaroundChartPadding.left;
    const chartTop = this.turnaroundChartPadding.top + 20;
    const chartRight = chartLeft + innerWidth;
    
    this.turnaroundAxisLabelX = 18;
    this.turnaroundAxisLabelY = chartTop + innerHeight / 2;
    this.turnaroundAxisLabelTransform = `rotate(-90, ${this.turnaroundAxisLabelX}, ${this.turnaroundAxisLabelY})`;
    
    const sorted = [...this.processes].sort((a, b) => b.turnaroundTime - a.turnaroundTime);
    const n = sorted.length;
    const barGap = 8;
    const barHeight = Math.max(16, Math.min(40, (innerHeight - barGap * (n + 1)) / n));
    const totalBarHeight = n * barHeight + (n + 1) * barGap;
    const startY = chartTop + (innerHeight - totalBarHeight) / 2 + barGap;
    
    const niceMax = this.niceCeil(this.maxTurnaroundTime);
    
    this.turnaroundBars = [];
    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const barWidth = Math.max(2, (p.turnaroundTime / niceMax) * innerWidth);
      this.turnaroundBars.push({
        x: chartLeft,
        y: startY + i * (barHeight + barGap),
        width: barWidth,
        height: barHeight,
        color: p.color,
        value: p.turnaroundTime,
        label: p.name
      });
    }
    
    this.turnaroundXTicks = [];
    const tickCount = 5;
    for (let i = 0; i <= tickCount; i++) {
      const val = Math.round((niceMax / tickCount) * i);
      const x = chartLeft + (val / niceMax) * innerWidth;
      if (x >= chartLeft - 4 && x <= chartRight + 4) {
        this.turnaroundXTicks.push({ x, value: val });
      }
    }
  }
  
  private niceCeil(value: number): number {
    if (value <= 0) return 10;
    const pow = Math.pow(10, Math.floor(Math.log10(value)));
    const norm = value / pow;
    let nice: number;
    if (norm <= 1) nice = 1;
    else if (norm <= 2) nice = 2;
    else if (norm <= 5) nice = 5;
    else nice = 10;
    return nice * pow;
  }
  
  showBarTooltip(event: MouseEvent, label: string, value: string): void {
    this.barTooltipLabel = label;
    this.barTooltipValue = value;
    this.barTooltipVisible = true;
    this.updateBarTooltip(event);
  }
  
  updateBarTooltip(event: MouseEvent): void {
    const offsetX = 16;
    const offsetY = 16;
    const tooltipWidth = 160;
    const tooltipHeight = 50;
    
    let x = event.clientX + offsetX;
    let y = event.clientY + offsetY;
    
    if (x + tooltipWidth > window.innerWidth) {
      x = event.clientX - tooltipWidth - offsetX;
    }
    if (y + tooltipHeight > window.innerHeight) {
      y = event.clientY - tooltipHeight - offsetY;
    }
    
    this.barTooltipX = Math.max(8, x);
    this.barTooltipY = Math.max(8, y);
  }
  
  hideBarTooltip(): void {
    this.barTooltipVisible = false;
  }
}
