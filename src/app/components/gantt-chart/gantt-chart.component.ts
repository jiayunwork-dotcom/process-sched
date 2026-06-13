import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Process, GanttBlock, SchedulerResult } from '../../models/process.model';

@Component({
  selector: 'app-gantt-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card gantt-container">
      <div class="card-title">
        <span>📊 甘特图</span>
        <div class="controls">
          <button class="btn btn-secondary btn-sm" (click)="zoomOut()">−</button>
          <span class="zoom-level">{{ timeUnitWidth }}px</span>
          <button class="btn btn-secondary btn-sm" (click)="zoomIn()">+</button>
        </div>
      </div>
      
      <div class="legend">
        <span class="legend-item">
          <span class="legend-color running"></span> 执行中
        </span>
        <span class="legend-item">
          <span class="legend-color ready"></span> 就绪
        </span>
        <span class="legend-item">
          <span class="legend-color waiting"></span> IO等待
        </span>
        <span class="legend-item">
          <span class="legend-color not_arrived"></span> 未到达
        </span>
        <span class="legend-item">
          <span class="legend-color completed"></span> 已完成
        </span>
      </div>
      
      <div class="gantt-wrapper" #ganttWrapper>
        <div class="gantt-scroll">
          <div class="gantt-content" [style.width]="totalWidth + 'px'">
            <div class="time-axis">
              <div class="axis-label">时间</div>
              <div class="axis-ticks">
                <div 
                  *ngFor="let tick of timeTicks" 
                  class="tick"
                  [style.left]="tick.position + 'px'"
                >
                  <div class="tick-line"></div>
                  <div class="tick-label">{{ tick.value }}</div>
                </div>
              </div>
            </div>
            
            <div class="process-rows">
              <div 
                *ngFor="let process of processList" 
                class="process-row"
                [style.height]="rowHeight + 'px'"
              >
                <div class="process-label">
                  <span class="color-dot" [style.background]="process.color"></span>
                  {{ process.name }}
                </div>
                <div class="process-timeline">
                  <div 
                    *ngFor="let block of getBlocksForProcess(process.pid)"
                    class="gantt-block"
                    [class.running]="block.status === 'running'"
                    [class.ready]="block.status === 'ready'"
                    [class.waiting]="block.status === 'waiting'"
                    [class.not_arrived]="block.status === 'not_arrived'"
                    [class.completed]="block.status === 'completed'"
                    [style.left]="block.startTime * timeUnitWidth + 'px'"
                    [style.width]="(block.endTime - block.startTime) * timeUnitWidth + 'px'"
                    [style.background]="block.status === 'running' ? process.color : undefined"
                    (mouseenter)="showTooltip($event, block, process)"
                    (mouseleave)="hideTooltip()"
                  >
                    <span *ngIf="block.endTime - block.startTime >= 3" class="block-label">
                      {{ block.status === 'running' ? process.name : '' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="cpu-row">
              <div class="process-label">CPU</div>
              <div class="cpu-timeline">
                <div 
                  *ngFor="let segment of cpuSegments; let i = index"
                  class="cpu-segment"
                  [class.idle]="segment.pid === null"
                  [style.left]="segment.start * timeUnitWidth + 'px'"
                  [style.width]="(segment.end - segment.start) * timeUnitWidth + 'px'"
                  [style.background]="segment.pid !== null ? getProcessColor(segment.pid) : '#f1f5f9'"
                  [title]="segment.pid !== null ? getProcessName(segment.pid) : 'Idle'"
                >
                </div>
              </div>
            </div>
            
            <div 
              class="time-marker"
              [style.left]="currentTime * timeUnitWidth + 'px'"
              *ngIf="showMarker && currentTime >= 0"
            >
              <div class="marker-line"></div>
              <div class="marker-label">t = {{ currentTime }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div 
        class="tooltip"
        *ngIf="tooltipVisible"
        [style.left]="tooltipX + 'px'"
        [style.top]="tooltipY + 'px'"
      >
        <div class="tooltip-title">
          <span class="color-dot" [style.background]="tooltipProcess?.color"></span>
          {{ tooltipProcess?.name }}
        </div>
        <div class="tooltip-row">状态: {{ getStatusText(tooltipBlock?.status) }}</div>
        <div class="tooltip-row">开始: t = {{ tooltipBlock?.startTime }}</div>
        <div class="tooltip-row">结束: t = {{ tooltipBlock?.endTime }}</div>
        <div class="tooltip-row">持续: {{ tooltipBlock ? tooltipBlock.endTime - tooltipBlock.startTime : 0 }} 时间单位</div>
      </div>
    </div>
  `,
  styles: [`
    .gantt-container {
      overflow: hidden;
    }
    
    .card-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .zoom-level {
      font-size: 12px;
      color: #64748b;
      min-width: 50px;
      text-align: center;
    }
    
    .legend {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #64748b;
    }
    
    .legend-color {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid rgba(0,0,0,0.1);
    }
    
    .legend-color.running { background: #667eea; }
    .legend-color.ready { background: #fef3c7; }
    .legend-color.waiting { background: #cbd5e1; }
    .legend-color.not_arrived { background: #ffffff; border: 1px dashed #cbd5e1; }
    .legend-color.completed { background: #bbf7d0; }
    
    .gantt-wrapper {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow-x: auto;
      overflow-y: hidden;
    }
    
    .gantt-scroll {
      min-width: 100%;
    }
    
    .gantt-content {
      position: relative;
      min-width: 100%;
    }
    
    .time-axis {
      display: flex;
      border-bottom: 2px solid #e2e8f0;
      background: #f8fafc;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    
    .axis-label {
      width: 80px;
      min-width: 80px;
      padding: 8px;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-align: right;
      border-right: 1px solid #e2e8f0;
    }
    
    .axis-ticks {
      flex: 1;
      position: relative;
      height: 36px;
    }
    
    .tick {
      position: absolute;
      top: 0;
      height: 100%;
    }
    
    .tick-line {
      position: absolute;
      left: 0;
      top: 0;
      width: 1px;
      height: 100%;
      background: #e2e8f0;
    }
    
    .tick-label {
      position: absolute;
      top: 4px;
      left: 4px;
      font-size: 10px;
      color: #94a3b8;
      white-space: nowrap;
    }
    
    .process-rows {
      position: relative;
    }
    
    .process-row {
      display: flex;
      border-bottom: 1px solid #f1f5f9;
    }
    
    .process-label {
      width: 80px;
      min-width: 80px;
      padding: 0 8px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      border-right: 1px solid #e2e8f0;
      background: #f8fafc;
      gap: 4px;
    }
    
    .process-timeline {
      flex: 1;
      position: relative;
      height: 100%;
    }
    
    .gantt-block {
      position: absolute;
      top: 4px;
      bottom: 4px;
      border-radius: 2px;
      border: 1px solid rgba(0,0,0,0.1);
      transition: all 0.1s;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .gantt-block:hover {
      filter: brightness(1.1);
      z-index: 5;
    }
    
    .gantt-block.ready {
      background: #fef3c7 !important;
    }
    
    .gantt-block.waiting {
      background: #cbd5e1 !important;
      background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 4px,
        rgba(0,0,0,0.05) 4px,
        rgba(0,0,0,0.05) 8px
      ) !important;
    }
    
    .gantt-block.not_arrived {
      background: #ffffff !important;
      border: 1px dashed #cbd5e1;
    }
    
    .gantt-block.completed {
      background: #bbf7d0 !important;
    }
    
    .block-label {
      font-size: 10px;
      font-weight: 600;
      color: white;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
      white-space: nowrap;
    }
    
    .gantt-block.ready .block-label,
    .gantt-block.waiting .block-label {
      color: #64748b;
      text-shadow: none;
    }
    
    .cpu-row {
      display: flex;
      border-top: 2px solid #e2e8f0;
      background: #f0f9ff;
      height: 28px;
    }
    
    .cpu-timeline {
      flex: 1;
      position: relative;
      height: 100%;
    }
    
    .cpu-segment {
      position: absolute;
      top: 4px;
      bottom: 4px;
      border: 1px solid rgba(0,0,0,0.1);
    }
    
    .cpu-segment.idle {
      background: #f1f5f9 !important;
    }
    
    .time-marker {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      z-index: 20;
      pointer-events: none;
    }
    
    .marker-line {
      position: absolute;
      left: -1px;
      top: 0;
      bottom: 0;
      width: 3px;
      background: #ef4444;
      box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);
    }
    
    .marker-label {
      position: absolute;
      top: 2px;
      left: 8px;
      background: #ef4444;
      color: white;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      white-space: nowrap;
    }
    
    .tooltip {
      position: fixed;
      z-index: 1000;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 12px;
      pointer-events: none;
      min-width: 160px;
    }
    
    .tooltip-title {
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .tooltip-row {
      color: #64748b;
      margin-bottom: 2px;
    }
  `]
})
export class GanttChartComponent implements OnChanges {
  @Input() result: SchedulerResult | null = null;
  @Input() currentTime = -1;
  @Input() showMarker = false;
  @Input() timeUnitWidth = 20;
  @Input() rowHeight = 36;
  
  @ViewChild('ganttWrapper') ganttWrapper!: ElementRef;
  
  processList: Process[] = [];
  totalWidth = 0;
  timeTicks: { value: number; position: number }[] = [];
  cpuSegments: { pid: number | null; start: number; end: number }[] = [];
  
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;
  tooltipBlock: GanttBlock | null = null;
  tooltipProcess: Process | null = null;
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['result'] && this.result) {
      this.processList = Array.from(this.result.processes.values()).sort((a, b) => a.pid - b.pid);
      this.totalWidth = this.result.totalTime * this.timeUnitWidth + 100;
      this.generateTimeTicks();
      this.generateCpuSegments();
    }
  }
  
  generateTimeTicks(): void {
    if (!this.result) return;
    
    const ticks: { value: number; position: number }[] = [];
    const totalTime = this.result.totalTime;
    
    let step = 1;
    if (totalTime > 100) step = 10;
    else if (totalTime > 50) step = 5;
    else if (totalTime > 20) step = 2;
    
    for (let t = 0; t <= totalTime; t += step) {
      ticks.push({
        value: t,
        position: t * this.timeUnitWidth
      });
    }
    
    this.timeTicks = ticks;
  }
  
  generateCpuSegments(): void {
    if (!this.result) {
      this.cpuSegments = [];
      return;
    }
    
    const segments: { pid: number | null; start: number; end: number }[] = [];
    const timeline = this.result.cpuTimeline;
    
    if (timeline.length === 0) return;
    
    let currentPid = timeline[0];
    let start = 0;
    
    for (let i = 1; i <= timeline.length; i++) {
      if (i === timeline.length || timeline[i] !== currentPid) {
        segments.push({
          pid: currentPid ?? null,
          start,
          end: i
        });
        if (i < timeline.length) {
          currentPid = timeline[i];
          start = i;
        }
      }
    }
    
    this.cpuSegments = segments;
  }
  
  getBlocksForProcess(pid: number): GanttBlock[] {
    if (!this.result) return [];
    return this.result.ganttBlocks.get(pid) || [];
  }
  
  getProcessColor(pid: number): string {
    return this.result?.processes.get(pid)?.color || '#ccc';
  }
  
  getProcessName(pid: number): string {
    return this.result?.processes.get(pid)?.name || 'Unknown';
  }
  
  getStatusText(status?: string): string {
    const map: Record<string, string> = {
      'running': '执行中',
      'ready': '就绪',
      'waiting': 'IO等待',
      'not_arrived': '未到达',
      'completed': '已完成'
    };
    return map[status || ''] || status || '';
  }
  
  showTooltip(event: MouseEvent, block: GanttBlock, process: Process): void {
    this.tooltipBlock = block;
    this.tooltipProcess = process;
    this.tooltipVisible = true;
    
    const x = event.clientX + 15;
    const y = event.clientY + 15;
    
    this.tooltipX = x;
    this.tooltipY = y;
  }
  
  hideTooltip(): void {
    this.tooltipVisible = false;
  }
  
  zoomIn(): void {
    this.timeUnitWidth = Math.min(50, this.timeUnitWidth + 4);
    this.updateWidth();
  }
  
  zoomOut(): void {
    this.timeUnitWidth = Math.max(6, this.timeUnitWidth - 4);
    this.updateWidth();
  }
  
  private updateWidth(): void {
    if (this.result) {
      this.totalWidth = this.result.totalTime * this.timeUnitWidth + 100;
      this.generateTimeTicks();
    }
  }
}
