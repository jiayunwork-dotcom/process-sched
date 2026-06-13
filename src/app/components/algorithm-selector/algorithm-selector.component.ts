import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlgorithmConfig, AlgorithmType } from '../../models/process.model';

interface AlgorithmInfo {
  type: AlgorithmType;
  name: string;
  description: string;
  category: string;
}

@Component({
  selector: 'app-algorithm-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="card">
      <div class="card-title">⚙️ 调度算法选择</div>
      
      <div class="algorithm-grid">
        <button
          *ngFor="let algo of algorithms"
          class="algo-btn"
          [class.active]="config.type === algo.type"
          [class.disabled]="!isAvailable(algo.type)"
          (click)="selectAlgorithm(algo.type)"
          [disabled]="!isAvailable(algo.type)"
        >
          <div class="algo-name">{{ algo.name }}</div>
          <div class="algo-desc">{{ algo.description }}</div>
        </button>
      </div>
      
      <div class="config-section" *ngIf="config.type === 'rr'">
        <h4>时间片轮转参数</h4>
        <div class="form-row">
          <div class="form-group">
            <label>时间片大小</label>
            <input type="range" min="1" max="20" [(ngModel)]="config.timeQuantum" (input)="emitConfig()" />
            <span class="value">{{ config.timeQuantum }}</span>
          </div>
        </div>
      </div>
      
      <div class="config-section" *ngIf="config.type === 'priority'">
        <h4>优先级调度参数</h4>
        <div class="form-row">
          <div class="form-group">
            <label>抢占模式</label>
            <label class="switch">
              <input type="checkbox" [(ngModel)]="config.preemptive" (change)="emitConfig()" />
              <span class="slider"></span>
            </label>
            <span class="switch-label">{{ config.preemptive ? '抢占式' : '非抢占式' }}</span>
          </div>
        </div>
        <p class="hint">注意：优先级数值越小，优先级越高</p>
      </div>
      
      <div class="config-section" *ngIf="config.type === 'mlfq'">
        <h4>多级反馈队列参数</h4>
        <div class="form-row">
          <div class="form-group">
            <label>队列级数</label>
            <input type="range" min="2" max="5" [(ngModel)]="config.mlfqLevels" (input)="updateMlfqTimeSlices(); emitConfig()" />
            <span class="value">{{ config.mlfqLevels }} 级</span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>优先级提升间隔</label>
            <input type="range" min="10" max="100" step="5" [(ngModel)]="config.mlfqBoostInterval" (input)="emitConfig()" />
            <span class="value">{{ config.mlfqBoostInterval }}</span>
          </div>
        </div>
        <div class="time-slices">
          <label>各级时间片：</label>
          <div class="time-slice-row" *ngFor="let slice of config.mlfqTimeSlices; let i = index">
            <span class="level-label">Q{{ i + 1 }}</span>
            <input type="number" [value]="slice" (change)="updateTimeSlice(i, $event)" min="1" max="100" />
          </div>
        </div>
        <p class="hint">进程用完当前级时间片后降级到下一级；主动IO不降级</p>
      </div>
      
      <div class="config-section" *ngIf="config.type === 'cfs'">
        <h4>完全公平调度参数</h4>
        <div class="form-row">
          <div class="form-group">
            <label>最小粒度 (sched_min_granularity)</label>
            <input type="range" min="1" max="20" [(ngModel)]="config.cfsMinGranularity" (input)="emitConfig()" />
            <span class="value">{{ config.cfsMinGranularity }}</span>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>调度延迟 (sched_latency)</label>
            <input type="range" min="10" max="100" step="2" [(ngModel)]="config.cfsLatency" (input)="emitConfig()" />
            <span class="value">{{ config.cfsLatency }}</span>
          </div>
        </div>
        <p class="hint">Nice 0 权重为 1024，每 +1 权重 × 0.8</p>
      </div>
      
      <div class="config-section">
        <h4>通用设置</h4>
        <div class="form-row">
          <div class="form-group">
            <label>上下文切换开销</label>
            <input type="range" min="0" max="5" [(ngModel)]="config.contextSwitchOverhead" (input)="emitConfig()" />
            <span class="value">{{ config.contextSwitchOverhead }} 时间单位</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .algorithm-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .algo-btn {
      padding: 10px;
      border: 2px solid #e2e8f0;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }
    
    .algo-btn:hover:not(.disabled) {
      border-color: #667eea;
      background: #f0f4ff;
    }
    
    .algo-btn.active {
      border-color: #667eea;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .algo-btn.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    
    .algo-name {
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 2px;
    }
    
    .algo-desc {
      font-size: 11px;
      opacity: 0.8;
    }
    
    .config-section {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 12px;
    }
    
    .config-section h4 {
      font-size: 13px;
      color: #475569;
      margin-bottom: 10px;
    }
    
    .form-group {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .form-group label {
      font-size: 12px;
      color: #64748b;
      min-width: 120px;
    }
    
    .form-group input[type="range"] {
      flex: 1;
      min-width: 100px;
    }
    
    .value {
      font-size: 13px;
      font-weight: 600;
      color: #667eea;
      min-width: 40px;
      text-align: right;
    }
    
    .hint {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 8px;
      font-style: italic;
    }
    
    .switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;
    }
    
    .switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e0;
      transition: .3s;
      border-radius: 24px;
    }
    
    .slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
    }
    
    input:checked + .slider {
      background-color: #667eea;
    }
    
    input:checked + .slider:before {
      transform: translateX(20px);
    }
    
    .switch-label {
      font-size: 12px;
      color: #475569;
    }
    
    .time-slices {
      margin-top: 10px;
    }
    
    .time-slices > label {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 6px;
      display: block;
    }
    
    .time-slice-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    
    .level-label {
      font-size: 12px;
      font-weight: 600;
      color: #667eea;
      width: 30px;
    }
    
    .time-slice-row input {
      width: 70px;
      padding: 4px 8px;
      font-size: 12px;
    }
  `]
})
export class AlgorithmSelectorComponent implements OnInit {
  @Input() availableAlgorithms: AlgorithmType[] = ['fcfs', 'sjf', 'srtf', 'rr', 'priority', 'mlfq', 'cfs'];
  @Input() initialConfig?: Partial<AlgorithmConfig>;
  @Output() configChange = new EventEmitter<AlgorithmConfig>();
  
  config: AlgorithmConfig = {
    type: 'fcfs',
    name: '先来先服务',
    timeQuantum: 4,
    preemptive: false,
    mlfqLevels: 3,
    mlfqTimeSlices: [8, 16, 32],
    mlfqBoostInterval: 30,
    mlfqBottomPolicy: 'fcfs',
    cfsMinGranularity: 4,
    cfsLatency: 24,
    contextSwitchOverhead: 1
  };
  
  algorithms: AlgorithmInfo[] = [
    { type: 'fcfs', name: 'FCFS', description: '先来先服务', category: '基础' },
    { type: 'sjf', name: 'SJF', description: '最短作业优先', category: '基础' },
    { type: 'srtf', name: 'SRTF', description: '最短剩余时间', category: '抢占' },
    { type: 'rr', name: 'RR', description: '时间片轮转', category: '分时' },
    { type: 'priority', name: 'Priority', description: '优先级调度', category: '优先级' },
    { type: 'mlfq', name: 'MLFQ', description: '多级反馈队列', category: '高级' },
    { type: 'cfs', name: 'CFS', description: '完全公平调度', category: '高级' }
  ];
  
  ngOnInit(): void {
    if (this.initialConfig) {
      this.config = { ...this.config, ...this.initialConfig };
    }
    this.emitConfig();
  }
  
  isAvailable(type: AlgorithmType): boolean {
    return this.availableAlgorithms.includes(type);
  }
  
  selectAlgorithm(type: AlgorithmType): void {
    if (!this.isAvailable(type)) return;
    
    const algo = this.algorithms.find(a => a.type === type);
    this.config.type = type;
    this.config.name = algo?.name || type;
    this.emitConfig();
  }
  
  updateMlfqTimeSlices(): void {
    const levels = this.config.mlfqLevels ?? 3;
    const slices: number[] = [];
    let slice = 8;
    for (let i = 0; i < levels; i++) {
      slices.push(slice);
      slice *= 2;
    }
    this.config.mlfqTimeSlices = slices;
  }
  
  updateTimeSlice(index: number, event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    if (this.config.mlfqTimeSlices && !isNaN(value) && value > 0) {
      this.config.mlfqTimeSlices[index] = value;
      this.emitConfig();
    }
  }
  
  emitConfig(): void {
    this.configChange.emit({ ...this.config });
  }
}
