import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Process, VruntimePoint } from '../../models/process.model';

interface VruntimeSeries {
  pid: number;
  name: string;
  color: string;
  points: VruntimePoint[];
}

@Component({
  selector: 'app-vruntime-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card vruntime-card" *ngIf="series.length > 0">
      <div class="card-title">
        <span>📉 CFS vruntime 变化曲线</span>
      </div>
      <p class="hint">X轴: 实际时间 | Y轴: 虚拟运行时间 vruntime</p>
      
      <div class="chart-container">
        <svg [attr.viewBox]="viewBox" class="vruntime-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="gridGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#ffffff;stop-opacity:1" />
            </linearGradient>
          </defs>
          
          <rect [attr.x]="paddingLeft" [attr.y]="paddingTop" 
                [attr.width]="chartWidth" [attr.height]="chartHeight"
                fill="url(#gridGrad)" stroke="#e2e8f0" stroke-width="1" rx="4"/>
          
          <g *ngFor="let y of yTicks">
            <line [attr.x1]="paddingLeft" [attr.y1]="y.y"
                  [attr.x2]="paddingLeft + chartWidth" [attr.y2]="y.y"
                  stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3"/>
            <text [attr.x]="paddingLeft - 8" [attr.y]="y.y + 4"
                  text-anchor="end" font-size="10" fill="#64748b">
              {{ y.label }}
            </text>
          </g>
          
          <g *ngFor="let x of xTicks">
            <line [attr.x1]="x.x" [attr.y1]="paddingTop"
                  [attr.x2]="x.x" [attr.y2]="paddingTop + chartHeight"
                  stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3"/>
            <text [attr.x]="x.x" [attr.y]="paddingTop + chartHeight + 16"
                  text-anchor="middle" font-size="10" fill="#64748b">
              {{ x.label }}
            </text>
          </g>
          
          <g *ngFor="let s of series">
            <polyline
              [attr.points]="getPathPoints(s)"
              fill="none"
              [attr.stroke]="s.color"
              stroke-width="2"
              stroke-linejoin="round"
              stroke-linecap="round"
            />
            <circle
              *ngFor="let p of getSamplePoints(s)"
              [attr.cx]="getX(p.time)"
              [attr.cy]="getY(p.vruntime)"
              r="2.5"
              [attr.fill]="s.color"
            />
          </g>
          
          <line [attr.x1]="paddingLeft" [attr.y1]="currentMarkerX"
                [attr.x2]="paddingLeft + chartWidth" [attr.y2]="currentMarkerX"
                *ngIf="currentTime >= 0 && currentTime <= maxTime"
                stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,2" opacity="0.7"/>
          <text *ngIf="currentTime >= 0 && currentTime <= maxTime"
                [attr.x]="paddingLeft + chartWidth - 4" [attr.y]="currentMarkerX - 4"
                text-anchor="end" font-size="10" fill="#ef4444" font-weight="600">
            t={{ currentTime }}
          </text>
        </svg>
      </div>
      
      <div class="legend">
        <div *ngFor="let s of series" class="legend-item">
          <span class="legend-color" [style.background]="s.color"></span>
          <span class="legend-name">{{ s.name }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vruntime-card {
      background: linear-gradient(135deg, #fdf4ff 0%, #faf5ff 100%);
    }
    
    .hint {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 12px;
    }
    
    .chart-container {
      width: 100%;
      background: white;
      border-radius: 8px;
      padding: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .vruntime-svg {
      width: 100%;
      height: 280px;
      display: block;
    }
    
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 12px;
      padding: 10px;
      background: white;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
    }
    
    .legend-color {
      width: 14px;
      height: 3px;
      border-radius: 2px;
    }
    
    .legend-name {
      color: #334155;
      font-weight: 500;
    }
  `]
})
export class VruntimeChartComponent implements OnChanges {
  @Input() vruntimeHistory: Map<number, VruntimePoint[]> | null | undefined = null;
  @Input() processes: Process[] = [];
  @Input() currentTime = 0;
  
  series: VruntimeSeries[] = [];
  
  paddingLeft = 50;
  paddingRight = 20;
  paddingTop = 20;
  paddingBottom = 40;
  svgWidth = 600;
  svgHeight = 340;
  
  maxTime = 0;
  maxVruntime = 0;
  
  yTicks: { y: number; label: string }[] = [];
  xTicks: { x: number; label: string }[] = [];
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vruntimeHistory'] || changes['processes']) {
      this.buildSeries();
    }
  }
  
  get chartWidth(): number {
    return this.svgWidth - this.paddingLeft - this.paddingRight;
  }
  
  get chartHeight(): number {
    return this.svgHeight - this.paddingTop - this.paddingBottom;
  }
  
  get viewBox(): string {
    return `0 0 ${this.svgWidth} ${this.svgHeight}`;
  }
  
  get currentMarkerX(): number {
    return this.paddingTop + (1 - (this.maxVruntime > 0 ? 0 : 0));
  }
  
  private buildSeries(): void {
    if (!this.vruntimeHistory) {
      this.series = [];
      return;
    }
    
    this.series = [];
    let maxT = 0;
    let maxV = 0;
    
    const procMap = new Map<number, Process>();
    this.processes.forEach(p => procMap.set(p.pid, p));
    
    this.vruntimeHistory.forEach((points, pid) => {
      if (points.length > 0) {
        const proc = procMap.get(pid);
        this.series.push({
          pid,
          name: proc?.name || `P${pid}`,
          color: proc?.color || this.getDefaultColor(pid),
          points
        });
        
        const lastPoint = points[points.length - 1];
        maxT = Math.max(maxT, lastPoint.time);
        points.forEach(p => {
          maxV = Math.max(maxV, p.vruntime);
        });
      }
    });
    
    this.maxTime = maxT;
    this.maxVruntime = Math.max(maxV, 1);
    
    this.buildTicks();
  }
  
  private getDefaultColor(pid: number): string {
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
    return colors[pid % colors.length];
  }
  
  private buildTicks(): void {
    this.yTicks = [];
    const yStepCount = 5;
    const yStep = this.maxVruntime / yStepCount;
    
    for (let i = 0; i <= yStepCount; i++) {
      const val = yStep * i;
      const y = this.paddingTop + this.chartHeight - (val / this.maxVruntime) * this.chartHeight;
      this.yTicks.push({
        y,
        label: val.toFixed(val >= 100 ? 0 : 1)
      });
    }
    
    this.xTicks = [];
    const xStepCount = this.maxTime > 10 ? 5 : this.maxTime;
    const xStep = this.maxTime / xStepCount;
    
    for (let i = 0; i <= xStepCount; i++) {
      const val = Math.round(xStep * i);
      const x = this.paddingLeft + (val / Math.max(this.maxTime, 1)) * this.chartWidth;
      this.xTicks.push({
        x,
        label: String(val)
      });
    }
  }
  
  getX(time: number): number {
    return this.paddingLeft + (time / Math.max(this.maxTime, 1)) * this.chartWidth;
  }
  
  getY(vruntime: number): number {
    return this.paddingTop + this.chartHeight - (vruntime / this.maxVruntime) * this.chartHeight;
  }
  
  getPathPoints(s: VruntimeSeries): string {
    return s.points.map(p => `${this.getX(p.time)},${this.getY(p.vruntime)}`).join(' ');
  }
  
  getSamplePoints(s: VruntimeSeries): VruntimePoint[] {
    if (s.points.length <= 15) return s.points;
    const step = Math.ceil(s.points.length / 15);
    return s.points.filter((_, i) => i % step === 0 || i === s.points.length - 1);
  }
}
